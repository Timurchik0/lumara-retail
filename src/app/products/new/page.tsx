import Link from "next/link";
import PhotoIntakeForm from "./PhotoIntakeForm";

// Анализ фото через Claude Vision иногда не укладывается в стандартные 10с
// serverless-функции на Vercel — без этого форма могла зависнуть посередине.
export const maxDuration = 60;

export default function NewProductPage() {
  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Новая модель</h1>
        <Link href="/products/new-bulk" className="text-sm text-neutral-500 underline">
          Массово
        </Link>
      </div>
      <PhotoIntakeForm />
    </div>
  );
}
