"use client";

/**
 * 메인 페이지: 현재시각, 센서 상태, 물탱크 수위, 펌프/밸브 동작상태
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
    const t = setInterval(fetchStatus, status?.running ? 1000 : 5000); // 공급 중이면 1초마다
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
        <p className="text-slate-400">로딩 중...</p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-300">
        {error ?? "데이터 없음"}
      </div>
    );
  }

  /* HMI 800x480: 간격·폰트 축소, 센서/물탱크 가로 배치로 한 페이지 수용 */
  return (
    <div className="flex flex-col gap-1.5">
      {/* 수동 제어 */}
      <section className="card py-1.5 px-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-[10px] font-medium uppercase tracking-wide text-slate-400 shrink-0">
            수동 제어
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={requestStartOnce}
              disabled={controlLoading}
              className="btn-primary disabled:opacity-60 py-1 px-2 text-xs"
            >
              1회 공급
            </button>
            <button
              type="button"
              onClick={requestStop}
              disabled={controlLoading}
              className="rounded-md border border-red-600 bg-red-900/40 px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-900/60 disabled:opacity-60"
            >
              공급 정지
            </button>
          </div>
          {status.controlPending === "start_once" && (
            <span className="text-[10px] text-amber-400">대기 중</span>
          )}
          {status.controlPending === "stop" && (
            <span className="text-[10px] text-amber-400">정지 대기</span>
          )}
          {status.running && status.currentZone != null && (
            <span className="text-[10px] font-medium text-teal-400">
              구역 {status.currentZone}
            </span>
          )}
          {controlMessage && (
            <span className="text-[10px] text-teal-400 truncate max-w-[200px]">{controlMessage}</span>
          )}
        </div>
      </section>

      {/* 동작 상태: 1줄=동작/PLC/펌프, 2줄=밸브(줄바꿈) */}
      <section className="card py-1.5 px-2">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5 shrink-0">
              <h2 className="text-[10px] font-medium uppercase text-slate-400 w-14 shrink-0">
                동작
              </h2>
              <span
                className={`h-2 w-2 rounded-full ${status.plcConnected ? "bg-emerald-500" : "bg-slate-600"}`}
                title={status.plcConnected ? "연결됨" : "연결 안 됨"}
              />
              <span className="text-[10px] text-slate-200">
                {status.plcConnected ? `PLC${status.plcCurrentPort ? ` ${status.plcCurrentPort}` : ""}` : "미연결"}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-slate-400">펌프</span>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${status.pumps.p1 ? "bg-green-500" : "bg-slate-600"}`} />
                  <span className="text-[10px] text-slate-200">P1</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${status.pumps.p2 ? "bg-green-500" : "bg-slate-600"}`} />
                  <span className="text-[10px] text-slate-200">P2</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-slate-400 shrink-0">밸브</span>
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
                  className={`flex min-w-[1.75rem] flex-col items-center justify-center rounded px-1 py-0.5 text-[9px] font-medium ${cellStyle}`}
                >
                  <span>{zoneNum}</span>
                  <span className="text-[8px] opacity-90">{displayStr}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 공급 트리거 예약 상태 */}
      {status.triggerSummary != null && (
        <section className="card py-1.5 px-2">
          <h2 className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1">
            공급 예약
          </h2>
          <div className="text-[10px] text-slate-200 flex flex-wrap items-center gap-x-2 gap-y-0.5">
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
          {/* 발동된 트리거 표시: 해당 트리거를 가리킴 */}
          {status.lastFiredTrigger != null && (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[9px] text-slate-500">발동</span>
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium ${
                  status.lastFiredTrigger.type === "time"
                    ? "bg-amber-900/60 text-amber-300 border border-amber-700/60"
                    : "bg-sky-900/60 text-sky-300 border border-sky-700/60"
                }`}
                title={new Date(status.lastFiredTrigger.at).toLocaleString("ko-KR")}
              >
                {status.lastFiredTrigger.type === "time" ? "시간" : "간격"} {status.lastFiredTrigger.label}
              </span>
              <span className="text-[8px] text-slate-500">
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

      {/* 센서 + 물탱크: 800px에서 가로 2열로 세로 절약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {/* 센서 상태 */}
        <section className="card py-1.5 px-2">
          <h2 className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            센서
          </h2>
          <div className="grid grid-cols-4 gap-1">
            {(["temperature", "humidity", "soil_moisture", "soil_temp"] as const).map((key) => (
              <div key={key} className="rounded bg-slate-700/50 px-1.5 py-1">
                <p className="text-[9px] text-slate-400">{SENSOR_LABELS[key]}</p>
                <p className="text-sm font-mono text-slate-100 leading-tight">
                  {status.sensors[key] != null ? `${status.sensors[key]}` : "—"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 물탱크 수위 */}
        <section className="card py-1.5 px-2">
          <h2 className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            물탱크
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-mono text-teal-400">AD {status.tankLevel.ad}</span>
            <span className="text-sm font-mono text-teal-400">{status.tankLevel.cm} cm</span>
          </div>
          <div className="relative mt-1 h-2 w-full overflow-visible">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
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
                  className="absolute top-0 h-2 w-0.5 -translate-x-px bg-amber-500"
                  style={{ left: `${Math.min(100, Math.max(0, status.tankPumpLevels.start_level_cm))}%` }}
                  title={`가동 ${status.tankPumpLevels.start_level_cm}cm`}
                />
                <span
                  className="absolute top-0 h-2 w-0.5 -translate-x-px bg-red-500"
                  style={{ left: `${Math.min(100, Math.max(0, status.tankPumpLevels.stop_level_cm))}%` }}
                  title={`정지 ${status.tankPumpLevels.stop_level_cm}cm`}
                />
              </>
            )}
          </div>
          {status.tankPumpLevels && (
            <div className="mt-0.5 flex justify-between text-[9px] text-slate-500">
              <span>가동 {status.tankPumpLevels.start_level_cm}cm</span>
              <span>정지 {status.tankPumpLevels.stop_level_cm}cm</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
