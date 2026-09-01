import Link from "next/link";
import { prisma } from "@/lib/db";

// Сводка меняется на каждой приёмке/продаже — не кэшировать статикой.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [productCount, stockSum, pendingCount] = await Promise.all([
    prisma.product.count(),
    prisma.stock.aggregate({ _sum: { quantity: true } }),
    prisma.product.count({ where: { status: "IN_REVIEW" } }),
  ]);

  const cards = [
    { href: "/products/new", icon: "📷", title: "Занести товар", desc: "Фото → карточка сама заполняется" },
    { href: "/receive", icon: "📥", title: "Приёмка", desc: "Сканируй штрихкод и принимай на склад" },
    { href: "/kassa", icon: "🧾", title: "Касса", desc: "Сканируй товары и пробей одним чеком" },
    { href: "/locations", icon: "📦", title: "Склады", desc: "Остатки по локациям, перемещения" },
    { href: "/history", icon: "📜", title: "История", desc: "Прошлые продажи, приёмки, перемещения" },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Опт-Обувь WMS</h1>
        <p className="text-sm text-neutral-500">Склад и продажи — от фото до кассы</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
          <div className="text-2xl font-semibold">{productCount}</div>
          <div className="text-xs text-neutral-500">моделей</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
          <div className="text-2xl font-semibold">{stockSum._sum.quantity ?? 0}</div>
          <div className="text-xs text-neutral-500">единиц на складе</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
          <div className="text-2xl font-semibold">{pendingCount}</div>
          <div className="text-xs text-neutral-500">на проверке</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-neutral-200 bg-white p-4 flex flex-col gap-1"
          >
            <span className="text-2xl">{c.icon}</span>
            <span className="font-medium">{c.title}</span>
            <span className="text-xs text-neutral-500">{c.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
