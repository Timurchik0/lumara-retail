import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Люмара Розница",
  description: "Учёт склада и продаж — женская обувь",
};

const navItems = [
  { href: "/", label: "Главная", icon: "🏠" },
  { href: "/products", label: "Товары", icon: "👟" },
  { href: "/receive", label: "Приёмка", icon: "📥" },
  { href: "/kassa", label: "Касса", icon: "🧾" },
  { href: "/locations", label: "Склады", icon: "📦" },
  { href: "/history", label: "История", icon: "📜" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="hidden md:flex items-center gap-6 border-b border-neutral-200 bg-white px-6 py-3">
          <span className="font-semibold">
            <span className="text-amber-500">Люмара</span> Розница
          </span>
          <nav className="flex gap-4 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-neutral-600 hover:text-neutral-900"
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 pb-20 md:pb-6">{children}</main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex border-t border-neutral-200 bg-white">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] text-neutral-600"
            >
              <span className="text-xl leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}
