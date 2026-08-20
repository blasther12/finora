import { Inject, Injectable } from "@nestjs/common";
import {
  BillStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { FinanceService } from "../../../finance/application/services/finance.service";
import { DEFAULT_USER_ID } from "../../../shared/application/current-user";
import { monthRangeUtc } from "../../../shared/domain/date/utc-date";
import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(FinanceService) private readonly finance: FinanceService,
  ) {}

  async budgets(year: number, month: number) {
    const budgets = await this.database.monthlyBudget.findMany({
      where: { userId: DEFAULT_USER_ID, year, month },
      include: { category: true },
    });
    const spentByCategory = await this.database.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: DEFAULT_USER_ID,
        type: TransactionType.EXPENSE,
        transactionDate: monthRangeUtc(year, month),
        status: { not: TransactionStatus.CANCELLED },
        deletedAt: null,
        excludesFromBudget: false,
      },
      _sum: { amount: true },
    });
    return budgets.map((budget) => {
      const spent =
        spentByCategory.find((item) => item.categoryId === budget.categoryId)
          ?._sum.amount ?? new Prisma.Decimal(0);
      return {
        category: budget.category.name,
        categoryId: budget.categoryId,
        limit: budget.limitAmount,
        spent,
        remaining: budget.limitAmount.minus(spent),
        usagePercentage: budget.limitAmount.isZero()
          ? 0
          : spent.div(budget.limitAmount).mul(100).toDecimalPlaces(2),
      };
    });
  }

  async projection(year: number, month: number) {
    const rows = await this.database.transaction.findMany({
      where: {
        userId: DEFAULT_USER_ID,
        transactionDate: monthRangeUtc(year, month),
        deletedAt: null,
        status: { not: TransactionStatus.CANCELLED },
        type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
      },
    });
    const sum = (type: TransactionType, status: TransactionStatus) =>
      rows
        .filter((row) => row.type === type && row.status === status)
        .reduce((total, row) => total.plus(row.amount), new Prisma.Decimal(0));
    const income = {
      confirmed: sum(TransactionType.INCOME, TransactionStatus.CONFIRMED).plus(
        sum(TransactionType.INCOME, TransactionStatus.PAID),
      ),
      projected: sum(TransactionType.INCOME, TransactionStatus.PROJECTED),
    };
    const expenses = {
      confirmed: sum(TransactionType.EXPENSE, TransactionStatus.CONFIRMED).plus(
        sum(TransactionType.EXPENSE, TransactionStatus.PAID),
      ),
      projected: sum(TransactionType.EXPENSE, TransactionStatus.PROJECTED),
    };
    return {
      period: `${year}-${String(month).padStart(2, "0")}`,
      income: { ...income, total: income.confirmed.plus(income.projected) },
      expenses: {
        ...expenses,
        total: expenses.confirmed.plus(expenses.projected),
      },
      projectedBalance: income.confirmed
        .plus(income.projected)
        .minus(expenses.confirmed)
        .minus(expenses.projected),
    };
  }

  async dashboard(year: number, month: number) {
    const [balances, budgets, projection, bills, people] = await Promise.all([
      this.finance.balances(),
      this.budgets(year, month),
      this.projection(year, month),
      this.database.cardBill.findMany({
        where: {
          creditCard: { userId: DEFAULT_USER_ID },
          status: {
            in: [BillStatus.OPEN, BillStatus.CLOSED, BillStatus.OVERDUE],
          },
        },
        include: { creditCard: true },
        orderBy: { dueDate: "asc" },
        take: 6,
      }),
      this.database.personEntry.findMany({
        where: { person: { userId: DEFAULT_USER_ID }, status: "PENDING" },
      }),
    ]);
    const operationalBalance = balances
      .filter((account) => account.type !== "RESERVE")
      .reduce(
        (sum, account) => sum.plus(account.balance),
        new Prisma.Decimal(0),
      );
    const reserveBalance = balances
      .filter((account) => account.type === "RESERVE")
      .reduce(
        (sum, account) => sum.plus(account.balance),
        new Prisma.Decimal(0),
      );
    return {
      operationalBalance,
      reserveBalance,
      budgets,
      projection,
      bills,
      receivables: people
        .filter((entry) => entry.direction === "RECEIVABLE")
        .reduce((sum, entry) => sum.plus(entry.amount), new Prisma.Decimal(0)),
      payables: people
        .filter((entry) => entry.direction === "PAYABLE")
        .reduce((sum, entry) => sum.plus(entry.amount), new Prisma.Decimal(0)),
    };
  }
}
