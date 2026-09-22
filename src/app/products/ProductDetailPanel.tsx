"use client";

import { useState, useTransition } from "react";
import {
  addVariantInlineAction,
  approveProductInlineAction,
  updateProductAction,
  getProductDetailAction,
} from "./actions";
import DeleteProductButton from "./DeleteProductButton";

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
  onDeleted,
}: {
  product: NonNullable<ProductDetail>;
  onChange: (updated: NonNullable<ProductDetail>) => void;
  onDeleted?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [sizeInput, setSizeInput] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [editPending, startEditTransition] = useTransition();

  function approve(status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const updated = await approveProductInlineAction(product.id, status);
      if (updated) onChange(updated);
    });
  }

  function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startEditTransition(async () => {
      const updated = await updateProductAction(fd);
      if (updated) onChange(updated);
      setEditing(false);
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
            Закупка: {product.costPrice ?? "—"} с · Розница: {product.retailPrice ?? "—"} с
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

      <div className="rounded-xl border border-neutral-200 bg-white p-3">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-sm font-medium"
        >
          {editing ? "Скрыть редактирование" : "Редактировать карточку"}
        </button>
        {editing && (
          <>
            <form onSubmit={saveEdit} className="flex flex-col gap-2 mt-3">
              <input type="hidden" name="productId" value={product.id} />
              <input
                name="name"
                defaultValue={product.name}
                required
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                name="category"
                defaultValue={product.category ?? ""}
                placeholder="Категория"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <textarea
                name="description"
                defaultValue={product.description ?? ""}
                placeholder="Характеристики"
                rows={2}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="costPrice"
                  type="number"
                  step="0.01"
                  defaultValue={product.costPrice ?? ""}
                  placeholder="Закупка, с"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  name="retailPrice"
                  type="number"
                  step="0.01"
                  defaultValue={product.retailPrice ?? ""}
                  placeholder="Розница, с"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                disabled={editPending}
                className="self-start rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Сохранить
              </button>
            </form>
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <DeleteProductButton
                productId={product.id}
                productName={product.name}
                onDeleted={onDeleted}
              />
            </div>
          </>
        )}
      </div>

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
        <form onSubmit={addVariant} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={sizeInput}
              onChange={(e) => setSizeInput(e.target.value)}
              placeholder="38 или 36-40"
              required
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Штрихкод (если есть)"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={pending}
            className="self-start rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            + Добавить
          </button>
        </form>
        <p className="text-xs text-neutral-500 mt-1">
          Можно сразу несколько: через запятую (36, 37, 38) или диапазоном (36-40) — на каждый
          размер сгенерируется свой штрихкод. Штрихкод из поля применится, только если вводишь
          один размер; если оставить пустым — сгенерируется свой (WH...).
        </p>
      </section>
    </div>
  );
}
