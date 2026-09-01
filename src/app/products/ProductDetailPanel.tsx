"use client";

import { useState, useTransition } from "react";
import {
  addVariantInlineAction,
  approveProductInlineAction,
  getProductDetailAction,
} from "./actions";

type ProductDetail = Awaited<ReturnType<typeof getProductDetailAction>>;

const statusLabel: Record<string, string> = {
  NEW: "Новое",
  IN_REVIEW: "На рассмотрении",
  APPROVED: "Одобрено",
  REJECTED: "Отклонено",
};

export default function ProductDetailPanel({
  product,
  onChange,
}: {
  product: NonNullable<ProductDetail>;
  onChange: (updated: NonNullable<ProductDetail>) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [sizeInput, setSizeInput] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  function approve(status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const updated = await approveProductInlineAction(product.id, status);
      if (updated) onChange(updated);
    });
  }

  function addVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!sizeInput.trim()) return;
    const fd = new FormData();
    fd.set("productId", product.id);
    fd.set("size", sizeInput);
    fd.set("barcode", barcodeInput);
    startTransition(async () => {
      const updated = await addVariantInlineAction(fd);
      if (updated) onChange(updated);
      setSizeInput("");
      setBarcodeInput("");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        {product.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.photoUrl}
            alt={product.name}
            className="h-28 w-28 rounded-xl object-cover bg-neutral-100"
          />
        ) : (
          <div className="h-28 w-28 rounded-xl bg-neutral-100 flex items-center justify-center text-3xl">
            👟
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <p className="text-sm text-neutral-500">{product.category}</p>
          {product.description && (
            <p className="text-sm text-neutral-600 mt-1">{product.description}</p>
          )}
          <p className="text-sm mt-2">
            Закупка: {product.costPrice ?? "—"}$ · Розница: {product.retailPrice ?? "—"}$
          </p>
          <p className="text-xs mt-1 inline-block rounded-full bg-neutral-100 px-2 py-1">
            {statusLabel[product.status]}
          </p>
        </div>
      </div>

      {product.status === "IN_REVIEW" && (
        <div className="flex gap-3">
          <button
            disabled={pending}
            onClick={() => approve("APPROVED")}
            className="rounded-full bg-green-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            ✓ Одобрить
          </button>
          <button
            disabled={pending}
            onClick={() => approve("REJECTED")}
            className="rounded-full bg-red-100 text-red-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            ✕ Отклонить
          </button>
        </div>
      )}

      <section>
        <h2 className="font-medium mb-2">Размеры и остатки</h2>
        <ul className="flex flex-col gap-2">
          {product.variants.map((v) => {
            const withStock = v.stock.filter((st) => st.quantity > 0);
            const total = withStock.reduce((s, st) => s + st.quantity, 0);
            return (
              <li
                key={v.id}
                className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium w-12">р.{v.size}</span>
                  {v.barcode && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/barcode/${v.barcode}`} alt={v.barcode} className="h-10" />
                  )}
                  <span className="ml-auto text-sm text-neutral-600">остаток: {total}</span>
                  {v.barcode && (
                    <a
                      href={`/print/${v.barcode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm rounded-full bg-neutral-100 px-3 py-1"
                    >
                      🖨
                    </a>
                  )}
                </div>
                {withStock.length > 0 && (
                  <p className="text-xs text-neutral-500 pl-[3.75rem]">
                    {withStock.map((st) => `${st.location.name}: ${st.quantity}`).join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
          {product.variants.length === 0 && (
            <p className="text-sm text-neutral-500">Пока нет ни одного размера</p>
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-medium mb-2">Добавить размер</h2>
        <form onSubmit={addVariant} className="flex gap-2">
          <input
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            placeholder="Размер, напр. 38"
            required
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Штрихкод производителя (если есть)"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            disabled={pending}
            className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium whitespace-nowrap disabled:opacity-50"
          >
            + Добавить
          </button>
        </form>
        <p className="text-xs text-neutral-500 mt-1">
          Если оставить штрихкод пустым — сгенерируется свой (WH...), как при приёмке без
          штрихкода производителя.
        </p>
      </section>
    </div>
  );
}
