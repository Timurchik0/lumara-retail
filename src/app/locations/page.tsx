import Link from "next/link";
import { prisma } from "@/lib/db";
import TransferForm from "./TransferForm";

// Остатки меняются на каждой приёмке/продаже/перемещении — не кэшировать статикой.
export const dynamic = "force-dynamic";

const locationTypeLabel: Record<string, string> = {
  CHINA_WAREHOUSE: "Склад Китай",
  CARGO: "Склад Карго",
  CONTAINER: "Контейнер",
  SALES_CONTAINER: "Контейнер продаж",
};

const typeOrder = ["CHINA_WAREHOUSE", "CARGO", "CONTAINER", "SALES_CONTAINER"];

export default async function LocationsPage() {
  const locations = await prisma.location.findMany({
    include: { stock: { where: { quantity: { gt: 0 } } } },
  });

  const grouped = typeOrder.map((type) => ({
    type,
    items: locations.filter((l) => l.type === type),
  }));

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Склады и локации</h1>

      {grouped.map((group) => (
        <section key={group.type}>
          <h2 className="font-medium mb-2 text-neutral-700">
            {locationTypeLabel[group.type]}
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.items.map((l) => {
              const total = l.stock.reduce((s, st) => s + st.quantity, 0);
              return (
                <li key={l.id}>
                  <Link
                    href={`/locations/${l.id}`}
                    className="block rounded-xl border border-neutral-200 bg-white p-3 text-sm hover:border-neutral-400"
                  >
                    <div className="font-medium">{l.name}</div>
                    <div className="text-neutral-500">остаток: {total}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section>
        <h2 className="font-medium mb-2">Переместить между локациями</h2>
        <TransferForm locations={locations} />
      </section>
    </div>
  );
}
