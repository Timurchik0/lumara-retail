"use server";

import { prisma } from "@/lib/db";
import { generateBarcode, receiveStock } from "@/lib/stock";
import { revalidatePath } from "next/cache";

export async function lookupBarcodeAction(barcode: string) {
  const variant = await prisma.variant.findUnique({
    where: { barcode },
    include: { product: true },
  });
  return variant;
}

export async function receiveExistingAction(formData: FormData) {
  const variantId = String(formData.get("variantId"));
  const toLocationId = String(formData.get("toLocationId"));
  const quantity = Number(formData.get("quantity"));
  const unitPrice = formData.get("unitPrice")
    ? Number(formData.get("unitPrice"))
    : undefined;

  await receiveStock({ variantId, toLocationId, quantity, unitPrice });
  revalidatePath("/receive");
  return { ok: true };
}

/** Новый товар без карточки — присваиваем штрихкод (свой или производителя) прямо на приёмке. */
export async function receiveNewVariantAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const size = String(formData.get("size") ?? "").trim();
  const hasManufacturerBarcode = formData.get("hasBarcode") === "yes";
  const scannedBarcode = String(formData.get("scannedBarcode") ?? "").trim();
  const toLocationId = String(formData.get("toLocationId"));
  const quantity = Number(formData.get("quantity"));

  if (!size) throw new Error("Укажи размер");

  const barcode = hasManufacturerBarcode && scannedBarcode
    ? scannedBarcode
    : await generateBarcode();

  const variant = await prisma.variant.create({
    data: { productId, size, barcode },
  });

  await receiveStock({ variantId: variant.id, toLocationId, quantity });
  revalidatePath("/receive");
  return { variant, generated: !hasManufacturerBarcode };
}

export async function listProductsAction() {
  return prisma.product.findMany({
    where: { status: { in: ["APPROVED", "IN_REVIEW"] } },
    orderBy: { name: "asc" },
  });
}

export async function listLocationsAction() {
  return prisma.location.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
}
