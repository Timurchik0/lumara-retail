import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function SaleReceiptPage({
  params,
}: PageProps<"/history/sales/[id]">) {
  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      movements: {
        include: { variant: { include: { product: true } } },
      },
    },
  });
  if (!sale) notFound();

  const count = sale.movements.reduce((n, m) => n + m.quantity, 0);

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col gap-4">
      <Link href="/history" className="text-sm text-neutral-500">
        ← История
      </Link>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 flex flex-col gap-3">
        <div>
          <h1 className="text-lg font-semibold">Чек</h1>
          <p className="text-xs text-neutral-500">{formatDateTime(sale.createdAt)}</p>
        </div>

        <div className="flex flex-col divide-y divide-neutral-100">
          {sale.movements.map((m) => (
            <div key={m.id} className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {m.variant.product.name}
                </div>
                <div className="text-xs text-neutral-500">
                  р.{m.variant.size} · {m.quantity} шт. × {(m.unitPrice ?? 0).toFixed(2)} с
                </div>
              </div>
              <div className="text-sm font-medium shrink-0">
                {((m.unitPrice ?? 0) * m.quantity).toFixed(2)} с
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-200 pt-3 flex items-center justify-between">
          <span className="text-sm text-neutral-500">{count} шт. итого</span>
          <span className="text-lg font-semibold">{sale.totalAmount.toFixed(2)} с</span>
        </div>
      </div>
    </div>
  );
}
