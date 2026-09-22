import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  addVariantAction,
  approveProductAction,
  updateProductRedirectAction,
} from "@/app/products/actions";
import DeleteProductButton from "@/app/products/DeleteProductButton";

const statusLabel: Record<string, string> = {
  NEW: "Новое",
  IN_REVIEW: "На рассмотрении",
  APPROVED: "Одобрено",
  REJECTED: "Отклонено",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: {
        include: { stock: { include: { location: true } } },
        orderBy: { size: "asc" },
      },
    },
  });

  if (!product) notFound();

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-6">
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
          <form action={approveProductAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="status" value="APPROVED" />
            <button className="rounded-full bg-green-600 text-white px-4 py-2 text-sm font-medium">
              ✓ Одобрить
            </button>
          </form>
          <form action={approveProductAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="status" value="REJECTED" />
            <button className="rounded-full bg-red-100 text-red-700 px-4 py-2 text-sm font-medium">
              ✕ Отклонить
            </button>
          </form>
        </div>
      )}

      <details className="rounded-xl border border-neutral-200 bg-white p-3">
        <summary className="text-sm font-medium cursor-pointer">Редактировать карточку</summary>
        <form action={updateProductRedirectAction} className="flex flex-col gap-2 mt-3">
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
          <button className="self-start rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium">
            Сохранить
          </button>
        </form>
        <div className="mt-3 pt-3 border-t border-neutral-100">
          <DeleteProductButton productId={product.id} productName={product.name} />
        </div>
      </details>

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
                    <img
                      src={`/api/barcode/${v.barcode}`}
                      alt={v.barcode}
                      className="h-10"
                    />
                  )}
                  <span className="ml-auto text-sm text-neutral-600">
                    остаток: {total}
                  </span>
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
                    {withStock
                      .map((st) => `${st.location.name}: ${st.quantity}`)
                      .join(" · ")}
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
        <form action={addVariantAction} className="flex flex-col gap-2">
          <input type="hidden" name="productId" value={product.id} />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="size"
              placeholder="38 или 36-40"
              required
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              name="barcode"
              placeholder="Штрихкод (если есть)"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <button className="self-start rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium">
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
