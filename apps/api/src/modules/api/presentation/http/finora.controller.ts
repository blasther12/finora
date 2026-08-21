import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Prisma, TransactionStatus } from "@prisma/client";
import { AnalyticsService } from "../../../analytics/application/services/analytics.service";
import { FinanceService } from "../../../finance/application/services/finance.service";
import { DEFAULT_USER_ID as USER_ID } from "../../../shared/application/current-user";
import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { currentReferencePeriod } from "../../../shared/domain/date/reference-period";
import { respond as wrap } from "../../../shared/presentation/http/api-response";
import {
  CreateAccountDto,
  CreateBudgetDto,
  CreateCreditCardDto,
  CreateGoalDto,
  CreateInstallmentPlanDto,
  CreatePersonDto,
  CreateTransactionDto,
  CreateTransferDto,
  PayBillDto,
  ReferencePeriodQueryDto,
  SimulateProjectionDto,
  SimulationChangeType,
  TransactionQueryDto,
} from "./finora.dto";

@ApiTags("Finora")
@Controller()
export class FinoraController {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(FinanceService) private readonly finance: FinanceService,
    @Inject(AnalyticsService) private readonly analytics: AnalyticsService,
  ) {}
  @Get("health") async health() {
    await this.database.$queryRaw`SELECT 1`;
    return { data: { api: "ok", postgres: "ok" } };
  }
  @Get("api/v1/dashboard") dashboard(@Query() query: ReferencePeriodQueryDto) {
    const current = currentReferencePeriod();
    return wrap(
      this.analytics.dashboard(
        query.year ?? current.year,
        query.month ?? current.month,
      ),
    );
  }
  @Get("api/v1/reference-period") referencePeriod() {
    return wrap(currentReferencePeriod());
  }
  @Get("api/v1/financial-context") async context() {
    const current = currentReferencePeriod();
    return wrap(this.analytics.dashboard(current.year, current.month));
  }
  @Get("api/v1/accounts") accounts() {
    return wrap(this.finance.balances());
  }
  @Post("api/v1/accounts") account(@Body() b: CreateAccountDto) {
    return wrap(
      this.database.account.create({
        data: {
          userId: USER_ID,
          name: b.name,
          institution: b.institution,
          type: b.type,
          initialBalance: new Prisma.Decimal(b.initialBalance),
        },
      }),
    );
  }
  @Get("api/v1/categories") categories() {
    return wrap(
      this.database.category.findMany({
        where: { userId: USER_ID, active: true },
        orderBy: { name: "asc" },
      }),
    );
  }
  @Get("api/v1/credit-cards") async cards() {
    const cards = await this.database.creditCard.findMany({
      where: { userId: USER_ID, active: true },
      include: {
        bills: {
          orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }],
          take: 3,
        },
      },
    });
    return wrap(
      cards.map((card) => ({
        ...card,
        latestBillAmount: card.bills[0]?.currentAmount ?? new Prisma.Decimal(0),
        latestBillStatus: card.bills[0]?.status ?? "SEM_FATURA",
      })),
    );
  }
  @Post("api/v1/credit-cards") card(@Body() b: CreateCreditCardDto) {
    return wrap(
      this.database.creditCard.create({
        data: {
          userId: USER_ID,
          name: b.name,
          institution: b.institution,
          closingDay: b.closingDay,
          dueDay: b.dueDay,
          creditLimit: new Prisma.Decimal(b.creditLimit),
        },
      }),
    );
  }
  @Get("api/v1/credit-cards/:id") async cardDetails(@Param("id") id: string) {
    const card = await this.database.creditCard.findFirst({
      where: { id, userId: USER_ID, active: true },
      include: {
        bills: {
          orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }],
        },
      },
    });
    if (!card) throw new NotFoundException("Credit card not found");
    return wrap(card);
  }
  @Get("api/v1/credit-cards/:id/bills/:year/:month") async billDetails(
    @Param("id") id: string,
    @Param("year", ParseIntPipe) year: number,
    @Param("month", ParseIntPipe) month: number,
  ) {
    const bill = await this.database.cardBill.findFirst({
      where: {
        creditCardId: id,
        referenceYear: year,
        referenceMonth: month,
        creditCard: { userId: USER_ID },
      },
      include: {
        creditCard: true,
        transactions: {
          where: { deletedAt: null },
          include: { category: true, account: true, creditCard: true },
          orderBy: { transactionDate: "asc" },
        },
      },
    });
    if (!bill) throw new NotFoundException("Bill not found");
    return wrap(bill);
  }
  @Post("api/v1/credit-cards/:cardId/bills/:billId/pay") pay(
    @Param("cardId") c: string,
    @Param("billId") b: string,
    @Body() dto: PayBillDto,
  ) {
    return wrap(this.finance.payBill(c, b, dto));
  }
  @Get("api/v1/transactions") async transactions(
    @Query() q: TransactionQueryDto,
  ) {
    const page = q.page,
      limit = q.limit;
    const where: Prisma.TransactionWhereInput = {
      userId: USER_ID,
      deletedAt: null,
    };
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    if (q.search)
      where.description = { contains: q.search, mode: "insensitive" };
    const [rows, total] = await this.database.$transaction([
      this.database.transaction.findMany({
        where,
        include: {
          category: true,
          account: true,
          creditCard: true,
          person: true,
        },
        orderBy: { transactionDate: q.sort === "asc" ? "asc" : "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.database.transaction.count({ where }),
    ]);
    return wrap(rows, { page, limit, total });
  }
  @Post("api/v1/transactions") transaction(@Body() b: CreateTransactionDto) {
    return wrap(this.finance.createTransaction(b));
  }
  @Post("api/v1/transfers") transfer(@Body() b: CreateTransferDto) {
    return wrap(this.finance.transfer(b));
  }
  @Get("api/v1/budgets/current") async currentBudget() {
    const { year: currentYear, month: currentMonth } = currentReferencePeriod();
    return wrap(this.analytics.budgets(currentYear, currentMonth));
  }
  @Get("api/v1/budgets/:year/:month") budgets(
    @Param("year", ParseIntPipe) y: number,
    @Param("month", ParseIntPipe) m: number,
  ) {
    return wrap(this.analytics.budgets(y, m));
  }
  @Post("api/v1/budgets") async budget(@Body() b: CreateBudgetDto) {
    const category = await this.database.category.findFirst({
      where: {
        id: b.categoryId,
        userId: USER_ID,
        type: "EXPENSE",
        active: true,
      },
    });
    if (!category) throw new NotFoundException("Expense category not found");
    return wrap(
      this.database.monthlyBudget.upsert({
        where: {
          userId_year_month_categoryId: {
            userId: USER_ID,
            year: b.year,
            month: b.month,
            categoryId: b.categoryId,
          },
        },
        create: {
          userId: USER_ID,
          year: b.year,
          month: b.month,
          categoryId: b.categoryId,
          limitAmount: new Prisma.Decimal(b.limitAmount),
        },
        update: { limitAmount: new Prisma.Decimal(b.limitAmount) },
      }),
    );
  }
  @Get("api/v1/projections/:year/:month") projection(
    @Param("year", ParseIntPipe) y: number,
    @Param("month", ParseIntPipe) m: number,
  ) {
    return wrap(this.analytics.projection(y, m));
  }
  @Post("api/v1/projections/simulate") async simulate(
    @Body() b: SimulateProjectionDto,
  ) {
    const original = await this.analytics.projection(b.year, b.month);
    const delta = (b.changes ?? []).reduce(
      (sum, change) =>
        change.type === SimulationChangeType.ADD_EXPENSE
          ? sum.minus(change.amount)
          : sum.plus(change.amount),
      new Prisma.Decimal(0),
    );
    return wrap({
      original,
      simulated: {
        ...original,
        projectedBalance: new Prisma.Decimal(original.projectedBalance).plus(
          delta,
        ),
      },
      difference: delta,
    });
  }
  @Get("api/v1/recurring") recurring() {
    return wrap(
      this.database.recurringTransaction.findMany({
        where: { userId: USER_ID },
        include: { category: true, account: true, creditCard: true },
      }),
    );
  }
  @Post("api/v1/recurring/generate/:year/:month") async generate(
    @Param("year", ParseIntPipe) y: number,
    @Param("month", ParseIntPipe) m: number,
  ) {
    return wrap(this.finance.generateRecurring(y, m));
  }
  @Get("api/v1/installments") async installments() {
    const plans = await this.database.installmentPlan.findMany({
      where: { userId: USER_ID },
      include: {
        installments: { orderBy: { number: "asc" } },
        category: true,
        account: true,
        creditCard: true,
        person: true,
      },
    });
    return wrap(
      plans.map((plan) => ({
        ...plan,
        paidInstallments: plan.installments.filter(
          (item) =>
            item.status === TransactionStatus.PAID ||
            item.status === TransactionStatus.CONFIRMED,
        ).length,
        nextDueDate:
          plan.installments.find(
            (item) => item.status === TransactionStatus.PROJECTED,
          )?.dueDate ?? null,
      })),
    );
  }
  @Post("api/v1/installments") installment(
    @Body() b: CreateInstallmentPlanDto,
  ) {
    return wrap(this.finance.createInstallmentPlan(b));
  }
  @Get("api/v1/people") async people() {
    const people = await this.database.person.findMany({
      where: { userId: USER_ID, active: true },
      include: { entries: true },
    });
    return wrap(
      people.map((person) => {
        const pending = person.entries.filter(
          (entry) => entry.status === "PENDING",
        );
        const receivable = pending
          .filter((entry) => entry.direction === "RECEIVABLE")
          .reduce(
            (sum, entry) => sum.plus(entry.amount),
            new Prisma.Decimal(0),
          );
        const payable = pending
          .filter((entry) => entry.direction === "PAYABLE")
          .reduce(
            (sum, entry) => sum.plus(entry.amount),
            new Prisma.Decimal(0),
          );
        return {
          ...person,
          entryCount: pending.length,
          receivable,
          payable,
          netBalance: receivable.minus(payable),
        };
      }),
    );
  }
  @Get("api/v1/people/:id/statement") async statement(@Param("id") id: string) {
    const person = await this.database.person.findFirst({
      where: { id, userId: USER_ID, active: true },
    });
    if (!person) throw new NotFoundException("Person not found");
    const e = await this.database.personEntry.findMany({
      where: { personId: id, person: { userId: USER_ID }, status: "PENDING" },
    });
    const receivable = e
        .filter((x) => x.direction === "RECEIVABLE")
        .reduce((s, x) => s.plus(x.amount), new Prisma.Decimal(0)),
      payable = e
        .filter((x) => x.direction === "PAYABLE")
        .reduce((s, x) => s.plus(x.amount), new Prisma.Decimal(0));
    return wrap({
      person,
      receivable,
      payable,
      netBalance: receivable.minus(payable),
      entries: e,
    });
  }
  @Post("api/v1/people") person(@Body() b: CreatePersonDto) {
    return wrap(
      this.database.person.create({
        data: { userId: USER_ID, name: b.name, notes: b.notes },
      }),
    );
  }
  @Get("api/v1/goals") goals() {
    return wrap(
      this.database.financialGoal.findMany({ where: { userId: USER_ID } }),
    );
  }
  @Post("api/v1/goals") goal(@Body() b: CreateGoalDto) {
    return wrap(
      this.database.financialGoal.create({
        data: {
          userId: USER_ID,
          name: b.name,
          description: b.description,
          targetAmount: new Prisma.Decimal(b.targetAmount),
          currentAmount: new Prisma.Decimal(b.currentAmount ?? 0),
          targetDate: b.targetDate ? new Date(b.targetDate) : undefined,
          type: b.type,
          status: b.status ?? "ACTIVE",
        },
      }),
    );
  }
}
