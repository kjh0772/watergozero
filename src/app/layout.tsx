import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import NavbarInfo from "./components/NavbarInfo";

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
          <nav className="mx-auto flex max-w-[800px] items-center gap-2 px-2 py-1.5">
            <Link href="/" className="text-xs font-semibold text-teal-400 shrink-0">
              관수
            </Link>
            <Link href="/" className="text-[11px] text-slate-300 hover:text-white">
              메인
            </Link>
            <Link href="/records" className="text-[11px] text-slate-300 hover:text-white">
              기록
            </Link>
            <Link href="/settings/supply" className="text-[11px] text-slate-300 hover:text-white">
              공급설정
            </Link>
            <Link href="/settings/system" className="text-[11px] text-slate-300 hover:text-white">
              시스템
            </Link>
            <NavbarInfo />
          </nav>
        </header>
        <main className="mx-auto max-w-[800px] px-2 py-2 min-h-0">{children}</main>
      </body>
    </html>
  );
}
