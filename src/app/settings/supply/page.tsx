"use client";

/**
 * 공급설정 - HMI 800x480: 탭(방식/트리거/구역) 분리, 카드 최적화, 스크롤 없음
 */

import { useEffect, useState } from "react";
import type { SupplyMode, SupplyTrigger, ZoneSetting } from "@/lib/types";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
type TabId = "mode" | "trigger" | "zones";

export default function SupplySettingsPage() {
  const [mode, setMode] = useState<SupplyMode | null>(null);
  const [trigger, setTrigger] = useState<SupplyTrigger | null>(null);
  const [zones, setZones] = useState<ZoneSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [timeSlotList, setTimeSlotList] = useState<string[]>([]);
  const [bulkDurationSeconds, setBulkDurationSeconds] = useState<string>("5");
  const [activeTab, setActiveTab] = useState<TabId>("trigger");

  const load = async () => {
    try {
      const res = await fetch("/api/settings/supply");
      if (!res.ok) throw new Error("조회 실패");
      const data = await res.json();
      setMode(data.mode);
      setTrigger(data.trigger);
      setZones(data.zones ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (trigger?.time_slots != null) {
      const parsed =
        typeof trigger.time_slots === "string"
          ? JSON.parse(trigger.time_slots || "[]")
          : trigger.time_slots;
      setTimeSlotList(Array.isArray(parsed) && parsed.length > 0 ? parsed : ["08:00", "18:00"]);
    } else {
      setTimeSlotList(["08:00", "18:00"]);
    }
  }, [trigger?.time_slots]);

  const addTimeSlot = () => setTimeSlotList((prev) => [...prev, "08:00"]);
  const removeTimeSlot = (index: number) =>
    setTimeSlotList((prev) => (prev ?? []).filter((_, i) => i !== index));
  const updateTimeSlot = (index: number, value: string) =>
    setTimeSlotList((prev) => prev.map((v, i) => (i === index ? value : v)));

  const applyBulkDuration = () => {
    const sec = parseInt(bulkDurationSeconds, 10);
    if (Number.isNaN(sec) || sec < 0) return;
    setZones((prev) => prev.map((z) => ({ ...z, duration_seconds: sec })));
  };

  const saveMode = async () => {
    if (!mode) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/supply", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setMessage("공급 모드 저장됨");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "오류");
    } finally {
      setSaving(false);
    }
  };

  const saveTrigger = async () => {
    if (!trigger) return;
    setSaving(true);
    setMessage(null);
    try {
      const timeSlotsJson = JSON.stringify((timeSlotList ?? []).filter(Boolean));
      const res = await fetch("/api/settings/supply", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: { ...trigger, time_slots: timeSlotsJson },
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setMessage("트리거 저장됨");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "오류");
    } finally {
      setSaving(false);
    }
  };

  const saveZones = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const zonesToSave = zones.map((z) => ({ ...z, sort_order: z.zone_id }));
      const res = await fetch("/api/settings/supply", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zones: zonesToSave }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setMessage("구역 설정 저장됨");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "오류");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <p className="text-xs text-slate-400">로딩 중...</p>
      </div>
    );
  }

  // 변경: JSON 파싱 결과가 null/비배열이면 빈 배열로 폴백 (undefined.filter 방지)
  const rawWeekly =
    mode?.weekly_days != null
      ? typeof mode.weekly_days === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(mode.weekly_days || "[]");
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : Array.isArray(mode.weekly_days) ? mode.weekly_days : []
      : [];
  const weeklyDays: number[] = rawWeekly.filter((d) => typeof d === "number");

  // 탭 순서: 트리거 → 구역 → 방식
  const tabs: { id: TabId; label: string }[] = [
    { id: "trigger", label: "트리거" },
    { id: "zones", label: "구역" },
    { id: "mode", label: "방식" },
  ];

  const inputBase = "rounded border border-slate-600 bg-slate-700 text-slate-100 text-xs";

  /* HMI: 뷰포트 높이에 맞춰 스크롤 없이 한 화면 */
  return (
    <div className="flex max-h-[calc(100vh-4rem)] flex-col gap-1">
      {/* 메시지 + 탭 바 */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        {message && (
          <p
            className={`truncate text-[10px] ${
              message.startsWith("저장") ? "text-teal-400" : "text-red-400"
            }`}
          >
            {message}
          </p>
        )}
        <div className="ml-auto flex rounded-lg border border-slate-600 bg-slate-800/80 p-0.5">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
                activeTab === id
                  ? "bg-teal-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 패널: 스크롤 없이 한 화면 */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "mode" && (
          <section className="card flex h-full min-h-0 flex-col gap-3 py-2 px-2">
            <h2 className="text-[10px] font-medium uppercase tracking-wide text-slate-400 shrink-0">
              관수 방식
            </h2>
            <div className="flex shrink-0 items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-4 py-3 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-900/30">
                <input
                  type="radio"
                  name="supplyMode"
                  checked={mode?.mode === "daily"}
                  onChange={() => setMode((m) => (m ? { ...m, mode: "daily" } : null))}
                  className="text-teal-500"
                />
                <span className="text-sm font-medium text-slate-200">매일</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-4 py-3 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-900/30">
                <input
                  type="radio"
                  name="supplyMode"
                  checked={mode?.mode === "weekly"}
                  onChange={() => setMode((m) => (m ? { ...m, mode: "weekly" } : null))}
                  className="text-teal-500"
                />
                <span className="text-sm font-medium text-slate-200">요일별</span>
              </label>
            </div>

            {mode?.mode === "weekly" && (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <p className="text-[10px] text-slate-400 shrink-0">공급 요일 선택</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 flex-1 content-start">
                  {DAY_NAMES.map((name, i) => (
                    <label
                      key={i}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 p-3 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-800/50 has-[:checked]:text-teal-200"
                    >
                      <input
                        type="checkbox"
                        checked={weeklyDays.includes(i)}
                        onChange={() => {
                          const next = weeklyDays.includes(i)
                            ? weeklyDays.filter((d) => d !== i)
                            : [...weeklyDays, i].sort((a, b) => a - b);
                          setMode((m) =>
                            m ? { ...m, weekly_days: JSON.stringify(next) } : null
                          );
                        }}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={saveMode}
              disabled={saving}
              className="btn-primary shrink-0 w-full py-2 text-sm"
            >
              저장
            </button>
          </section>
        )}

        {activeTab === "trigger" && (
          <section className="card flex h-full min-h-0 flex-col gap-2 py-2 px-2">
            <h2 className="text-[10px] font-medium uppercase tracking-wide text-slate-400 shrink-0">
              공급 트리거
            </h2>
            <div className="flex shrink-0 items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 rounded border border-slate-600 px-3 py-2 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-900/30">
                <input
                  type="radio"
                  name="trigger"
                  checked={trigger?.trigger_type === "time"}
                  onChange={() =>
                    setTrigger((t) => (t ? { ...t, trigger_type: "time" } : null))
                  }
                  className="text-teal-500"
                />
                <span className="text-sm text-slate-200">시간 등록</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded border border-slate-600 px-3 py-2 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-900/30">
                <input
                  type="radio"
                  name="trigger"
                  checked={trigger?.trigger_type === "interval"}
                  onChange={() =>
                    setTrigger((t) => (t ? { ...t, trigger_type: "interval" } : null))
                  }
                  className="text-teal-500"
                />
                <span className="text-sm text-slate-200">시간 간격</span>
              </label>
            </div>

            {/* 남는 공간 활용: 시간 슬롯 또는 간격 영역을 넓게 */}
            {trigger?.trigger_type === "time" && (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className="flex flex-1 flex-col gap-2 overflow-auto min-h-0">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {timeSlotList.map((slot, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 p-2"
                      >
                        <input
                          type="time"
                          value={slot}
                          onChange={(e) => updateTimeSlot(index, e.target.value)}
                          className={`${inputBase} min-w-0 flex-1 px-2 py-2 text-sm`}
                        />
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(index)}
                          disabled={timeSlotList.length <= 1}
                          className="shrink-0 rounded border border-slate-600 bg-slate-600 px-2 py-2 text-xs text-slate-300 hover:bg-slate-500 disabled:opacity-40"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addTimeSlot}
                  className="btn-secondary shrink-0 w-full py-2 text-sm"
                >
                  + 시간 추가
                </button>
              </div>
            )}

            {trigger?.trigger_type === "interval" && (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-slate-600 bg-slate-700/30 p-4">
                  <label className="text-sm text-slate-300">간격 (분)</label>
                  <input
                    type="number"
                    min={1}
                    value={trigger?.interval_minutes ?? ""}
                    onChange={(e) =>
                      setTrigger((t) =>
                        t
                          ? {
                              ...t,
                              interval_minutes: e.target.value
                                ? parseInt(e.target.value, 10)
                                : null,
                            }
                          : null
                      )
                    }
                    className={`${inputBase} w-24 px-4 py-3 text-center text-lg font-mono`}
                  />
                  <div className="flex flex-wrap justify-center gap-2">
                    {[30, 60, 120, 180].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() =>
                          setTrigger((t) =>
                            t ? { ...t, interval_minutes: mins } : null
                          )
                        }
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          trigger?.interval_minutes === mins
                            ? "border-teal-500 bg-teal-600 text-white"
                            : "border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
                        }`}
                      >
                        {mins}분
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={saveTrigger}
              disabled={saving}
              className="btn-primary shrink-0 w-full py-2 text-sm"
            >
              저장
            </button>
          </section>
        )}

        {activeTab === "zones" && (
          <section className="card flex h-full flex-col gap-1 py-1.5 px-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400">일괄(초)</span>
              <input
                type="number"
                min={0}
                value={bulkDurationSeconds}
                onChange={(e) => setBulkDurationSeconds(e.target.value)}
                className={`${inputBase} w-14 px-1.5 py-0.5`}
              />
              <button
                type="button"
                onClick={applyBulkDuration}
                className="rounded border border-slate-600 bg-slate-700 px-1.5 py-0.5 text-[10px]"
              >
                일괄
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <table className="w-full table-fixed text-left text-[10px]">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-400">
                    <th className="py-0.5 pr-1">구역</th>
                    <th className="py-0.5 pr-1">이름</th>
                    <th className="py-0.5 pr-1">초</th>
                    <th className="py-0.5">사용</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z.zone_id} className="border-b border-slate-700/50">
                      <td className="py-0.5 pr-1 font-mono">{z.zone_id}</td>
                      <td className="py-0.5 pr-1">
                        <input
                          type="text"
                          value={z.name}
                          onChange={(e) =>
                            setZones((prev) =>
                              prev.map((x) =>
                                x.zone_id === z.zone_id
                                  ? { ...x, name: e.target.value }
                                  : x
                              )
                            )
                          }
                          className={`${inputBase} w-14 px-1 py-0.5`}
                        />
                      </td>
                      <td className="py-0.5 pr-1">
                        <input
                          type="number"
                          min={0}
                          value={z.duration_seconds}
                          onChange={(e) =>
                            setZones((prev) =>
                              prev.map((x) =>
                                x.zone_id === z.zone_id
                                  ? {
                                      ...x,
                                      duration_seconds:
                                        parseInt(e.target.value, 10) || 0,
                                    }
                                  : x
                              )
                            )
                          }
                          className={`${inputBase} w-12 px-1 py-0.5`}
                        />
                      </td>
                      <td className="py-0.5">
                        <input
                          type="checkbox"
                          checked={!!z.enabled}
                          onChange={(e) =>
                            setZones((prev) =>
                              prev.map((x) =>
                                x.zone_id === z.zone_id
                                  ? { ...x, enabled: e.target.checked ? 1 : 0 }
                                  : x
                              )
                            )
                          }
                          className="text-teal-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={saveZones}
              disabled={saving}
              className="btn-primary mt-1 w-fit py-1 px-2 text-xs"
            >
              구역 저장
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
