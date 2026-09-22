"use server";

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { analyzeShoePhoto } from "@/lib/vision";
import { generateBarcodeBatch } from "@/lib/stock";
import { parseSizes } from "@/lib/sizes";

export async function analyzePhotoAction(formData: FormData) {
  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  return analyzeShoePhoto(buffer);
}

async function savePhoto(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const filename = `${randomUUID()}.${ext}`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: file.type || "image/jpeg",
  });
  return blob.url;
}

/** Быстрое занесение — фото закидывается и карточка сохраняется сама, без
 * ручного ввода размеров/цен. Человек потом дозаполняет и одобряет уже на
 * странице товара. Используется и для одиночного, и для массового занесения. */
export async function createProductQuickAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim() || "Без названия";
  const category = String(formData.get("category") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const file = formData.get("photo") as File | null;
  const photoUrl = file && file.size > 0 ? await savePhoto(file) : null;

  const product = await prisma.product.create({
    data: { name, category, description, photoUrl, status: "IN_REVIEW" },
  });
  return { id: product.id, name: product.name, photoUrl: product.photoUrl };
}

/** Размер можно ввести списком ("36, 37, 38") или диапазоном ("36-40") —
 * тогда за один сабмит создаётся сразу несколько вариантов, у каждого свой
 * штрихкод (генерируем пачкой, чтобы не словить дубли). Явный штрихкод из
 * формы применяется только когда вводили ровно один размер — на диапазон
 * один штрихкод не натянешь, каждый размер сканируется отдельно. Размеры,
 * которые у модели уже есть, тихо пропускаем. */
async function addVariantsCore(
  productId: string,
  sizesRaw: FormDataEntryValue | null,
  explicitBarcode: string,
) {
  const sizes = parseSizes(sizesRaw);
  if (sizes.length === 0) throw new Error("Укажи размер");

  const existing = await prisma.variant.findMany({
    where: { productId, size: { in: sizes } },
    select: { size: true },
  });
  const existingSizes = new Set(existing.map((v) => v.size));
  const newSizes = sizes.filter((s) => !existingSizes.has(s));
  if (newSizes.length === 0) return;

  const barcodes =
    newSizes.length === 1 && explicitBarcode
      ? [explicitBarcode]
      : await generateBarcodeBatch(newSizes.length);

  await prisma.variant.createMany({
    data: newSizes.map((size, i) => ({ productId, size, barcode: barcodes[i] })),
  });
}

export async function addVariantAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const barcode = String(formData.get("barcode") ?? "").trim();
  await addVariantsCore(productId, formData.get("size"), barcode);
  redirect(`/products/${productId}`);
}

export async function approveProductAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const status = String(formData.get("status"));
  await prisma.product.update({
    where: { id: productId },
    data: { status: status as "APPROVED" | "REJECTED" | "IN_REVIEW" },
  });
  redirect(`/products/${productId}`);
}

export async function updateProductAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Название обязательно");

  await prisma.product.update({
    where: { id: productId },
    data: {
      name,
      category: String(formData.get("category") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      costPrice: formData.get("costPrice") ? Number(formData.get("costPrice")) : null,
      retailPrice: formData.get("retailPrice") ? Number(formData.get("retailPrice")) : null,
    },
  });
  return getProductDetailAction(productId);
}

/** Та же правка, но для обычной серверной страницы /products/[id] (мобильный
 * фолбэк) — там форма без клиентского стейта, поэтому редирект вместо возврата данных. */
export async function updateProductRedirectAction(formData: FormData) {
  await updateProductAction(formData);
  redirect(`/products/${String(formData.get("productId"))}`);
}

/** Насовсем удаляет карточку. Варианты и остатки каскадно удалятся по схеме
 * (onDelete: Cascade), а вот если по товару уже была продажа — StockMovement
 * ссылается на вариант без каскада, и удаление осознанно упадёт с ошибкой
 * внешнего ключа, чтобы не портить финансовую историю. */
export async function deleteProductInlineAction(productId: string) {
  await prisma.product.delete({ where: { id: productId } });
}

const productDetailInclude = {
  variants: {
    include: { stock: { include: { location: true } } },
    orderBy: { size: "asc" as const },
  },
};

export async function getProductDetailAction(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: productDetailInclude,
  });
}

export async function listProductsForBrowseAction() {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { variants: { include: { stock: true } } },
  });
}

/** Те же действия, что addVariantAction/approveProductAction, но без redirect —
 * для split-view на /products, где справа обновляется панель, а не вся страница. */
export async function addVariantInlineAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const barcode = String(formData.get("barcode") ?? "").trim();
  await addVariantsCore(productId, formData.get("size"), barcode);
  return getProductDetailAction(productId);
}

export async function approveProductInlineAction(
  productId: string,
  status: "APPROVED" | "REJECTED" | "IN_REVIEW",
) {
  await prisma.product.update({ where: { id: productId }, data: { status } });
  return getProductDetailAction(productId);
}
