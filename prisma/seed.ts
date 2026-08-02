import { PrismaClient } from "../src/app/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";

function parseSqlServerUrl(url: string) {
  const withoutProtocol = url.replace("sqlserver://", "");
  const [hostPort, ...params] = withoutProtocol.split(";");
  const [server, port] = hostPort.split(":");

  const map: Record<string, string> = {};
  for (const param of params) {
    const [key, value] = param.split("=");
    if (key && value) map[key.toLowerCase()] = value;
  }

  return {
    server,
    port: Number(port) || 1433,
    database: map["database"],
    user: map["user"],
    password: map["password"],
  };
}

const config = parseSqlServerUrl(process.env.DATABASE_URL!);

const adapter = new PrismaMssql({
  ...config,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const arthur = await prisma.user.upsert({
    where: { email: "arthur@gmail.com" },
    update: {},
    create: {
      email: "arthur@gmail.com",
      name: "Arthur",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
  });

  const sophie = await prisma.user.upsert({
    where: { email: "sophie@gmail.com" },
    update: {},
    create: {
      email: "sophie@gmail.com",
      name: "Sophie",
      createdAt: new Date("2026-02-28"),
      updatedAt: new Date("2026-02-28"),
    },
  });

  await prisma.incomes.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      userId: arthur.id,
      label: "Salaire",
      amount: 2050.1,
      date: new Date("2026-06-01"), // ✅ FIX
      isRecurring: true, // (optionnel mais logique pour un salaire)
    },
  });

  for (const expense of [
    {
      id: 1,
      label: "EDF",
      amount: 80,
      date: new Date("2026-06-15"), // ✅ FIX (remplace dayOfMonth)
      category: 1,
      type: 1,
      isRecurring: true,
    },
    {
      id: 2,
      label: "Eau",
      amount: 16,
      date: new Date("2026-06-10"), // ✅ FIX
      category: 1,
      type: 1,
      isRecurring: true,
    },
  ]) {
    await prisma.expenses.upsert({
      where: { id: expense.id },
      update: {},
      create: {
        ...expense,
        userId: arthur.id,
      },
    });
  }

  console.log("Seed terminé :", { arthur, sophie });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
