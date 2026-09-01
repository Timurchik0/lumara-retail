import { prisma } from "@/lib/db";
import ProductsBrowser from "./ProductsBrowser";

// Данные меняются на каждой приёмке/продаже — не кэшировать статикой.
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { variants: { include: { stock: true } } },
  });

  return (
    <div className="max-w-6xl mx-auto p-4">
      <ProductsBrowser initialProducts={products} />
    </div>
  );
}
