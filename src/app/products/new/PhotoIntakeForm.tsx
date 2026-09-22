"use client";

import { useRef, useState, useTransition } from "react";
import { analyzePhotoAction, createProductAction } from "@/app/products/actions";
import { compressImage } from "@/lib/compressImage";

export default function PhotoIntakeForm() {
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [aiSkipped, setAiSkipped] = useState(false);
  const [pending, startTransition] = useTransition();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setAnalyzing(true);
    setAiSkipped(false);

    const compressed = await compressImage(file);
    setPhotoFile(compressed);
    setPreview(URL.createObjectURL(compressed));

    const fd = new FormData();
    fd.append("photo", compressed);
    const result = await analyzePhotoAction(fd);
    setAnalyzing(false);

    if (result) {
      setName(result.name);
      setCategory(result.category);
      setDescription(result.description);
    } else {
      setAiSkipped(true);
    }
  }

  function handleSubmit(formData: FormData) {
    if (photoFile) formData.set("photo", photoFile);
    formData.set("name", name);
    formData.set("category", category);
    formData.set("description", description);
    startTransition(() => {
      createProductAction(formData);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
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
            Сфотографируй модель или выбери готовое фото — карточка заполнится сама
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
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setPhotoFile(null);
            }}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center"
          >
            ✕
          </button>
          {analyzing && (
            <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center text-white text-sm">
              Анализирую фото…
            </div>
          )}
        </div>
      )}

      {aiSkipped && (
        <p className="text-xs text-amber-600">
          Автозаполнение недоступно (не задан ANTHROPIC_API_KEY) — заполни поля вручную.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Название
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-lg border border-neutral-300 px-3 py-2"
          placeholder="Туфли на каблуке бежевые"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Категория
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2"
          placeholder="Туфли"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Характеристики
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2"
          rows={2}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Размеры в наличии
        <input
          name="sizes"
          className="rounded-lg border border-neutral-300 px-3 py-2"
          placeholder="36, 37, 38, 39, 40"
        />
        <span className="text-xs text-neutral-500">
          Через запятую — на каждый сразу сгенерируется свой штрихкод. Можно оставить
          пустым и добавить размеры позже, на странице товара.
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Закупочная цена, с
          <input
            name="costPrice"
            type="number"
            step="0.01"
            className="rounded-lg border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Розничная цена, с
          <input
            name="retailPrice"
            type="number"
            step="0.01"
            className="rounded-lg border border-neutral-300 px-3 py-2"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending || !name}
        className="rounded-full bg-neutral-900 text-white px-5 py-3 text-sm font-medium disabled:opacity-40"
      >
        {pending ? "Сохраняю…" : "Сохранить карточку"}
      </button>
    </form>
  );
}
