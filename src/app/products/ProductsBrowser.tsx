"use client";

import { useMemo, useState } from "react";
import ProductDetailPanel from "./ProductDetailPanel";
import { getProductDetailAction, listProductsForBrowseAction } from "./actions";

type ProductListItem = Awaited<ReturnType<typeof listProductsForBrowseAction>>[number];
type ProductDetail = Awaited<ReturnType<typeof getProductDetailAction>>;

const statusLabel: Record<string, string> = {
  NEW: "Новое",
  IN_REVIEW: "На рассмотрении",
  APPROVED: "Одобрено",
  REJECTED: "Отклонено",
};

const statusColor: Record<string, string> = {
  NEW: "bg-neutral-100 text-neutral-700",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

// На рассмотрении — первым делом требует решения, отклонённые — в самый низ.
const statusFilters: { value: string; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: "IN_REVIEW", label: "На рассмотрении" },
  { value: "APPROVED", label: "Одобрено" },
  { value: "REJECTED", label: "Отклонено" },
];

export default function ProductsBrowser({
  initialProducts,
}: {
  initialProducts: ProductListItem[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductDetail>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
    });
  }, [products, query, statusFilter]);

  // Марат прислал референс (Airtable-галерея) — клик по фото открывает
  // модалку с карточкой поверх сетки, а не отдельную страницу. Одно и то же
  // поведение на мобильном и десктопе.
  async function selectProduct(id: string) {
    setSelectedId(id);
    setLoadingDetail(true);
    const data = await getProductDetailAction(id);
    setDetail(data);
    setLoadingDetail(false);
  }

  function closeModal() {
    setSelectedId(null);
    setDetail(null);
  }

  function handleDetailChange(updated: NonNullable<ProductDetail>) {
    setDetail(updated);
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  }

  function handleDetailDeleted() {
    setProducts((prev) => prev.filter((p) => p.id !== selectedId));
    closeModal();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Товары</h1>
          <a
            href="/products/new"
            className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium"
          >
            + Новая модель
          </a>
        </div>
        <a href="/products/new-bulk" className="text-sm text-neutral-500 underline self-start">
          Массово
        </a>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по названию/категории…"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
              statusFilter === f.value
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-600 border-neutral-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-neutral-500 text-sm">Ничего не нашлось.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((p) => {
          const totalStock = p.variants.reduce(
            (sum, v) => sum + v.stock.reduce((s, st) => s + st.quantity, 0),
            0,
          );
          const isSelected = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => selectProduct(p.id)}
              className={`flex flex-col rounded-xl border overflow-hidden text-left ${
                isSelected ? "border-neutral-900" : "border-neutral-200"
              } bg-white`}
            >
              <div className="relative aspect-square bg-neutral-100">
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-3xl">
                    👟
                  </div>
                )}
                <span
                  className={`absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${statusColor[p.status]}`}
                >
                  {statusLabel[p.status]}
                </span>
              </div>
              <div className="p-2">
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-xs text-neutral-500 truncate">
                  {p.category ?? "Без категории"}
                </div>
                <div className="text-xs text-neutral-500">остаток {totalStock}</div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedId && (
        <div
          className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/50 p-0 md:p-4"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl bg-white overflow-y-auto"
          >
            <div className="sticky top-0 z-10 flex justify-end bg-white px-3 py-2 border-b border-neutral-100">
              <button
                type="button"
                onClick={closeModal}
                aria-label="Закрыть"
                className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0"
              >
                ✕
              </button>
            </div>
            <div className="px-6 pb-6 pt-4">
              {loadingDetail && <p className="text-sm text-neutral-500">Загружаю…</p>}
              {!loadingDetail && detail && (
                <ProductDetailPanel
                  product={detail}
                  onChange={handleDetailChange}
                  onDeleted={handleDetailDeleted}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
