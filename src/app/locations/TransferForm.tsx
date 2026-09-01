"use client";

import { useEffect, useMemo, useState } from "react";
import { transferAction, variantsWithStockAction } from "./actions";
import type { Location } from "@/generated/prisma/client";

type VariantWithStock = Awaited<ReturnType<typeof variantsWithStockAction>>[number];

export default function TransferForm({ locations }: { locations: Location[] }) {
  const [variants, setVariants] = useState<VariantWithStock[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    variantsWithStockAction().then(setVariants);
  }, [message]);

  const selected = variants.find((v) => v.id === selectedVariantId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return variants;
    return variants.filter(
      (v) =>
        v.product.name.toLowerCase().includes(q) ||
        v.size.toLowerCase().includes(q) ||
        v.barcode?.toLowerCase().includes(q),
    );
  }, [variants, query]);

  // "Откуда" имеет смысл предлагать только те локации, где товар реально есть —
  // иначе легко случайно выбрать локацию с нулевым остатком.
  const fromOptions = selected
    ? locations.filter((l) => selected.stock.some((s) => s.locationId === l.id && s.quantity > 0))
    : locations;

  return (
    <form
      action={async (fd) => {
        await transferAction(fd);
        setMessage("Перемещено");
        setSelectedVariantId("");
        setQuery("");
        setTimeout(() => setMessage(null), 2000);
      }}
      className="rounded-2xl border border-neutral-200 bg-white p-4 flex flex-col gap-3"
    >
      <input type="hidden" name="variantId" value={selectedVariantId} />

      <label className="flex flex-col gap-1 text-sm relative">
        Товар

        {selected ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-3 rounded-lg border border-neutral-300 px-3 py-2 text-left"
          >
            {selected.product.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.product.photoUrl}
                alt=""
                className="h-9 w-9 rounded-md object-cover bg-neutral-100"
              />
            ) : (
              <div className="h-9 w-9 rounded-md bg-neutral-100 flex items-center justify-center text-lg">
                👟
              </div>
            )}
            <span className="flex-1">
              {selected.product.name} · р.{selected.size}
            </span>
            <span className="text-xs text-neutral-500">изменить</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-left text-neutral-500"
          >
            Выбери товар с остатком…
          </button>
        )}

        {pickerOpen && (
          <div className="absolute z-10 top-full mt-1 inset-x-0 rounded-xl border border-neutral-200 bg-white shadow-lg flex flex-col max-h-80">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию, размеру, штрихкоду…"
              className="border-b border-neutral-200 px-3 py-2 text-sm outline-none rounded-t-xl"
            />
            <div className="overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-sm text-neutral-500 p-3">Ничего не нашлось</p>
              )}
              {filtered.map((v) => {
                const total = v.stock.reduce((s, st) => s + st.quantity, 0);
                return (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      setPickerOpen(false);
                      setQuery("");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 text-left"
                  >
                    {v.product.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.product.photoUrl}
                        alt=""
                        className="h-9 w-9 rounded-md object-cover bg-neutral-100"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-md bg-neutral-100 flex items-center justify-center text-lg">
                        👟
                      </div>
                    )}
                    <span className="flex-1 text-sm">
                      {v.product.name} · р.{v.size}
                    </span>
                    <span className="text-xs text-neutral-500">{total} шт.</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="border-t border-neutral-200 px-3 py-2 text-sm text-neutral-500"
            >
              Закрыть
            </button>
          </div>
        )}
      </label>

      {selected && (
        <p className="text-xs text-neutral-500">
          Остатки:{" "}
          {selected.stock.map((s) => `${s.location.name}: ${s.quantity}`).join(", ")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Откуда
          <select
            name="fromLocationId"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2"
          >
            {fromOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Куда
          <select name="toLocationId" required className="rounded-lg border border-neutral-300 px-3 py-2">
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Количество
        <input name="quantity" type="number" min={1} defaultValue={1} required className="rounded-lg border border-neutral-300 px-3 py-2" />
      </label>

      <button
        disabled={!selectedVariantId}
        className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm disabled:opacity-40"
      >
        Переместить
      </button>
      {message && <p className="text-sm text-green-700">{message}</p>}
    </form>
  );
}
