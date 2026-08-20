import {
  AccountType,
  CategoryType,
  Frequency,
  GoalType,
  PrismaClient,
} from "@prisma/client";
import { DEFAULT_USER_ID as USER_ID } from "../src/modules/shared/application/current-user";
const db = new PrismaClient();
async function main() {
  await db.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: {
      id: USER_ID,
      name: "Usuário Finora",
      email: "finora@example.local",
    },
  });
  const expense = [
    "Moradia",
    "Alimentação",
    "Mercado",
    "Transporte",
    "Uber",
    "Lazer",
    "Saúde",
    "Família",
    "Assinaturas",
    "Educação",
    "Pets",
    "Impostos",
    "Compras",
    "Outros",
  ];
  const income = ["Salário", "Recebimentos"];
  for (const name of expense)
    await db.category.upsert({
      where: {
        userId_name_type: { userId: USER_ID, name, type: CategoryType.EXPENSE },
      },
      update: {},
      create: { userId: USER_ID, name, type: CategoryType.EXPENSE },
    });
  for (const name of income)
    await db.category.upsert({
      where: {
        userId_name_type: { userId: USER_ID, name, type: CategoryType.INCOME },
      },
      update: {},
      create: { userId: USER_ID, name, type: CategoryType.INCOME },
    });
  const account = await db.account.upsert({
    where: { id: "10000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "10000000-0000-4000-8000-000000000001",
      userId: USER_ID,
      name: "Conta principal",
      institution: "Banco Demo",
      type: AccountType.CHECKING_ACCOUNT,
      initialBalance: "4500",
    },
  });
  await db.account.upsert({
    where: { id: "10000000-0000-4000-8000-000000000002" },
    update: {},
    create: {
      id: "10000000-0000-4000-8000-000000000002",
      userId: USER_ID,
      name: "Reserva de emergência",
      institution: "Banco Demo",
      type: AccountType.RESERVE,
      initialBalance: "8000",
    },
  });
  for (const [i, name] of [
    "Nubank",
    "Inter",
    "PicPay",
    "Itaú",
    "Amazon",
    "Mercado Pago",
  ].entries())
    await db.creditCard.upsert({
      where: {
        id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      },
      update: {},
      create: {
        id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
        userId: USER_ID,
        name,
        institution: name,
        closingDay: 7 + i,
        dueDay: 14 + i,
        creditLimit: "5000",
      },
    });
  for (const [i, name] of [
    "Pessoa Exemplo A",
    "Pessoa Exemplo B",
    "Pessoa Exemplo C",
  ].entries())
    await db.person.upsert({
      where: {
        id: `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      },
      update: {},
      create: {
        id: `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
        userId: USER_ID,
        name,
      },
    });
  const cats = await db.category.findMany({ where: { userId: USER_ID } });
  const cat = (name: string) => cats.find((c) => c.name === name)!.id;
  const rec = [
    ["Aluguel", "1800", "Moradia", 5],
    ["Internet", "120", "Assinaturas", 10],
    ["Celular", "80", "Assinaturas", 12],
    ["Personal", "300", "Saúde", 8],
    ["Ração", "180", "Pets", 15],
    ["ChatGPT", "100", "Assinaturas", 20],
    ["YouTube Premium", "25", "Assinaturas", 21],
    ["Google One", "10", "Assinaturas", 22],
    ["Streaming", "55", "Assinaturas", 23],
    ["Impostos", "200", "Impostos", 25],
  ] as const;
  for (const [description, amount, category, dayOfMonth] of rec) {
    const id = `40000000-0000-4000-8000-${String(dayOfMonth).padStart(12, "0")}`;
    await db.recurringTransaction.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId: USER_ID,
        description,
        amount,
        frequency: Frequency.MONTHLY,
        dayOfMonth,
        categoryId: cat(category),
        accountId: account.id,
        startDate: new Date("2026-01-01"),
      },
    });
  }
  await db.financialGoal.upsert({
    where: { id: "50000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "50000000-0000-4000-8000-000000000001",
      userId: USER_ID,
      name: "Reserva de emergência",
      targetAmount: "30000",
      currentAmount: "8000",
      type: GoalType.EMERGENCY_RESERVE,
    },
  });
}
main().finally(() => db.$disconnect());
