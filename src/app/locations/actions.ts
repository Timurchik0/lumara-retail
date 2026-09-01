"use server";

import { prisma } from "@/lib/db";
import { transferStock } from "@/lib/stock";
import { revalidatePath } from "next/cache";

export async function transferAction(formData: FormData) {
  const variantId = String(formData.get("variantId"));
  const fromLocationId = String(formData.get("fromLocationId"));
  const toLocationId = String(formData.get("toLocationId"));
  const quantity = Number(formData.get("quantity"));

  if (fromLocationId === toLocationId) {
    throw new Error("Локация назначения должна отличаться от исходной");
  }

  await transferStock({ variantId, fromLocationId, toLocationId, quantity });
  revalidatePath("/locations");
}

export async function variantsWithStockAction() {
  return prisma.variant.findMany({
    where: { stock: { some: { quantity: { gt: 0 } } } },
    include: { product: true, stock: { where: { quantity: { gt: 0 } }, include: { location: true } } },
    orderBy: { product: { name: "asc" } },
  });
}
