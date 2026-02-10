"use client";

/**
 * navbar용 현재시각·버전 간략 표기 (클라이언트 전용)
 */

import { useEffect, useState } from "react";

export default function NavbarInfo() {
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status");
        if (!res.ok) return;
        const data = await res.json();
        setCurrentTime(data.currentTime ?? null);
        setVersion(data.version ?? null);
      } catch {
        // 무시
      }
    };

    fetchStatus();
    const t = setInterval(fetchStatus, 1000); // 1초마다 시각 갱신
    return () => clearInterval(t);
  }, []);

  const timeStr =
    currentTime != null
      ? new Date(currentTime).toLocaleString("ko-KR", {
          dateStyle: "short",
          timeStyle: "medium",
        })
      : null;

  return (
    <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-400">
      {timeStr != null && (
        <span className="font-mono tabular-nums" title="현재 시각">
          {timeStr}
        </span>
      )}
      {version != null && (
        <span className="text-slate-500" title="앱 버전">
          v{version}
        </span>
      )}
    </div>
  );
}
