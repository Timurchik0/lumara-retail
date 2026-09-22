import Link from "next/link";

export default function HomePage() {
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
        <h1 className="text-xl font-semibold">
          <span className="text-amber-500">Люмара</span> Розница
        </h1>
        <p className="text-sm text-neutral-500">Склад и продажи — от фото до кассы</p>
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
