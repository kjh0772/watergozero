import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "관수 시스템",
  description: "심플 관수 제어 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <header className="border-b border-slate-700 bg-slate-800/90">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-teal-400">
              관수 시스템
            </Link>
            <Link href="/" className="text-slate-300 hover:text-white">
              메인
            </Link>
            <Link href="/records" className="text-slate-300 hover:text-white">
              공급 기록
            </Link>
            <Link href="/settings/supply" className="text-slate-300 hover:text-white">
              공급설정
            </Link>
            <Link href="/settings/system" className="text-slate-300 hover:text-white">
              시스템설정
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
