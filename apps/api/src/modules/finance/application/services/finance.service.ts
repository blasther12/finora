import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BillStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { CardBillingCycleService } from "../../../credit-cards/domain/services/card-billing-cycle.service";
import { DEFAULT_USER_ID } from "../../../shared/application/current-user";
import { Money } from "../../../shared/domain/value-objects/money";
import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";

@Injectable()
export class FinanceService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(CardBillingCycleService)
    private readonly billingCycles: CardBillingCycleService,
  ) {}

  async createTransaction(input: any) {
    const amount = Money.from(input.amount);
    if (!input.accountId && !input.creditCardId)
      throw new BadRequestException("Account or card is required");
    if (input.accountId && input.creditCardId)
      throw new BadRequestException("Choose account or card");

    return this.database.$transaction(async (transaction) => {
      let cardBillId: string | undefined;
      if (input.creditCardId) {
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

  async transfer(input: any) {
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

  async payBill(cardId: string, billId: string, input: any) {
    return this.database.$transaction(async (transaction) => {
      const bill = await transaction.cardBill.findFirst({
        where: {
          id: billId,
          creditCardId: cardId,
          creditCard: { userId: DEFAULT_USER_ID },
        },
        include: {
          transactions: {
            where: {
              deletedAt: null,
              status: { not: TransactionStatus.CANCELLED },
            },
          },
        },
      });
      if (!bill) throw new NotFoundException("Bill not found");
      if (bill.status === BillStatus.PAID)
        throw new BadRequestException("Bill already paid");
      const amount = bill.transactions.reduce(
        (sum, item) => sum.plus(item.amount),
        new Prisma.Decimal(0),
      );
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
          currentAmount: amount,
        },
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
    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: account.transactions.reduce(
        (sum, item) =>
          item.type === TransactionType.INCOME
            ? sum.plus(item.amount)
            : item.type === TransactionType.EXPENSE
              ? sum.minus(item.amount)
              : sum.plus(item.amount.mul(item.transferDirection ?? 0)),
        account.initialBalance,
      ),
      reserve: account.reserves.reduce(
        (sum, reserve) => sum.plus(reserve.currentAmount),
        new Prisma.Decimal(0),
      ),
    }));
  }
}
