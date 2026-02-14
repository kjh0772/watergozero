"use client";

/**
 * 공급설정 - 시니어 친화 큰 글씨 + 반응형 디자인 (모바일 우선)
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
      setMessage("저장됨: 공급 모드");
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
      setMessage("저장됨: 트리거");
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
      setMessage("저장됨: 구역 설정");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "오류");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <p className="text-2xl md:text-xl text-slate-400">로딩 중...</p>
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

  return (
    <div className="flex flex-col gap-5 md:gap-3">
      {/* 메시지 + 탭 바 */}
      <div className="flex flex-col gap-3">
        {message && (
          <p
            className={`text-xl md:text-base font-medium ${
              message.startsWith("저장") ? "text-teal-400" : "text-red-400"
            }`}
          >
            {message}
          </p>
        )}
        {/* 변경: 모바일 시니어 기준 큰 탭 버튼 — 전체 너비 */}
        <div className="flex rounded-xl border border-slate-600 bg-slate-800/80 p-1.5 md:p-1 md:w-fit md:ml-auto">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex-1 md:flex-none rounded-xl px-5 py-3.5 text-xl md:px-4 md:py-2 md:text-base
                         font-semibold transition min-h-[48px] md:min-h-0
                         flex items-center justify-center ${
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

      {/* 탭 패널 */}
      <div className="min-h-0 flex-1">
        {activeTab === "mode" && (
          <section className="card flex flex-col gap-5 md:gap-4">
            <h2 className="section-title">관수 방식</h2>
            {/* 변경: 시니어 기준 큰 라디오 버튼 + 넓은 터치 영역 */}
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
              <label className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-slate-600 px-6 py-5 md:px-5 md:py-4 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-900/30 transition min-h-[56px] md:min-h-0">
                <input
                  type="radio"
                  name="supplyMode"
                  checked={mode?.mode === "daily"}
                  onChange={() => setMode((m) => (m ? { ...m, mode: "daily" } : null))}
                  className="radio-senior"
                />
                <span className="text-xl md:text-lg font-semibold text-slate-200">매일</span>
              </label>
              <label className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-slate-600 px-6 py-5 md:px-5 md:py-4 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-900/30 transition min-h-[56px] md:min-h-0">
                <input
                  type="radio"
                  name="supplyMode"
                  checked={mode?.mode === "weekly"}
                  onChange={() => setMode((m) => (m ? { ...m, mode: "weekly" } : null))}
                  className="radio-senior"
                />
                <span className="text-xl md:text-lg font-semibold text-slate-200">요일별</span>
              </label>
            </div>

            {mode?.mode === "weekly" && (
              <div className="flex flex-col gap-3">
                <p className="text-xl md:text-base text-slate-400">공급 요일 선택</p>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
                  {DAY_NAMES.map((name, i) => (
                    <label
                      key={i}
                      className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-slate-600 bg-slate-700/50
                                 p-4 md:p-3 min-h-[56px] md:min-h-0
                                 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-800/50 has-[:checked]:text-teal-200 transition"
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
                      <span className="text-xl md:text-lg font-semibold">{name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={saveMode}
              disabled={saving}
              className="btn-primary w-full"
            >
              저장
            </button>
          </section>
        )}

        {activeTab === "trigger" && (
          <section className="card flex flex-col gap-5 md:gap-3">
            <h2 className="section-title">공급 트리거</h2>
            {/* 변경: 시니어 기준 큰 라디오 버튼 */}
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
              <label className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-slate-600 px-6 py-5 md:px-5 md:py-4 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-900/30 transition min-h-[56px] md:min-h-0">
                <input
                  type="radio"
                  name="trigger"
                  checked={trigger?.trigger_type === "time"}
                  onChange={() =>
                    setTrigger((t) => (t ? { ...t, trigger_type: "time" } : null))
                  }
                  className="radio-senior"
                />
                <span className="text-xl md:text-lg text-slate-200 font-semibold">시간 등록</span>
              </label>
              <label className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-slate-600 px-6 py-5 md:px-5 md:py-4 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-900/30 transition min-h-[56px] md:min-h-0">
                <input
                  type="radio"
                  name="trigger"
                  checked={trigger?.trigger_type === "interval"}
                  onChange={() =>
                    setTrigger((t) => (t ? { ...t, trigger_type: "interval" } : null))
                  }
                  className="radio-senior"
                />
                <span className="text-xl md:text-lg text-slate-200 font-semibold">시간 간격</span>
              </label>
            </div>

            {trigger?.trigger_type === "time" && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {timeSlotList.map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-xl border border-slate-600 bg-slate-700/50 p-4 md:p-3"
                    >
                      <input
                        type="time"
                        value={slot}
                        onChange={(e) => updateTimeSlot(index, e.target.value)}
                        className="input-field min-w-0 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(index)}
                        disabled={timeSlotList.length <= 1}
                        className="shrink-0 rounded-xl border border-slate-600 bg-slate-600
                                   px-4 py-4 md:px-3 md:py-2.5 text-xl md:text-base
                                   text-slate-300 hover:bg-slate-500
                                   disabled:opacity-40 transition
                                   min-h-[48px] md:min-h-0"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addTimeSlot}
                  className="btn-secondary w-full"
                >
                  + 시간 추가
                </button>
              </div>
            )}

            {trigger?.trigger_type === "interval" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-slate-600 bg-slate-700/30 p-6 md:p-5">
                  <label className="text-xl md:text-lg text-slate-300 font-medium">간격 (분)</label>
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
                    className="input-field w-36 md:w-32 text-center text-3xl md:text-xl font-mono"
                  />
                  <div className="flex flex-wrap justify-center gap-3">
                    {[30, 60, 120, 180].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() =>
                          setTrigger((t) =>
                            t ? { ...t, interval_minutes: mins } : null
                          )
                        }
                        className={`rounded-xl border-2 px-6 py-4 text-xl md:px-4 md:py-2.5 md:text-lg
                                   font-semibold transition min-h-[48px] md:min-h-0 ${
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
              className="btn-primary w-full"
            >
              저장
            </button>
          </section>
        )}

        {activeTab === "zones" && (
          <section className="card flex flex-col gap-5 md:gap-3">
            {/* 일괄 설정 */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xl md:text-base text-slate-400 font-medium">일괄(초)</span>
              <input
                type="number"
                min={0}
                value={bulkDurationSeconds}
                onChange={(e) => setBulkDurationSeconds(e.target.value)}
                className="input-field w-28 md:w-20"
              />
              <button
                type="button"
                onClick={applyBulkDuration}
                className="rounded-xl border border-slate-600 bg-slate-700
                           px-5 py-4 md:px-3 md:py-2.5 text-xl md:text-base
                           font-medium hover:bg-slate-600 transition
                           min-h-[48px] md:min-h-0"
              >
                일괄 적용
              </button>
            </div>

            {/* 모바일: 카드 리스트 (시니어 친화) */}
            <div className="flex flex-col gap-4 md:hidden">
              {zones.map((z) => (
                <div key={z.zone_id} className="rounded-xl border border-slate-700 bg-slate-700/30 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-mono font-bold text-slate-200">구역 {z.zone_id}</span>
                    <label className="flex items-center gap-3">
                      <span className="text-xl text-slate-400">사용</span>
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
                        className="checkbox-senior"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-text">이름</label>
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
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label-text">초</label>
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
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* md+: 테이블 (데스크톱 일반 크기) */}
            <div className="hidden md:block overflow-hidden">
              <table className="w-full table-fixed text-left text-base">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-400">
                    <th className="py-3 pr-2 font-semibold">구역</th>
                    <th className="py-3 pr-2 font-semibold">이름</th>
                    <th className="py-3 pr-2 font-semibold">초</th>
                    <th className="py-3 font-semibold">사용</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z.zone_id} className="border-b border-slate-700/50">
                      <td className="py-2.5 pr-2 font-mono text-lg">{z.zone_id}</td>
                      <td className="py-2.5 pr-2">
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
                          className="rounded-lg border border-slate-600 bg-slate-700 text-slate-100 text-base w-24 px-2 py-1.5"
                        />
                      </td>
                      <td className="py-2.5 pr-2">
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
                          className="rounded-lg border border-slate-600 bg-slate-700 text-slate-100 text-base w-20 px-2 py-1.5"
                        />
                      </td>
                      <td className="py-2.5">
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
                          className="text-teal-500 h-5 w-5"
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
              className="btn-primary w-full md:w-auto"
            >
              구역 저장
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
