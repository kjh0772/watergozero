import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import NavbarInfo from "./components/NavbarInfo";

export const metadata: Metadata = {
  title: "관수 시스템",
  description: "심플 관수 제어 시스템",
};

// 변경: 모바일 viewport 최적화 (확대 허용, 시니어 접근성)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 3,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      {/* 변경: 반응형 레이아웃, 시니어 친화 큰 글씨 + 큰 터치 영역 */}
      <body className="min-h-screen">
        <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-800/95 backdrop-blur-sm safe-area-top">
          <nav className="mx-auto max-w-5xl px-4 md:px-6 py-3 md:py-2.5">
            {/* 모바일: 2줄 구조 (브랜드+시각 / 메뉴) */}
            <div className="flex items-center justify-between md:hidden">
              <Link href="/" className="text-2xl font-bold text-teal-400 shrink-0">
                💧 관수
              </Link>
              <NavbarInfo />
            </div>
            {/* 네비게이션 메뉴 */}
            <div className="flex items-center gap-1 mt-2 md:mt-0">
              {/* md: 브랜드 (모바일에선 위에 표시) */}
              <Link href="/" className="hidden md:inline text-lg font-bold text-teal-400 shrink-0 mr-3">
                💧 관수
              </Link>
              {/* 변경: 모바일 시니어 기준 큰 터치 영역(min-h 48px) + 큰 텍스트 */}
              <Link
                href="/"
                className="text-xl md:text-base text-slate-300 hover:text-white hover:bg-slate-700/50
                           py-3 px-4 md:py-2 md:px-3 rounded-xl md:rounded-lg
                           font-medium transition min-h-[48px] md:min-h-0
                           flex items-center"
              >
                메인
              </Link>
              <Link
                href="/records"
                className="text-xl md:text-base text-slate-300 hover:text-white hover:bg-slate-700/50
                           py-3 px-4 md:py-2 md:px-3 rounded-xl md:rounded-lg
                           font-medium transition min-h-[48px] md:min-h-0
                           flex items-center"
              >
                기록
              </Link>
              <Link
                href="/settings/supply"
                className="text-xl md:text-base text-slate-300 hover:text-white hover:bg-slate-700/50
                           py-3 px-4 md:py-2 md:px-3 rounded-xl md:rounded-lg
                           font-medium transition min-h-[48px] md:min-h-0
                           flex items-center"
              >
                공급설정
              </Link>
              <Link
                href="/settings/system"
                className="text-xl md:text-base text-slate-300 hover:text-white hover:bg-slate-700/50
                           py-3 px-4 md:py-2 md:px-3 rounded-xl md:rounded-lg
                           font-medium transition min-h-[48px] md:min-h-0
                           flex items-center"
              >
                시스템
              </Link>
              {/* md: NavbarInfo 인라인 */}
              <div className="hidden md:block ml-auto">
                <NavbarInfo />
              </div>
            </div>
          </nav>
        </header>
        {/* 변경: 메인 콘텐츠 영역 모바일 여유 패딩 */}
        <main className="mx-auto max-w-5xl px-4 py-5 md:px-6 md:py-4 min-h-0 pb-8 md:pb-4">
          {children}
        </main>
      </body>
    </html>
  );
}
