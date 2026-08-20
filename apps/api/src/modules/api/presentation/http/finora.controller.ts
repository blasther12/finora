import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { GoalStatus, GoalType } from "@prisma/client";
import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { AnalyticsService } from "../../../analytics/application/services/analytics.service";
import { FinanceService } from "../../../finance/application/services/finance.service";
import { DEFAULT_USER_ID as USER_ID } from "../../../shared/application/current-user";
import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { respond as wrap } from "../../../shared/presentation/http/api-response";

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
  @Get("api/v1/dashboard") dashboard(
    @Query("year") y?: string,
    @Query("month") m?: string,
  ) {
    const d = new Date();
    return wrap(
      this.analytics.dashboard(
        Number(y) || d.getFullYear(),
        Number(m) || d.getMonth() + 1,
      ),
    );
  }
  @Get("api/v1/financial-context") async context() {
    const d = new Date();
    return wrap(this.analytics.dashboard(d.getFullYear(), d.getMonth() + 1));
  }
  @Get("api/v1/accounts") accounts() {
    return wrap(this.finance.balances());
  }
  @Post("api/v1/accounts") account(@Body() b: any) {
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
  @Get("api/v1/credit-cards") cards() {
    return wrap(
      this.database.creditCard.findMany({
        where: { userId: USER_ID, active: true },
        include: {
          bills: {
            orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }],
            take: 3,
          },
        },
      }),
    );
  }
  @Post("api/v1/credit-cards") card(@Body() b: any) {
    return wrap(
      this.database.creditCard.create({
        data: {
          userId: USER_ID,
          name: b.name,
          institution: b.institution,
          closingDay: Number(b.closingDay),
          dueDay: Number(b.dueDay),
          creditLimit: new Prisma.Decimal(b.creditLimit),
        },
      }),
    );
  }
  @Post("api/v1/credit-cards/:cardId/bills/:billId/pay") pay(
    @Param("cardId") c: string,
    @Param("billId") b: string,
    @Body() dto: any,
  ) {
    return wrap(this.finance.payBill(c, b, dto));
  }
  @Get("api/v1/transactions") async transactions(@Query() q: any) {
    const page = Math.max(Number(q.page) || 1, 1),
      limit = Math.min(Number(q.limit) || 20, 100);
    const where: any = { userId: USER_ID, deletedAt: null };
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
  @Post("api/v1/transactions") transaction(@Body() b: any) {
    return wrap(this.finance.createTransaction(b));
  }
  @Post("api/v1/transfers") transfer(@Body() b: any) {
    return wrap(this.finance.transfer(b));
  }
  @Get("api/v1/budgets/:year/:month") budgets(
    @Param("year", ParseIntPipe) y: number,
    @Param("month", ParseIntPipe) m: number,
  ) {
    return wrap(this.analytics.budgets(y, m));
  }
  @Post("api/v1/budgets") budget(@Body() b: any) {
    return wrap(
      this.database.monthlyBudget.upsert({
        where: {
          userId_year_month_categoryId: {
            userId: USER_ID,
            year: Number(b.year),
            month: Number(b.month),
            categoryId: b.categoryId,
          },
        },
        create: {
          userId: USER_ID,
          year: Number(b.year),
          month: Number(b.month),
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
  @Post("api/v1/projections/simulate") async simulate(@Body() b: any) {
    const original = await this.analytics.projection(
      Number(b.year),
      Number(b.month),
    );
    const delta = (b.changes ?? []).reduce(
      (s: number, c: any) =>
        s +
        (c.type === "ADD_EXPENSE"
          ? -Number(c.amount)
          : c.type === "ADD_INCOME"
            ? Number(c.amount)
            : 0),
      0,
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
        include: { category: true },
      }),
    );
  }
  @Post("api/v1/recurring/generate/:year/:month") async generate(
    @Param("year", ParseIntPipe) y: number,
    @Param("month", ParseIntPipe) m: number,
  ) {
    const items = await this.database.recurringTransaction.findMany({
      where: {
        userId: USER_ID,
        active: true,
        autoGenerate: true,
        startDate: { lt: new Date(Date.UTC(y, m, 1)) },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date(Date.UTC(y, m - 1, 1)) } },
        ],
      },
    });
    const created = [];
    for (const r of items) {
      const day = Math.min(
        r.dayOfMonth,
        new Date(Date.UTC(y, m, 0)).getUTCDate(),
      );
      const date = new Date(Date.UTC(y, m - 1, day));
      const row = await this.database.transaction.upsert({
        where: {
          recurringTransactionId_transactionDate: {
            recurringTransactionId: r.id,
            transactionDate: date,
          },
        },
        create: {
          userId: USER_ID,
          description: r.description,
          amount: r.amount,
          transactionDate: date,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.PROJECTED,
          categoryId: r.categoryId,
          accountId: r.accountId,
          creditCardId: r.creditCardId,
          recurringTransactionId: r.id,
        },
        update: {},
      });
      created.push(row);
    }
    return wrap(created);
  }
  @Get("api/v1/installments") installments() {
    return wrap(
      this.database.installmentPlan.findMany({
        where: { userId: USER_ID },
        include: { installments: true },
      }),
    );
  }
  @Post("api/v1/installments") async installment(@Body() b: any) {
    const start = new Date(b.startDate);
    return wrap(
      this.database.$transaction(async (tx) =>
        tx.installmentPlan.create({
          data: {
            userId: USER_ID,
            description: b.description,
            totalAmount: b.totalAmount
              ? new Prisma.Decimal(b.totalAmount)
              : undefined,
            installmentAmount: new Prisma.Decimal(b.installmentAmount),
            totalInstallments: Number(b.totalInstallments),
            startDate: start,
            categoryId: b.categoryId,
            creditCardId: b.creditCardId,
            accountId: b.accountId,
            installments: {
              create: Array.from(
                { length: Number(b.totalInstallments) },
                (_, i) => ({
                  number: i + 1,
                  amount: new Prisma.Decimal(b.installmentAmount),
                  dueDate: new Date(
                    Date.UTC(
                      start.getUTCFullYear(),
                      start.getUTCMonth() + i,
                      start.getUTCDate(),
                    ),
                  ),
                }),
              ),
            },
          },
          include: { installments: true },
        }),
      ),
    );
  }
  @Get("api/v1/people") people() {
    return wrap(
      this.database.person.findMany({
        where: { userId: USER_ID, active: true },
        include: { entries: true },
      }),
    );
  }
  @Get("api/v1/people/:id/statement") async statement(@Param("id") id: string) {
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
      receivable,
      payable,
      netBalance: receivable.minus(payable),
      entries: e,
    });
  }
  @Post("api/v1/people") person(@Body() b: any) {
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
  @Post("api/v1/goals") goal(@Body() b: any) {
    return wrap(
      this.database.financialGoal.create({
        data: {
          userId: USER_ID,
          name: b.name,
          description: b.description,
          targetAmount: new Prisma.Decimal(b.targetAmount),
          currentAmount: new Prisma.Decimal(b.currentAmount ?? 0),
          targetDate: b.targetDate ? new Date(b.targetDate) : undefined,
          type: b.type as GoalType,
          status: (b.status ?? "ACTIVE") as GoalStatus,
        },
      }),
    );
  }
}
