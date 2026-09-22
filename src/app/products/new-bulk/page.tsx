import Link from "next/link";
import BulkPhotoIntakeForm from "./BulkPhotoIntakeForm";

// См. products/new/page.tsx — тот же анализ фото, тот же риск тайм-аута.
export const maxDuration = 60;

export default function NewProductsBulkPage() {
  return (
    <div className="max-w-md mx-auto p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Массовое занесение</h1>
        <Link href="/products/new" className="text-sm text-neutral-500 underline">
          Одна карточка
        </Link>
      </div>
      <BulkPhotoIntakeForm />
    </div>
  );
}
