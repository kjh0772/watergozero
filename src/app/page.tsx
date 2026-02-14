"use client";

/**
 * 메인 페이지: 현재시각, 센서 상태, 물탱크 수위, 펌프/밸브 동작상태
 * 변경: 시니어 친화 큰 글씨 + 반응형 디자인 (모바일 우선)
 */

import { useEffect, useState } from "react";
import type { LiveStatus } from "@/lib/types";

const SENSOR_LABELS: Record<string, string> = {
  temperature: "온도 (°C)",
  humidity: "습도 (%)",
  soil_moisture: "토양함수 (%)",
  soil_temp: "토양온도 (°C)",
};

export default function MainPage() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlMessage, setControlMessage] = useState<string | null>(null);
  const [controlLoading, setControlLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("상태 조회 실패");
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, status?.running ? 1000 : 5000);
    return () => clearInterval(t);
  }, [status?.running]);

  const requestStartOnce = async () => {
    setControlLoading(true);
    setControlMessage(null);
    try {
      const res = await fetch("/api/control/start-once", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "요청 실패");
      setControlMessage(data.message ?? "1회 공급이 요청되었습니다.");
      fetchStatus();
    } catch (e) {
      setControlMessage(e instanceof Error ? e.message : "오류");
    } finally {
      setControlLoading(false);
    }
  };

  const requestStop = async () => {
    setControlLoading(true);
    setControlMessage(null);
    try {
      const res = await fetch("/api/control/stop", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "요청 실패");
      setControlMessage(data.message ?? "공급 정지가 요청되었습니다.");
      fetchStatus();
    } catch (e) {
      setControlMessage(e instanceof Error ? e.message : "오류");
    } finally {
      setControlLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-2xl md:text-xl text-slate-400">로딩 중...</p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-900/20 p-6 text-xl text-red-300">
        {error ?? "데이터 없음"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 md:gap-3">
      {/* 수동 제어 */}
      <section className="card">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-3">
          <h2 className="section-title shrink-0">수동 제어</h2>
          {/* 변경: 모바일 전체 너비 버튼 → md: 인라인 */}
          <div className="flex gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={requestStartOnce}
              disabled={controlLoading}
              className="btn-primary flex-1 md:flex-none disabled:opacity-60"
            >
              1회 공급
            </button>
            <button
              type="button"
              onClick={requestStop}
              disabled={controlLoading}
              className="flex-1 md:flex-none rounded-xl border-2 border-red-600 bg-red-900/40
                         px-6 py-4 text-xl md:px-4 md:py-2.5 md:text-base
                         font-semibold text-red-300 transition
                         hover:bg-red-900/60 active:bg-red-900/80
                         disabled:opacity-60 min-h-[48px] md:min-h-0"
            >
              공급 정지
            </button>
          </div>
          {/* 상태 뱃지들 */}
          <div className="flex flex-wrap items-center gap-3">
            {status.controlPending === "start_once" && (
              <span className="text-xl md:text-base text-amber-400 font-medium">⏳ 대기 중</span>
            )}
            {status.controlPending === "stop" && (
              <span className="text-xl md:text-base text-amber-400 font-medium">⏳ 정지 대기</span>
            )}
            {status.running && status.currentZone != null && (
              <span className="text-xl md:text-base font-semibold text-teal-400">
                🚿 구역 {status.currentZone}
              </span>
            )}
            {controlMessage && (
              <span className="text-lg md:text-base text-teal-400 truncate max-w-full md:max-w-[300px]">
                {controlMessage}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 동작 상태 */}
      <section className="card">
        <div className="flex flex-col gap-4 md:gap-2">
          {/* PLC 연결 + 펌프 */}
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-x-6 md:gap-y-3">
            <div className="flex items-center gap-3 shrink-0">
              <h2 className="section-title">동작</h2>
              <span
                className={`h-5 w-5 md:h-3 md:w-3 rounded-full ${status.plcConnected ? "bg-emerald-500" : "bg-slate-600"}`}
                title={status.plcConnected ? "연결됨" : "연결 안 됨"}
              />
              <span className="text-xl md:text-base text-slate-200">
                {status.plcConnected ? `PLC${status.plcCurrentPort ? ` ${status.plcCurrentPort}` : ""}` : "미연결"}
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xl md:text-base text-slate-400">펌프</span>
              <div className="flex gap-5 md:gap-3">
                <div className="flex items-center gap-2">
                  <span className={`h-5 w-5 md:h-3 md:w-3 rounded-full ${status.pumps.p1 ? "bg-green-500" : "bg-slate-600"}`} />
                  <span className="text-xl md:text-base text-slate-200 font-medium">P1</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-5 w-5 md:h-3 md:w-3 rounded-full ${status.pumps.p2 ? "bg-green-500" : "bg-slate-600"}`} />
                  <span className="text-xl md:text-base text-slate-200 font-medium">P2</span>
                </div>
              </div>
            </div>
          </div>
          {/* 밸브 상태: 모바일 그리드 4열, md: flex wrap */}
          <div>
            <span className="text-xl md:text-base text-slate-400 block mb-2 md:mb-1">밸브</span>
            <div className="grid grid-cols-4 gap-2 md:flex md:flex-wrap md:gap-2">
              {status.valves.map((v, i) => {
                const zoneNum = i + 1;
                const isCurrentZone = status.currentZone === zoneNum;
                const enabled = status.zoneEnabled?.[i] ?? false;
                const remaining =
                  isCurrentZone && status.remainingSeconds != null ? status.remainingSeconds : null;
                const durationSec = status.zoneDurations?.[i] ?? 0;
                const formatSec = (sec: number) =>
                  sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : `${sec}초`;
                const displayStr =
                  remaining != null ? formatSec(remaining) : durationSec > 0 ? formatSec(durationSec) : "—";
                const cellStyle = v
                  ? "bg-teal-600 text-white"
                  : enabled
                    ? "bg-teal-900/90 text-teal-200 border border-teal-700"
                    : "bg-slate-700 text-slate-400";
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center rounded-xl px-2 py-3 md:min-w-[3rem] md:py-2 font-medium ${cellStyle}`}
                  >
                    <span className="text-xl md:text-base">{zoneNum}</span>
                    <span className="text-base md:text-sm opacity-90">{displayStr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 공급 트리거 예약 상태 */}
      {status.triggerSummary != null && (
        <section className="card">
          <h2 className="section-title mb-3 md:mb-2">공급 예약</h2>
          <div className="text-xl md:text-base text-slate-200 flex flex-wrap items-center gap-x-3 gap-y-2">
            {status.triggerSummary.triggerType === "time" && status.triggerSummary.timeSlots?.length ? (
              <>
                <span className="text-slate-400">시간</span>
                <span className="font-mono">{status.triggerSummary.timeSlots.join(", ")}</span>
              </>
            ) : status.triggerSummary.triggerType === "interval" && status.triggerSummary.intervalMinutes != null ? (
              <>
                <span className="text-slate-400">간격</span>
                <span className="font-mono">{status.triggerSummary.intervalMinutes}분</span>
              </>
            ) : (
              <span className="text-slate-500">—</span>
            )}
            <span className="text-slate-500">·</span>
            {status.triggerSummary.mode === "daily" ? (
              <span>매일</span>
            ) : status.triggerSummary.weeklyDays?.length ? (
              <span>
                요일 {[0, 1, 2, 3, 4, 5, 6]
                  .filter((d) => status.triggerSummary?.weeklyDays?.includes(d))
                  .map((d) => "일월화수목금토"[d])
                  .join("")}
              </span>
            ) : (
              <span className="text-slate-500">요일 미설정</span>
            )}
          </div>
          {/* 발동된 트리거 표시 */}
          {status.lastFiredTrigger != null && (
            <div className="mt-3 md:mt-2 flex flex-wrap items-center gap-3">
              <span className="text-lg md:text-sm text-slate-500">발동</span>
              <span
                className={`inline-flex items-center rounded-xl px-4 py-2 md:px-2 md:py-1 text-lg md:text-sm font-medium ${
                  status.lastFiredTrigger.type === "time"
                    ? "bg-amber-900/60 text-amber-300 border border-amber-700/60"
                    : "bg-sky-900/60 text-sky-300 border border-sky-700/60"
                }`}
                title={new Date(status.lastFiredTrigger.at).toLocaleString("ko-KR")}
              >
                {status.lastFiredTrigger.type === "time" ? "시간" : "간격"} {status.lastFiredTrigger.label}
              </span>
              <span className="text-lg md:text-sm text-slate-500">
                {new Date(status.lastFiredTrigger.at).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          )}
        </section>
      )}

      {/* 센서 + 물탱크: 모바일 1열, md: 2열 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-3">
        {/* 센서 상태 */}
        <section className="card">
          <h2 className="section-title mb-3 md:mb-2">센서</h2>
          <div className="grid grid-cols-2 gap-3 md:gap-2">
            {(["temperature", "humidity", "soil_moisture", "soil_temp"] as const).map((key) => (
              <div key={key} className="rounded-xl bg-slate-700/50 px-4 py-4 md:px-3 md:py-2">
                <p className="text-lg md:text-sm text-slate-400">{SENSOR_LABELS[key]}</p>
                <p className="text-3xl md:text-xl font-mono text-slate-100 leading-tight mt-1">
                  {status.sensors[key] != null ? `${status.sensors[key]}` : "—"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 물탱크 수위 */}
        <section className="card">
          <h2 className="section-title mb-3 md:mb-2">물탱크</h2>
          <div className="flex items-baseline gap-4 md:gap-3">
            <span className="text-3xl md:text-xl font-mono text-teal-400">AD {status.tankLevel.ad}</span>
            <span className="text-3xl md:text-xl font-mono text-teal-400">{status.tankLevel.cm} cm</span>
          </div>
          {/* 수위 프로그레스 바: 모바일 더 두껍게 */}
          <div className="relative mt-4 md:mt-2 h-6 md:h-4 w-full overflow-visible">
            <div className="h-5 md:h-3 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-teal-500 transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, (status.tankLevel.cm / 100) * 100))}%`,
                }}
              />
            </div>
            {status.tankPumpLevels && (
              <>
                <span
                  className="absolute top-0 h-6 md:h-4 w-1 md:w-0.5 -translate-x-px bg-amber-500 rounded"
                  style={{ left: `${Math.min(100, Math.max(0, status.tankPumpLevels.start_level_cm))}%` }}
                  title={`가동 ${status.tankPumpLevels.start_level_cm}cm`}
                />
                <span
                  className="absolute top-0 h-6 md:h-4 w-1 md:w-0.5 -translate-x-px bg-red-500 rounded"
                  style={{ left: `${Math.min(100, Math.max(0, status.tankPumpLevels.stop_level_cm))}%` }}
                  title={`정지 ${status.tankPumpLevels.stop_level_cm}cm`}
                />
              </>
            )}
          </div>
          {status.tankPumpLevels && (
            <div className="mt-2 md:mt-1 flex justify-between text-lg md:text-sm text-slate-500">
              <span>가동 {status.tankPumpLevels.start_level_cm}cm</span>
              <span>정지 {status.tankPumpLevels.stop_level_cm}cm</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
