import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

// Список пополняется каждой продажей/приёмкой — не кэшировать статикой.
export const dynamic = "force-dynamic";

const MOVEMENT_LABEL: Record<string, string> = {
  RECEIVE: "Приёмка",
  TRANSFER: "Перемещение",
  ADJUSTMENT: "Корректировка",
};

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function HistoryPage() {
  const [sales, movements] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { movements: true },
    }),
    prisma.stockMovement.findMany({
      where: { type: { in: ["RECEIVE", "TRANSFER", "ADJUSTMENT"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        variant: { include: { product: true } },
        fromLocation: true,
        toLocation: true,
      },
    }),
  ]);

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">История</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Продажи</h2>
        {sales.length === 0 ? (
          <p className="text-sm text-neutral-500">Продаж пока не было.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sales.map((sale) => {
              const count = sale.movements.reduce((n, m) => n + m.quantity, 0);
              return (
                <Link
                  key={sale.id}
                  href={`/history/sales/${sale.id}`}
                  className="rounded-2xl border border-neutral-200 bg-white p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {count} шт. на {sale.totalAmount.toFixed(2)} $
                    </div>
                    <div className="text-xs text-neutral-500">
                      {formatDateTime(sale.createdAt)}
                    </div>
                  </div>
                  <span className="text-neutral-400">›</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <MovementSection
        title="Приёмка"
        emptyText="Приёмок пока не было."
        movements={movements.filter((m) => m.type === "RECEIVE")}
      />

      <MovementSection
        title="Перемещения"
        emptyText="Перемещений пока не было."
        movements={movements.filter((m) => m.type === "TRANSFER")}
      />

      <MovementSection
        title="Корректировки"
        emptyText="Корректировок пока не было."
        movements={movements.filter((m) => m.type === "ADJUSTMENT")}
      />
    </div>
  );
}

type Movement = Prisma.StockMovementGetPayload<{
  include: {
    variant: { include: { product: true } };
    fromLocation: true;
    toLocation: true;
  };
}>;

function MovementSection({
  title,
  emptyText,
  movements,
}: {
  title: string;
  emptyText: string;
  movements: Movement[];
}) {
  // Корректировок обычно нет — не занимать место пустым блоком.
  if (title === "Корректировки" && movements.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-neutral-500">{title}</h2>
      {movements.length === 0 ? (
        <p className="text-sm text-neutral-500">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {movements.map((m) => (
            <div key={m.id} className="rounded-2xl border border-neutral-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {MOVEMENT_LABEL[m.type] ?? m.type}
                </span>
                <span className="text-xs text-neutral-500">
                  {formatDateTime(m.createdAt)}
                </span>
              </div>
              <div className="text-sm">
                {m.variant.product.name}, р.{m.variant.size} — {m.quantity} шт.
              </div>
              <div className="text-xs text-neutral-500">
                {m.fromLocation?.name ?? "—"} → {m.toLocation?.name ?? "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
