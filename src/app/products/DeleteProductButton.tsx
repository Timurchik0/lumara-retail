"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProductInlineAction } from "./actions";

export default function DeleteProductButton({
  productId,
  productName,
  onDeleted,
}: {
  productId: string;
  productName: string;
  /** Клиентские панели со своим списком в стейте (split-view) чистят его
   * сами; без колбэка просто уходим на /products. */
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const ok = confirm(
          `Удалить карточку «${productName}» насовсем? Отменить нельзя.`,
        );
        if (!ok) return;
        startTransition(async () => {
          try {
            await deleteProductInlineAction(productId);
            if (onDeleted) onDeleted();
            else router.push("/products");
          } catch {
            alert("Не получилось удалить — возможно, по этому товару уже были продажи.");
          }
        });
      }}
      className="text-sm text-red-600 disabled:opacity-50"
    >
      🗑 {pending ? "Удаляю…" : "Удалить карточку"}
    </button>
  );
}
