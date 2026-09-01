"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

  async function selectProduct(id: string) {
    // На мобильном нет места под две колонки — открываем как обычную страницу.
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      router.push(`/products/${id}`);
      return;
    }
    setSelectedId(id);
    setLoadingDetail(true);
    const data = await getProductDetailAction(id);
    setDetail(data);
    setLoadingDetail(false);
  }

  function handleDetailChange(updated: NonNullable<ProductDetail>) {
    setDetail(updated);
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:h-[calc(100vh-6rem)]">
      <div className="md:w-80 md:shrink-0 flex flex-col gap-3 md:overflow-y-auto md:pr-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Товары</h1>
          <a
            href="/products/new"
            className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium"
          >
            + Новая модель
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

        {filtered.length === 0 && (
          <p className="text-neutral-500 text-sm">Ничего не нашлось.</p>
        )}

        <ul className="flex flex-col gap-2">
          {filtered.map((p) => {
            const totalStock = p.variants.reduce(
              (sum, v) => sum + v.stock.reduce((s, st) => s + st.quantity, 0),
              0,
            );
            const isSelected = p.id === selectedId;
            return (
              <li key={p.id}>
                <button
                  onClick={() => selectProduct(p.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left ${
                    isSelected
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.photoUrl}
                      alt={p.name}
                      className="h-14 w-14 rounded-lg object-cover bg-neutral-100"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-neutral-100 flex items-center justify-center text-2xl">
                      👟
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-neutral-500">
                      {p.category ?? "Без категории"} · остаток {totalStock}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusColor[p.status]}`}
                  >
                    {statusLabel[p.status]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="hidden md:block flex-1 rounded-2xl border border-neutral-200 bg-white p-6 md:overflow-y-auto">
        {loadingDetail && <p className="text-sm text-neutral-500">Загружаю…</p>}
        {!loadingDetail && detail && (
          <ProductDetailPanel product={detail} onChange={handleDetailChange} />
        )}
        {!loadingDetail && !detail && (
          <p className="text-sm text-neutral-500">Выбери товар слева, чтобы увидеть детали.</p>
        )}
      </div>
    </div>
  );
}
