import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

async function lastBarcodeNumber(): Promise<number> {
  const last = await prisma.variant.findMany({
    where: { barcode: { startsWith: "WH" } },
    select: { barcode: true },
  });
  let max = 0;
  for (const v of last) {
    const n = parseInt((v.barcode ?? "").slice(2), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return max;
}

/** Следующий свободный внутренний штрихкод вида WH0000031, как в Airtable-версии. */
export async function generateBarcode(): Promise<string> {
  const max = await lastBarcodeNumber();
  return "WH" + String(max + 1).padStart(7, "0");
}

/** Пачка штрихкодов подряд за один запрос — чтобы не словить дубли при создании
 * сразу нескольких размеров одной модели (generateBarcode() по одному был бы гонкой). */
export async function generateBarcodeBatch(count: number): Promise<string[]> {
  const max = await lastBarcodeNumber();
  return Array.from({ length: count }, (_, i) =>
    "WH" + String(max + 1 + i).padStart(7, "0"),
  );
}

async function applyStockDelta(
  tx: Prisma.TransactionClient,
  variantId: string,
  locationId: string,
  delta: number,
) {
  await tx.stock.upsert({
    where: { variantId_locationId: { variantId, locationId } },
    update: { quantity: { increment: delta } },
    create: { variantId, locationId, quantity: delta },
  });
}

/** Приход товара (от поставщика, fromLocation нет) в указанную локацию. */
export async function receiveStock(params: {
  variantId: string;
  toLocationId: string;
  quantity: number;
  unitPrice?: number;
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        variantId: params.variantId,
        type: "RECEIVE",
        toLocationId: params.toLocationId,
        quantity: params.quantity,
        unitPrice: params.unitPrice,
        note: params.note,
      },
    });
    await applyStockDelta(tx, params.variantId, params.toLocationId, params.quantity);
    return movement;
  });
}

/** Перемещение между локациями (например Карго → Контейнер). */
export async function transferStock(params: {
  variantId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        variantId: params.variantId,
        type: "TRANSFER",
        fromLocationId: params.fromLocationId,
        toLocationId: params.toLocationId,
        quantity: params.quantity,
        note: params.note,
      },
    });
    await applyStockDelta(tx, params.variantId, params.fromLocationId, -params.quantity);
    await applyStockDelta(tx, params.variantId, params.toLocationId, params.quantity);
    return movement;
  });
}

/** Продажа — списание остатка из локации продажи. */
export async function sellStock(params: {
  variantId: string;
  fromLocationId: string;
  quantity: number;
  unitPrice?: number;
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        variantId: params.variantId,
        type: "SALE",
        fromLocationId: params.fromLocationId,
        quantity: params.quantity,
        unitPrice: params.unitPrice,
        note: params.note,
      },
    });
    await applyStockDelta(tx, params.variantId, params.fromLocationId, -params.quantity);
    return movement;
  });
}

/** Касса — несколько позиций пробиваются одним чеком (Sale), каждая пишет
 * свой SALE-movement со ссылкой на чек, остаток списывается за ту же транзакцию. */
export async function sellCart(params: {
  fromLocationId: string;
  items: { variantId: string; quantity: number; unitPrice?: number }[];
  note?: string;
}) {
  if (params.items.length === 0) {
    throw new Error("Корзина пуста");
  }
  const totalAmount = params.items.reduce(
    (sum, item) => sum + (item.unitPrice ?? 0) * item.quantity,
    0,
  );

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: { totalAmount, note: params.note },
    });

    for (const item of params.items) {
      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          type: "SALE",
          fromLocationId: params.fromLocationId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          saleId: sale.id,
        },
      });
      await applyStockDelta(tx, item.variantId, params.fromLocationId, -item.quantity);
    }

    return sale;
  });
}
