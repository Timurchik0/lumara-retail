"use client";

import { useEffect, useRef, useState } from "react";
import CameraScanner from "@/components/CameraScanner";
import {
  lookupBarcodeAction,
  receiveExistingAction,
  receiveNewVariantAction,
  listProductsAction,
  listLocationsAction,
} from "./actions";

type Variant = Awaited<ReturnType<typeof lookupBarcodeAction>>;
type Product = Awaited<ReturnType<typeof listProductsAction>>[number];
type Location = Awaited<ReturnType<typeof listLocationsAction>>[number];

const locationTypeLabel: Record<string, string> = {
  CHINA_WAREHOUSE: "Склад Китай",
  CARGO: "Склад Карго",
  CONTAINER: "Контейнер",
  SALES_CONTAINER: "Контейнер продаж",
};

export default function ReceiveFlow() {
  const [barcode, setBarcode] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<Variant | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [done, setDone] = useState<{ message: string; printBarcode?: string } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ветка "штрихкода нет / не найден" — заводим новую позицию
  const [hasBarcode, setHasBarcode] = useState<"yes" | "no" | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");

  useEffect(() => {
    listLocationsAction().then(setLocations);
    listProductsAction().then(setProducts);
  }, []);

  async function runSearch(code: string) {
    if (!code.trim()) return;
    setBarcode(code);
    setSearching(true);
    setDone(null);
    const variant = await lookupBarcodeAction(code.trim());
    setSearching(false);
    if (variant) {
      setFound(variant);
      setNotFound(false);
    } else {
      setNotFound(true);
      setFound(null);
    }
  }

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    runSearch(barcode);
  }

  function handleCameraScan(code: string) {
    setCameraOpen(false);
    runSearch(code);
  }

  function reset() {
    setBarcode("");
    setFound(null);
    setNotFound(false);
    setHasBarcode(null);
    setSelectedProductId("");
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center flex flex-col gap-3 items-center">
        <p className="text-green-800 font-medium">{done.message}</p>
        {done.printBarcode && (
          <a
            href={`/print/${done.printBarcode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-neutral-900 text-white px-5 py-2 text-sm"
          >
            🖨 Открыть этикетку для печати
          </a>
        )}
        <button
          onClick={() => {
            setDone(null);
            reset();
          }}
          className="mt-1 rounded-full bg-white border border-neutral-300 px-5 py-2 text-sm"
        >
          Следующая позиция
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {cameraOpen && (
        <CameraScanner onScan={handleCameraScan} onClose={() => setCameraOpen(false)} />
      )}

      {/* Экран сканирования — совместим и с ТСД (клавиатурная эмуляция), и с камерой телефона */}
      <form onSubmit={handleScan} className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          className="rounded-2xl bg-neutral-900 text-white p-6 text-center"
        >
          <div className="text-3xl mb-2">📷</div>
          <p className="text-sm text-neutral-300">
            Нажми, чтобы отсканировать камерой — или наведи ТСД, код появится в поле ниже
          </p>
        </button>
        <input
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Штрихкод (WH0000031...)"
          className="rounded-xl border border-neutral-300 px-4 py-3 text-center text-lg tracking-wide"
        />
        <button className="rounded-full bg-neutral-900 text-white px-5 py-3 text-sm font-medium">
          Найти
        </button>
      </form>

      {!found && !notFound && (
        <button
          type="button"
          onClick={() => {
            setBarcode("");
            setNotFound(true);
            setHasBarcode("no");
          }}
          className="text-sm text-neutral-500 underline text-center"
        >
          На товаре нет штрихкода — завести новую позицию
        </button>
      )}

      {searching && <p className="text-sm text-neutral-500">Ищу…</p>}

      {found && (
        <ExistingVariantForm
          variant={found}
          locations={locations}
          onDone={(msg) => setDone({ message: msg })}
          onCancel={reset}
        />
      )}

      {notFound && hasBarcode === null && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800 mb-3">
            Штрихкод «{barcode}» не найден в системе — это новая позиция.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setHasBarcode("yes")}
              className="flex-1 rounded-full bg-white border border-amber-300 px-3 py-2 text-sm"
            >
              Это штрихкод производителя
            </button>
            <button
              onClick={() => setHasBarcode("no")}
              className="flex-1 rounded-full bg-white border border-amber-300 px-3 py-2 text-sm"
            >
              На товаре нет штрихкода
            </button>
          </div>
        </div>
      )}

      {notFound && hasBarcode && (
        <NewVariantForm
          scannedBarcode={hasBarcode === "yes" ? barcode : ""}
          hasBarcode={hasBarcode}
          products={products}
          locations={locations}
          selectedProductId={selectedProductId}
          onSelectProduct={setSelectedProductId}
          onDone={(msg, printBarcode) => setDone({ message: msg, printBarcode })}
          onCancel={reset}
        />
      )}
    </div>
  );
}

function ExistingVariantForm({
  variant,
  locations,
  onDone,
  onCancel,
}: {
  variant: NonNullable<Variant>;
  locations: Location[];
  onDone: (msg: string) => void;
  onCancel: () => void;
}) {
  return (
    <form
      action={async (fd) => {
        fd.set("variantId", variant.id);
        await receiveExistingAction(fd);
        onDone(`Принято: ${variant.product.name}, р.${variant.size} — ${fd.get("quantity")} шт.`);
      }}
      className="rounded-2xl border border-neutral-200 bg-white p-4 flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        {variant.product.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={variant.product.photoUrl}
            alt=""
            className="h-14 w-14 rounded-lg object-cover"
          />
        ) : (
          <div className="h-14 w-14 rounded-lg bg-neutral-100 flex items-center justify-center">👟</div>
        )}
        <div>
          <div className="font-medium">{variant.product.name}</div>
          <div className="text-sm text-neutral-500">размер {variant.size}</div>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Куда принимаем
        <select name="toLocationId" required className="rounded-lg border border-neutral-300 px-3 py-2">
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {locationTypeLabel[l.type]} — {l.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Количество
        <input name="quantity" type="number" min={1} defaultValue={1} required className="rounded-lg border border-neutral-300 px-3 py-2" />
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-full bg-neutral-100 px-4 py-2 text-sm">
          Отмена
        </button>
        <button className="flex-1 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm">
          Принять на склад
        </button>
      </div>
    </form>
  );
}

function NewVariantForm({
  scannedBarcode,
  hasBarcode,
  products,
  locations,
  selectedProductId,
  onSelectProduct,
  onDone,
  onCancel,
}: {
  scannedBarcode: string;
  hasBarcode: "yes" | "no";
  products: Product[];
  locations: Location[];
  selectedProductId: string;
  onSelectProduct: (id: string) => void;
  onDone: (msg: string, printBarcode?: string) => void;
  onCancel: () => void;
}) {
  return (
    <form
      action={async (fd) => {
        fd.set("hasBarcode", hasBarcode);
        fd.set("scannedBarcode", scannedBarcode);
        const res = await receiveNewVariantAction(fd);
        onDone(
          res.generated
            ? `Создана позиция, напечатай штрихкод ${res.variant.barcode} и наклей на товар. Принято ${fd.get("quantity")} шт.`
            : `Создана позиция со штрихкодом ${res.variant.barcode}. Принято ${fd.get("quantity")} шт.`,
          res.generated ? (res.variant.barcode ?? undefined) : undefined,
        );
      }}
      className="rounded-2xl border border-neutral-200 bg-white p-4 flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Модель
        <select
          name="productId"
          required
          value={selectedProductId}
          onChange={(e) => onSelectProduct(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2"
        >
          <option value="" disabled>
            Выбери модель…
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-neutral-500">
        Нет нужной модели?{" "}
        <a href="/products/new" className="underline">
          Добавь карточку по фото
        </a>{" "}
        и вернись сюда.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Размер
        <input name="size" required placeholder="38" className="rounded-lg border border-neutral-300 px-3 py-2" />
      </label>

      {hasBarcode === "no" && (
        <p className="text-xs text-neutral-500">
          Штрихкод сгенерируется автоматически — после сохранения его нужно будет
          распечатать и наклеить на товар.
        </p>
      )}
      {hasBarcode === "yes" && (
        <p className="text-xs text-neutral-500">Будет использован штрихкод: {scannedBarcode}</p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Куда принимаем
        <select name="toLocationId" required className="rounded-lg border border-neutral-300 px-3 py-2">
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {locationTypeLabel[l.type]} — {l.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Количество
        <input name="quantity" type="number" min={1} defaultValue={1} required className="rounded-lg border border-neutral-300 px-3 py-2" />
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-full bg-neutral-100 px-4 py-2 text-sm">
          Отмена
        </button>
        <button className="flex-1 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm">
          Создать и принять
        </button>
      </div>
    </form>
  );
}
