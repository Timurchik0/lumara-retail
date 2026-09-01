import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const china = await prisma.location.upsert({
    where: { id: "loc-china" },
    update: {},
    create: { id: "loc-china", name: "Склад Китай", type: "CHINA_WAREHOUSE" },
  });

  for (let i = 1; i <= 3; i++) {
    await prisma.location.upsert({
      where: { id: `loc-cargo-${i}` },
      update: {},
      create: { id: `loc-cargo-${i}`, name: `Склад Карго №${i}`, type: "CARGO" },
    });
  }

  for (let i = 1; i <= 14; i++) {
    await prisma.location.upsert({
      where: { id: `loc-container-${i}` },
      update: {},
      create: { id: `loc-container-${i}`, name: `Контейнер №${i}`, type: "CONTAINER" },
    });
  }

  await prisma.location.upsert({
    where: { id: "loc-sales" },
    update: {},
    create: { id: "loc-sales", name: "Контейнер продаж", type: "SALES_CONTAINER" },
  });

  console.log("Локации созданы:", china.name, "+ 3 карго + 14 контейнеров + контейнер продаж");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
