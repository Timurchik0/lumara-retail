"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import CameraScanner from "@/components/CameraScanner";
import { checkoutAction, lookupForKassaAction } from "./actions";

type CartItem = {
  variantId: string;
  name: string;
  size: string;
  photoUrl: string | null;
  quantity: number;
  unitPrice: number;
  stockHere: number;
};

type Receipt = {
  id: string;
  totalAmount: number;
  items: { name: string; size: string; quantity: number; unitPrice: number }[];
};

export default function KassaFlow() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [salesLocationId, setSalesLocationId] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addByBarcode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    const res = await lookupForKassaAction(trimmed);
    if (!res) {
      setError(`Штрихкод "${trimmed}" не найден`);
      return;
    }
    if (!res.salesLocationId || res.stockHere <= 0) {
      setError(`${res.name}, р.${res.size} — нет в Контейнере продаж`);
      return;
    }
    setError(null);
    setSalesLocationId(res.salesLocationId);
    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === res.variantId);
      if (existing) {
        if (existing.quantity >= res.stockHere) {
          setError(`${res.name}, р.${res.size} — в наличии только ${res.stockHere} шт.`);
          return prev;
        }
        return prev.map((i) =>
          i.variantId === res.variantId ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          variantId: res.variantId,
          name: res.name,
          size: res.size,
          photoUrl: res.photoUrl,
          quantity: 1,
          unitPrice: res.retailPrice ?? 0,
          stockHere: res.stockHere,
        },
      ];
    });
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = barcode;
    setBarcode("");
    addByBarcode(code);
  }

  function handleCameraScan(code: string) {
    addByBarcode(code);
  }

  function updateQuantity(variantId: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => {
        if (i.variantId !== variantId) return i;
        const next = i.quantity + delta;
        if (next < 1 || next > i.stockHere) return i;
        return { ...i, quantity: next };
      }),
    );
  }

  function updatePrice(variantId: string, price: number) {
    setCart((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, unitPrice: price } : i)),
    );
  }

  function removeItem(variantId: string) {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  async function checkout() {
    if (cart.length === 0 || !salesLocationId) return;
    setSubmitting(true);
    try {
      const sale = await checkoutAction({
        fromLocationId: salesLocationId,
        items: cart.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      setReceipt({
        id: sale.id,
        totalAmount: sale.totalAmount,
        items: cart.map((i) => ({
          name: i.name,
          size: i.size,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      setCart([]);
    } catch {
      setError("Не получилось оформить продажу — попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 flex flex-col gap-3">
        <p className="text-green-800 font-medium text-center">Продажа оформлена</p>
        <div className="rounded-xl bg-white/70 divide-y divide-green-100">
          {receipt.items.map((item, i) => (
            <div key={i} className="p-2 flex items-center justify-between text-sm">
              <span>
                {item.name}, р.{item.size} × {item.quantity}
              </span>
              <span className="font-medium">
                {(item.unitPrice * item.quantity).toFixed(2)} с
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-neutral-600">Итого</span>
          <span className="text-lg font-semibold">{receipt.totalAmount.toFixed(2)} с</span>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/history/sales/${receipt.id}`}
            className="flex-1 rounded-full bg-white text-neutral-900 border border-neutral-200 px-4 py-2 text-sm text-center"
          >
            Открыть чек
          </Link>
          <button
            onClick={() => setReceipt(null)}
            className="flex-1 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm"
          >
            Новая продажа
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-56 md:pb-32">
      {cameraOpen && (
        <CameraScanner
          continuous
          onScan={handleCameraScan}
          onClose={() => setCameraOpen(false)}
        />
      )}

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Штрихкод (ТСД)"
          className="flex-1 min-w-0 rounded-xl border border-neutral-300 px-4 py-3 text-center text-lg tracking-wide"
        />
        <button className="rounded-xl bg-neutral-900 text-white px-4 text-sm font-medium">
          Добавить
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {cart.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-8">
          Корзина пуста — отсканируйте товар
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {cart.map((item) => (
            <div
              key={item.variantId}
              className="rounded-2xl border border-neutral-200 bg-white p-3 flex items-center gap-3"
            >
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photoUrl}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                  👟
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-xs text-neutral-500">размер {item.size}</div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, -1)}
                    className="h-6 w-6 rounded-full bg-neutral-100 text-sm"
                  >
                    −
                  </button>
                  <span className="text-sm w-5 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, 1)}
                    disabled={item.quantity >= item.stockHere}
                    className="h-6 w-6 rounded-full bg-neutral-100 text-sm disabled:opacity-40"
                  >
                    +
                  </button>
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updatePrice(item.variantId, Number(e.target.value))}
                    className="w-16 rounded-lg border border-neutral-300 px-2 py-1 text-sm ml-2"
                  />
                  <span className="text-xs text-neutral-400">с</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-sm font-medium">
                  {(item.unitPrice * item.quantity).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  className="text-neutral-400 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Одна группа снизу — иначе плавающая кнопка и панель итога независимо
          цепляются за bottom-0 и наезжают на нижнюю навигацию (md:hidden). */}
      <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-30">
        <div className="relative max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            aria-label="Сканировать камерой"
            className="absolute left-1/2 -translate-x-1/2 -top-8 h-16 w-16 rounded-full bg-amber-400 text-black flex items-center justify-center text-2xl shadow-lg shadow-amber-400/40 active:scale-95"
          >
            📷
          </button>

          <div className="bg-white border-t border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-500">Итого</div>
                <div className="text-lg font-semibold">{total.toFixed(2)} с</div>
              </div>
              <button
                type="button"
                onClick={checkout}
                disabled={cart.length === 0 || submitting}
                className="rounded-full bg-neutral-900 text-white px-6 py-3 text-sm font-medium disabled:opacity-40"
              >
                {submitting ? "Оформляю…" : "Оформить"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
