"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-neutral-900 text-white px-5 py-2 text-sm font-medium print:hidden"
    >
      🖨 Печать
    </button>
  );
}
