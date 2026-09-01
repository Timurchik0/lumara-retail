import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

const locationTypeLabel: Record<string, string> = {
  CHINA_WAREHOUSE: "Склад Китай",
  CARGO: "Склад Карго",
  CONTAINER: "Контейнер",
  SALES_CONTAINER: "Контейнер продаж",
};

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      stock: {
        where: { quantity: { gt: 0 } },
        include: { variant: { include: { product: true } } },
        orderBy: { quantity: "desc" },
      },
    },
  });

  if (!location) notFound();

  const total = location.stock.reduce((s, st) => s + st.quantity, 0);

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
      <Link href="/locations" className="text-sm text-neutral-500">
        ← Все склады
      </Link>
      <div>
        <h1 className="text-xl font-semibold">{location.name}</h1>
        <p className="text-sm text-neutral-500">
          {locationTypeLabel[location.type]} · всего {total} шт.
        </p>
      </div>

      {location.stock.length === 0 ? (
        <p className="text-sm text-neutral-500">Здесь пока пусто.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {location.stock.map((s) => (
            <li key={s.id}>
              <Link
                href={`/products/${s.variant.productId}`}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3"
              >
                {s.variant.product.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.variant.product.photoUrl}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover bg-neutral-100"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-neutral-100 flex items-center justify-center">
                    👟
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium">{s.variant.product.name}</div>
                  <div className="text-xs text-neutral-500">размер {s.variant.size}</div>
                </div>
                <span className="text-sm font-medium">{s.quantity} шт.</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
