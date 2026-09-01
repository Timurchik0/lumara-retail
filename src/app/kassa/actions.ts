"use server";

import { prisma } from "@/lib/db";
import { sellCart } from "@/lib/stock";
import { revalidatePath } from "next/cache";

export async function lookupForKassaAction(barcode: string) {
  const variant = await prisma.variant.findUnique({
    where: { barcode },
    include: {
      product: true,
      stock: { include: { location: true } },
    },
  });
  if (!variant) return null;

  const salesLocation = await prisma.location.findFirst({
    where: { type: "SALES_CONTAINER" },
  });
  const stockHere =
    variant.stock.find((s) => s.locationId === salesLocation?.id)?.quantity ?? 0;

  return {
    variantId: variant.id,
    size: variant.size,
    barcode: variant.barcode,
    name: variant.product.name,
    photoUrl: variant.product.photoUrl,
    retailPrice: variant.product.retailPrice,
    salesLocationId: salesLocation?.id ?? null,
    stockHere,
  };
}

export async function checkoutAction(params: {
  fromLocationId: string;
  items: { variantId: string; quantity: number; unitPrice?: number }[];
}) {
  const sale = await sellCart(params);
  revalidatePath("/kassa");
  revalidatePath("/");
  return { id: sale.id, totalAmount: sale.totalAmount };
}
