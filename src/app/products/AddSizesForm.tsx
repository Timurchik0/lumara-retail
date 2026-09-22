"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseSizes } from "@/lib/sizes";
import { addVariantsWithBarcodesAction, getProductDetailAction } from "./actions";

type ProductDetail = Awaited<ReturnType<typeof getProductDetailAction>>;

/** Ввод размеров в два шага: сначала список/диапазон ("36-40"), потом на
 * каждый получившийся размер — своя строка со своим штрихкодом (если он уже
 * есть, например на коробке). Пустая строка — сгенерируется свой (WH...). */
export default function AddSizesForm({
  productId,
  onAdded,
}: {
  productId: string;
  onAdded?: (updated: NonNullable<ProductDetail>) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sizesRaw, setSizesRaw] = useState("");
  const [rows, setRows] = useState<{ size: string; barcode: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function buildRows() {
    const sizes = parseSizes(sizesRaw);
    if (sizes.length === 0) return;
    setRows(sizes.map((size) => ({ size, barcode: "" })));
  }

  function updateBarcode(i: number, value: string) {
    setRows((prev) => prev && prev.map((r, idx) => (idx === i ? { ...r, barcode: value } : r)));
  }

  function reset() {
    setRows(null);
    setSizesRaw("");
    setError(null);
  }

  function submit() {
    if (!rows || rows.length === 0) return;
    setError(null);
    const fd = new FormData();
    fd.set("productId", productId);
    for (const r of rows) {
      fd.append("size", r.size);
      fd.append("barcode", r.barcode);
    }
    startTransition(async () => {
      try {
        const updated = await addVariantsWithBarcodesAction(fd);
        if (updated && onAdded) onAdded(updated);
        else router.refresh();
        reset();
      } catch {
        setError("Не получилось добавить — возможно, такой штрихкод уже занят.");
      }
    });
  }

  if (!rows) {
    return (
      <div className="flex flex-col gap-2">
        <input
          value={sizesRaw}
          onChange={(e) => setSizesRaw(e.target.value)}
          placeholder="38 или 36-40"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={buildRows}
          disabled={!sizesRaw.trim()}
          className="self-start rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Далее
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={r.size} className="flex items-center gap-2">
          <span className="w-12 text-sm font-medium shrink-0">р.{r.size}</span>
          <input
            value={r.barcode}
            onChange={(e) => updateBarcode(i, e.target.value)}
            placeholder="Штрихкод (если есть)"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium"
        >
          Отмена
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Добавляю…" : `Добавить (${rows.length})`}
        </button>
      </div>
    </div>
  );
}
