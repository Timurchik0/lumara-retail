"use client";

import { useEffect, useRef, useState } from "react";

const SCANNER_ELEMENT_ID = "camera-scanner-viewport";

const RESCAN_COOLDOWN_MS = 1500;

export default function CameraScanner({
  onScan,
  onClose,
  continuous = false,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
  /** Не закрывать сканер после первого кода — для кассы, где сканируют товар за товаром. */
  continuous?: boolean;
}) {
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decodedText) => {
            const now = Date.now();
            const last = lastScanRef.current;
            if (!continuous && last) return;
            if (last && last.code === decodedText && now - last.at < RESCAN_COOLDOWN_MS) {
              return;
            }
            lastScanRef.current = { code: decodedText, at: now };
            onScan(decodedText);
          },
          () => {
            // кадр без кода — это нормально, ничего не делаем
          },
        );
      } catch {
        if (!cancelled) {
          setError(
            "Не получилось включить камеру — разреши доступ к камере в браузере и попробуй снова.",
          );
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => scanner.clear());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4">
        <p className="text-white text-sm">
          {continuous ? "Сканируйте товары один за другим" : "Наведите камеру на штрихкод"}
        </p>
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center"
        >
          ✕
        </button>
      </div>
      <div id={SCANNER_ELEMENT_ID} className="flex-1" />
      {error && (
        <div className="p-4 text-center text-red-400 text-sm">{error}</div>
      )}
    </div>
  );
}
