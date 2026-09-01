import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PrintButton from "./PrintButton";

export default async function PrintLabelPage({
  params,
}: {
  params: Promise<{ barcode: string }>;
}) {
  const { barcode } = await params;
  const variant = await prisma.variant.findUnique({
    where: { barcode },
    include: { product: true },
  });

  if (!variant) notFound();

  return (
    <div className="max-w-xs mx-auto p-4 flex flex-col items-center gap-4 print:p-0">
      <div className="w-full rounded-2xl border border-neutral-200 bg-white p-4 flex flex-col items-center gap-2 print:border-none print:rounded-none">
        <p className="text-sm font-medium text-center">{variant.product.name}</p>
        <p className="text-xs text-neutral-500">размер {variant.size}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/barcode/${variant.barcode}`} alt={variant.barcode ?? ""} className="h-20" />
      </div>
      <PrintButton />
    </div>
  );
}
