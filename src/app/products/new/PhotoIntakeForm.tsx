"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analyzePhotoAction, createProductQuickAction } from "@/app/products/actions";
import { compressImage } from "@/lib/compressImage";

// Не нужен промежуточный экран с полями — кидаешь фото, карточка сразу
// создаётся в статусе "На рассмотрении", остальное (размеры, цены)
// дозаполняется потом на странице самого товара.
export default function PhotoIntakeForm() {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "saving" | "error">("idle");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const compressed = await compressImage(file);
    setPreview(URL.createObjectURL(compressed));
    setStatus("analyzing");

    const analyzeForm = new FormData();
    analyzeForm.append("photo", compressed);

    // Если анализ подвиснет (медленная сеть, сбой у модели) — не держим
    // человека вечно, через 25с идём дальше без AI-полей.
    let result: Awaited<ReturnType<typeof analyzePhotoAction>> = null;
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 25000));
      result = await Promise.race([analyzePhotoAction(analyzeForm), timeout]);
    } catch {
      result = null;
    }

    setStatus("saving");
    const saveForm = new FormData();
    saveForm.set("photo", compressed);
    saveForm.set("name", result?.name ?? "");
    saveForm.set("category", result?.category ?? "");
    saveForm.set("description", result?.description ?? "");

    try {
      const product = await createProductQuickAction(saveForm);
      router.push(`/products/${product.id}`);
    } catch {
      setStatus("error");
    }
  }

  function retry() {
    setPreview(null);
    setStatus("idle");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Скрытые инпуты: камера открывает съёмку сразу, галерея — выбор готового фото */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!preview ? (
        <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-8 flex flex-col items-center gap-4 text-center">
          <div className="text-4xl">👟</div>
          <p className="text-sm text-neutral-500">
            Сфотографируй модель или выбери готовое фото — карточка создастся сама
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="rounded-full bg-neutral-900 text-white px-5 py-3 text-sm font-medium flex items-center gap-2"
            >
              📷 Камера
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="rounded-full bg-neutral-100 px-5 py-3 text-sm font-medium flex items-center gap-2"
            >
              🖼 Из галереи
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Фото товара"
            className="w-full aspect-square object-cover rounded-2xl bg-neutral-100"
          />
          {(status === "analyzing" || status === "saving") && (
            <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center text-white text-sm">
              {status === "analyzing" ? "Анализирую фото…" : "Сохраняю карточку…"}
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-red-600">Не получилось сохранить карточку — попробуй ещё раз.</p>
          <button
            type="button"
            onClick={retry}
            className="self-start rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium"
          >
            Попробовать снова
          </button>
        </div>
      )}
    </div>
  );
}
