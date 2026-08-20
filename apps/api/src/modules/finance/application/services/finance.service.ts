import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BillStatus,
  Frequency,
  Prisma,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { CardBillingCycleService } from "../../../credit-cards/domain/services/card-billing-cycle.service";
import { DEFAULT_USER_ID } from "../../../shared/application/current-user";
import { dateAtUtc } from "../../../shared/domain/date/utc-date";
import { Money } from "../../../shared/domain/value-objects/money";
import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { splitInstallmentAmounts } from "../../domain/installment-schedule";

interface TransactionInput {
  description: string;
  amount: string;
  transactionDate: string;
  type: TransactionType;
  status?: TransactionStatus;
  categoryId?: string;
  accountId?: string;
  creditCardId?: string;
  personId?: string;
  notes?: string;
}

interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  transactionDate: string;
  description?: string;
}

interface BillPaymentInput {
  accountId: string;
  paymentDate: string;
}

interface InstallmentPlanInput {
  description: string;
  totalAmount?: string;
  installmentAmount: string;
  totalInstallments: number;
  startDate: string;
  categoryId: string;
  creditCardId?: string;
  accountId?: string;
  personId?: string;
}

@Injectable()
export class FinanceService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(CardBillingCycleService)
    private readonly billingCycles: CardBillingCycleService,
  ) {}

  async createTransaction(input: TransactionInput) {
    const amount = Money.from(input.amount);
    if (!input.accountId && !input.creditCardId)
      throw new BadRequestException("Account or card is required");
    if (input.accountId && input.creditCardId)
      throw new BadRequestException("Choose account or card");

    return this.database.$transaction(async (transaction) => {
      let cardBillId: string | undefined;
      if (input.creditCardId) {
        if (input.type !== TransactionType.EXPENSE)
          throw new BadRequestException(
            "Credit card transactions must be expenses",
          );
        const card = await transaction.creditCard.findFirst({
          where: {
            id: input.creditCardId,
            userId: DEFAULT_USER_ID,
            active: true,
          },
        });
        if (!card) throw new NotFoundException("Credit card not found");
        const cycle = this.billingCycles.resolveBill({
          transactionDate: new Date(input.transactionDate),
          closingDay: card.closingDay,
          dueDay: card.dueDay,
        });
        const bill = await transaction.cardBill.upsert({
          where: {
            creditCardId_referenceYear_referenceMonth: {
              creditCardId: card.id,
              referenceYear: cycle.referenceYear,
              referenceMonth: cycle.referenceMonth,
            },
          },
          create: { creditCardId: card.id, ...cycle },
          update: {},
        });
        cardBillId = bill.id;
      } else if (input.accountId) {
        const account = await transaction.account.findFirst({
          where: { id: input.accountId, userId: DEFAULT_USER_ID, active: true },
        });
        if (!account) throw new NotFoundException("Account not found");
      }

      if (input.categoryId) {
        const expectedType =
          input.type === TransactionType.INCOME ? "INCOME" : "EXPENSE";
        const category = await transaction.category.findFirst({
          where: {
            id: input.categoryId,
            userId: DEFAULT_USER_ID,
            active: true,
            type: expectedType,
          },
        });
        if (!category)
          throw new BadRequestException(
            "Category does not match transaction type",
          );
      }
      if (input.personId) {
        const person = await transaction.person.findFirst({
          where: { id: input.personId, userId: DEFAULT_USER_ID, active: true },
        });
        if (!person) throw new NotFoundException("Person not found");
      }

      const status = input.status ?? TransactionStatus.CONFIRMED;
      const created = await transaction.transaction.create({
        data: {
          userId: DEFAULT_USER_ID,
          description: input.description,
          amount: new Prisma.Decimal(amount.toString()),
          transactionDate: new Date(input.transactionDate),
          type: input.type,
          status,
          categoryId: input.categoryId,
          accountId: input.accountId,
          creditCardId: input.creditCardId,
          cardBillId,
          personId: input.personId,
          notes: input.notes,
        },
      });
      if (cardBillId) {
        await transaction.cardBill.update({
          where: { id: cardBillId },
          data:
            status === TransactionStatus.PROJECTED
              ? { projectedAmount: { increment: created.amount } }
              : { currentAmount: { increment: created.amount } },
        });
      }
      return created;
    });
  }

  async transfer(input: TransferInput) {
    const amount = Money.from(input.amount);
    if (input.fromAccountId === input.toAccountId)
      throw new BadRequestException("Accounts must differ");
    return this.database.$transaction(async (transaction) => {
      const count = await transaction.account.count({
        where: {
          id: { in: [input.fromAccountId, input.toAccountId] },
          userId: DEFAULT_USER_ID,
          active: true,
        },
      });
      if (count !== 2) throw new NotFoundException("Account not found");
      const base = {
        userId: DEFAULT_USER_ID,
        description: input.description ?? "Transferência",
        amount: new Prisma.Decimal(amount.toString()),
        transactionDate: new Date(input.transactionDate),
        type: TransactionType.TRANSFER,
        status: TransactionStatus.CONFIRMED,
        transferGroupId: crypto.randomUUID(),
        excludesFromBudget: true,
      };
      return Promise.all([
        transaction.transaction.create({
          data: {
            ...base,
            accountId: input.fromAccountId,
            transferDirection: -1,
          },
        }),
        transaction.transaction.create({
          data: { ...base, accountId: input.toAccountId, transferDirection: 1 },
        }),
      ]);
    });
  }

  async payBill(cardId: string, billId: string, input: BillPaymentInput) {
    return this.database.$transaction(async (transaction) => {
      const bill = await transaction.cardBill.findFirst({
        where: {
          id: billId,
          creditCardId: cardId,
          creditCard: { userId: DEFAULT_USER_ID },
        },
      });
      if (!bill) throw new NotFoundException("Bill not found");
      if (bill.status === BillStatus.PAID)
        throw new BadRequestException("Bill already paid");
      if (bill.currentAmount.lte(0))
        throw new BadRequestException("Bill has no confirmed amount to pay");
      const account = await transaction.account.findFirst({
        where: {
          id: input.accountId,
          userId: DEFAULT_USER_ID,
          active: true,
          type: { not: "RESERVE" },
        },
      });
      if (!account) throw new NotFoundException("Payment account not found");
      const amount = bill.currentAmount;
      const payment = await transaction.transaction.create({
        data: {
          userId: DEFAULT_USER_ID,
          description: "Pagamento de fatura",
          amount,
          transactionDate: new Date(input.paymentDate),
          type: TransactionType.TRANSFER,
          status: TransactionStatus.PAID,
          accountId: input.accountId,
          transferDirection: -1,
          excludesFromBudget: true,
          metadata: { kind: "CARD_BILL_PAYMENT", billId },
        },
      });
      await transaction.cardBill.update({
        where: { id: bill.id },
        data: {
          status: BillStatus.PAID,
          paidAt: new Date(input.paymentDate),
        },
      });
      await transaction.transaction.updateMany({
        where: {
          cardBillId: bill.id,
          deletedAt: null,
          status: TransactionStatus.CONFIRMED,
        },
        data: { status: TransactionStatus.PAID },
      });
      await transaction.auditLog.create({
        data: {
          userId: DEFAULT_USER_ID,
          entity: "CardBill",
          entityId: bill.id,
          action: "PAID",
          newData: { paymentId: payment.id, amount: amount.toString() },
        },
      });
      return payment;
    });
  }

  async generateRecurring(year: number, month: number) {
    return this.database.$transaction(async (transaction) => {
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const monthEnd = new Date(Date.UTC(year, month, 1));
      const items = await transaction.recurringTransaction.findMany({
        where: {
          userId: DEFAULT_USER_ID,
          active: true,
          autoGenerate: true,
          startDate: { lt: monthEnd },
          OR: [{ endDate: null }, { endDate: { gte: monthStart } }],
        },
        include: { creditCard: true },
      });
      const generated = [];

      for (const recurring of items) {
        const dates: Date[] = [];
        if (recurring.frequency === Frequency.MONTHLY) {
          dates.push(dateAtUtc(year, month, recurring.dayOfMonth));
        } else if (recurring.frequency === Frequency.YEARLY) {
          if (recurring.startDate.getUTCMonth() + 1 === month)
            dates.push(dateAtUtc(year, month, recurring.dayOfMonth));
        } else {
          const weekday = recurring.startDate.getUTCDay();
          for (
            let day = 1;
            day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
            day += 1
          ) {
            const candidate = new Date(Date.UTC(year, month - 1, day));
            if (candidate.getUTCDay() === weekday) dates.push(candidate);
          }
        }

        for (const date of dates.filter(
          (candidate) =>
            candidate >= recurring.startDate &&
            (!recurring.endDate || candidate <= recurring.endDate),
        )) {
          const existing = await transaction.transaction.findUnique({
            where: {
              recurringTransactionId_transactionDate: {
                recurringTransactionId: recurring.id,
                transactionDate: date,
              },
            },
          });
          if (existing) {
            generated.push(existing);
            continue;
          }

          let cardBillId: string | undefined;
          if (recurring.creditCard) {
            if (recurring.type !== TransactionType.EXPENSE)
              throw new BadRequestException(
                "Credit card recurrence must be an expense",
              );
            const cycle = this.billingCycles.resolveBill({
              transactionDate: date,
              closingDay: recurring.creditCard.closingDay,
              dueDay: recurring.creditCard.dueDay,
            });
            const bill = await transaction.cardBill.upsert({
              where: {
                creditCardId_referenceYear_referenceMonth: {
                  creditCardId: recurring.creditCard.id,
                  referenceYear: cycle.referenceYear,
                  referenceMonth: cycle.referenceMonth,
                },
              },
              create: { creditCardId: recurring.creditCard.id, ...cycle },
              update: {},
            });
            cardBillId = bill.id;
          }

          const created = await transaction.transaction.create({
            data: {
              userId: DEFAULT_USER_ID,
              description: recurring.description,
              amount: recurring.amount,
              transactionDate: date,
              type: recurring.type,
              status: TransactionStatus.PROJECTED,
              categoryId: recurring.categoryId,
              accountId: recurring.accountId,
              creditCardId: recurring.creditCardId,
              cardBillId,
              recurringTransactionId: recurring.id,
            },
          });
          if (cardBillId)
            await transaction.cardBill.update({
              where: { id: cardBillId },
              data: { projectedAmount: { increment: created.amount } },
            });
          generated.push(created);
        }
      }
      return generated;
    });
  }

  async createInstallmentPlan(input: InstallmentPlanInput) {
    const installmentAmounts = splitInstallmentAmounts(
      input.installmentAmount,
      input.totalAmount,
      input.totalInstallments,
    );
    const baseInstallment = new Prisma.Decimal(installmentAmounts[0]);
    const totalAmount = installmentAmounts.reduce(
      (sum, amount) => sum.plus(amount),
      new Prisma.Decimal(0),
    );
    if (Boolean(input.creditCardId) === Boolean(input.accountId))
      throw new BadRequestException(
        "Choose exactly one account or credit card",
      );

    return this.database.$transaction(async (transaction) => {
      const category = await transaction.category.findFirst({
        where: {
          id: input.categoryId,
          userId: DEFAULT_USER_ID,
          type: "EXPENSE",
          active: true,
        },
      });
      if (!category) throw new NotFoundException("Expense category not found");
      const account = input.accountId
        ? await transaction.account.findFirst({
            where: {
              id: input.accountId,
              userId: DEFAULT_USER_ID,
              active: true,
            },
          })
        : null;
      const card = input.creditCardId
        ? await transaction.creditCard.findFirst({
            where: {
              id: input.creditCardId,
              userId: DEFAULT_USER_ID,
              active: true,
            },
          })
        : null;
      if (input.accountId && !account)
        throw new NotFoundException("Account not found");
      if (input.creditCardId && !card)
        throw new NotFoundException("Credit card not found");
      if (input.personId) {
        const person = await transaction.person.findFirst({
          where: { id: input.personId, userId: DEFAULT_USER_ID, active: true },
        });
        if (!person) throw new NotFoundException("Person not found");
      }

      const start = new Date(input.startDate);
      const dueDates = Array.from(
        { length: input.totalInstallments },
        (_, index) =>
          dateAtUtc(
            start.getUTCFullYear(),
            start.getUTCMonth() + index + 1,
            start.getUTCDate(),
          ),
      );
      const plan = await transaction.installmentPlan.create({
        data: {
          userId: DEFAULT_USER_ID,
          description: input.description,
          totalAmount,
          installmentAmount: baseInstallment,
          totalInstallments: input.totalInstallments,
          startDate: start,
          categoryId: input.categoryId,
          creditCardId: input.creditCardId,
          accountId: input.accountId,
          personId: input.personId,
          installments: {
            create: dueDates.map((dueDate, index) => ({
              number: index + 1,
              amount: installmentAmounts[index],
              dueDate,
            })),
          },
        },
        include: { installments: true },
      });

      for (const installment of plan.installments) {
        let cardBillId: string | undefined;
        if (card) {
          const cycle = this.billingCycles.resolveBill({
            transactionDate: installment.dueDate,
            closingDay: card.closingDay,
            dueDay: card.dueDay,
          });
          const bill = await transaction.cardBill.upsert({
            where: {
              creditCardId_referenceYear_referenceMonth: {
                creditCardId: card.id,
                referenceYear: cycle.referenceYear,
                referenceMonth: cycle.referenceMonth,
              },
            },
            create: { creditCardId: card.id, ...cycle },
            update: {},
          });
          cardBillId = bill.id;
        }
        const ledgerEntry = await transaction.transaction.create({
          data: {
            userId: DEFAULT_USER_ID,
            description: `${input.description} (${installment.number}/${input.totalInstallments})`,
            amount: installment.amount,
            transactionDate: installment.dueDate,
            type: TransactionType.EXPENSE,
            status: TransactionStatus.PROJECTED,
            categoryId: input.categoryId,
            accountId: input.accountId,
            creditCardId: input.creditCardId,
            cardBillId,
            installmentId: installment.id,
            personId: input.personId,
          },
        });
        if (cardBillId)
          await transaction.cardBill.update({
            where: { id: cardBillId },
            data: { projectedAmount: { increment: ledgerEntry.amount } },
          });
      }
      return plan;
    });
  }

  async balances() {
    const accounts = await this.database.account.findMany({
      where: { userId: DEFAULT_USER_ID, active: true },
      include: {
        transactions: {
          where: {
            deletedAt: null,
            status: {
              in: [TransactionStatus.CONFIRMED, TransactionStatus.PAID],
            },
          },
        },
        reserves: { where: { active: true } },
      },
    });
    return accounts.map((account) => {
      const ledgerBalance = account.transactions.reduce(
        (sum, item) =>
          item.type === TransactionType.INCOME
            ? sum.plus(item.amount)
            : item.type === TransactionType.EXPENSE
              ? sum.minus(item.amount)
              : sum.plus(item.amount.mul(item.transferDirection ?? 0)),
        account.initialBalance,
      );
      const reserve = account.reserves.reduce(
        (sum, item) => sum.plus(item.currentAmount),
        new Prisma.Decimal(0),
      );
      return {
        id: account.id,
        name: account.name,
        institution: account.institution,
        type: account.type,
        active: account.active,
        balance:
          account.type === "RESERVE" && account.reserves.length
            ? reserve
            : ledgerBalance,
        reserve,
      };
    });
  }
}
