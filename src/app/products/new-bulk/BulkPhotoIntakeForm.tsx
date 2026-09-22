"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus, Check } from "lucide-react";
import { analyzePhotoAction, createProductQuickAction } from "@/app/products/actions";
import { compressImage } from "@/lib/compressImage";

type Draft = {
  id: string;
  previewUrl: string;
  status: "analyzing" | "saving" | "done";
  name: string;
  productId?: string;
};

export default function BulkPhotoIntakeForm() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const redirectedRef = useRef(false);

  // После обработки фото хочет сразу оказаться на "Товары", а не смотреть на
  // пустую страницу загрузки — редиректим, как только всё из текущей пачки
  // долетело до статуса "done".
  useEffect(() => {
    if (redirectedRef.current) return;
    if (drafts.length === 0) return;
    if (drafts.every((d) => d.status === "done")) {
      redirectedRef.current = true;
      const t = setTimeout(() => router.push("/products"), 900);
      return () => clearTimeout(t);
    }
  }, [drafts, router]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    for (const file of files) {
      const compressed = await compressImage(file);
      const draft: Draft = {
        id: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(compressed),
        status: "analyzing",
        name: "",
      };
      setDrafts((prev) => [...prev, draft]);
      processDraft(draft.id, compressed);
    }
  }

  // Никакого промежуточного экрана "проверь и сохрани" — фото сразу
  // становится карточкой в статусе "На рассмотрении", человек донастраивает
  // (размеры, цену) и одобряет уже на странице самого товара.
  async function processDraft(id: string, file: File) {
    const analyzeForm = new FormData();
    analyzeForm.append("photo", file);

    // Если анализ подвиснет (медленная сеть, сбой у модели) — не держим
    // карточку в "Анализирую…" вечно, через 25с идём дальше без AI-полей.
    let result: Awaited<ReturnType<typeof analyzePhotoAction>> = null;
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 25000));
      result = await Promise.race([analyzePhotoAction(analyzeForm), timeout]);
    } catch {
      result = null;
    }

    const name = result?.name ?? "";
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: "saving", name } : d)));

    const saveForm = new FormData();
    saveForm.set("photo", file);
    saveForm.set("name", name);
    saveForm.set("category", result?.category ?? "");
    saveForm.set("description", result?.description ?? "");
    try {
      const product = await createProductQuickAction(saveForm);
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, status: "done", name: product.name, productId: product.id } : d,
        ),
      );
    } catch {
      setDrafts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: "done", name: name || "Ошибка сохранения" } : d)),
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        id="bulk-photo-input"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <label
        htmlFor="bulk-photo-input"
        className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-6 flex flex-col items-center gap-2 text-center cursor-pointer"
      >
        <ImagePlus className="h-8 w-8 text-neutral-500" strokeWidth={1.75} />
        <span className="text-sm text-neutral-600 font-medium">
          Выбрать несколько фото — карточки создадутся сами
        </span>
        <span className="text-xs text-neutral-500">
          Название подтянется автоматически, статус — «На рассмотрении». Донастроить (размеры,
          цену) и одобрить можно на странице товара.
        </span>
      </label>

      {drafts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="rounded-2xl border border-neutral-200 bg-white p-2 flex flex-col gap-2"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.previewUrl}
                  alt=""
                  className="w-full aspect-square rounded-lg object-cover bg-neutral-100"
                />
                {d.status !== "done" && (
                  <div className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center text-white text-xs text-center px-2">
                    {d.status === "analyzing" ? "Анализирую…" : "Сохраняю…"}
                  </div>
                )}
              </div>
              <div className="text-sm font-medium truncate">{d.name || "Без названия"}</div>
              {d.status === "done" && d.productId ? (
                <Link
                  href={`/products/${d.productId}`}
                  className="text-xs text-green-700 inline-flex items-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2} /> Создано — открыть
                </Link>
              ) : (
                <span className="text-xs text-neutral-400">Не трогай — почти готово</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
