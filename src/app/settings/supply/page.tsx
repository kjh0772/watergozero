"use client";

/**
 * 설정1: 공급설정 - 관수 방식, 트리거, 구역별 공급 시간
 */

import { useEffect, useState } from "react";
import type { SupplyMode, SupplyTrigger, ZoneSetting } from "@/lib/types";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export default function SupplySettingsPage() {
  const [mode, setMode] = useState<SupplyMode | null>(null);
  const [trigger, setTrigger] = useState<SupplyTrigger | null>(null);
  const [zones, setZones] = useState<ZoneSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // 변경: 시간 슬롯 배열 (추가/삭제 편의)
  const [timeSlotList, setTimeSlotList] = useState<string[]>([]);
  // 변경: 공급시간(초) 일괄 설정용 입력값
  const [bulkDurationSeconds, setBulkDurationSeconds] = useState<string>("300");

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
    setTimeSlotList((prev) => prev.filter((_, i) => i !== index));
  const updateTimeSlot = (index: number, value: string) =>
    setTimeSlotList((prev) => prev.map((v, i) => (i === index ? value : v)));

  /** 공급시간(초) 일괄 적용: 모든 구역에 동일 초 설정 */
  const applyBulkDuration = () => {
    const sec = parseInt(bulkDurationSeconds, 10);
    if (Number.isNaN(sec) || sec < 0) return;
    setZones((prev) =>
      prev.map((z) => ({ ...z, duration_seconds: sec }))
    );
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
      const timeSlotsJson = JSON.stringify(timeSlotList.filter(Boolean));
      const res = await fetch("/api/settings/supply", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: {
            ...trigger,
            time_slots: timeSlotsJson,
          },
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
      // 변경: 순서 없음. 1번부터 순차이므로 sort_order = zone_id 로 전송
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-400">로딩 중...</p>
      </div>
    );
  }

  const weeklyDays: number[] =
    mode?.weekly_days != null
      ? typeof mode.weekly_days === "string"
        ? JSON.parse(mode.weekly_days || "[]")
        : mode.weekly_days
      : [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-100">공급설정</h1>
      {message && (
        <p
          className={
            message.startsWith("저장") ? "text-teal-400" : "text-red-400"
          }
        >
          {message}
        </p>
      )}

      {/* 관수 방식: 요일별 / 매일 */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-200">관수 방식</h2>
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="supplyMode"
              checked={mode?.mode === "daily"}
              onChange={() => setMode((m) => (m ? { ...m, mode: "daily" } : null))}
              className="text-teal-500"
            />
            <span className="text-slate-200">매일</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="supplyMode"
              checked={mode?.mode === "weekly"}
              onChange={() => setMode((m) => (m ? { ...m, mode: "weekly" } : null))}
              className="text-teal-500"
            />
            <span className="text-slate-200">요일별</span>
          </label>
        </div>
        {mode?.mode === "weekly" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {DAY_NAMES.map((name, i) => (
              <label key={i} className="flex items-center gap-1">
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
                  className="text-teal-500"
                />
                <span className="text-slate-300">{name}</span>
              </label>
            ))}
          </div>
        )}
        <button
          onClick={saveMode}
          disabled={saving}
          className="btn-primary mt-4"
        >
          저장
        </button>
      </section>

      {/* 공급 트리거: 시간 등록 / 시간 간격 */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-200">공급 트리거</h2>
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="trigger"
              checked={trigger?.trigger_type === "time"}
              onChange={() =>
                setTrigger((t) => (t ? { ...t, trigger_type: "time" } : null))
              }
              className="text-teal-500"
            />
            <span className="text-slate-200">시간 등록</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="trigger"
              checked={trigger?.trigger_type === "interval"}
              onChange={() =>
                setTrigger((t) => (t ? { ...t, trigger_type: "interval" } : null))
              }
              className="text-teal-500"
            />
            <span className="text-slate-200">시간 간격</span>
          </label>
        </div>
        {trigger?.trigger_type === "time" && (
          <div className="mt-4">
            <p className="mb-2 text-slate-400">시간 슬롯 (추가/삭제)</p>
            <div className="flex flex-col gap-2">
              {timeSlotList.map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={slot}
                    onChange={(e) => updateTimeSlot(index, e.target.value)}
                    className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeTimeSlot(index)}
                    disabled={timeSlotList.length <= 1}
                    className="btn-secondary py-1.5 text-sm disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addTimeSlot}
                className="btn-secondary w-fit text-sm"
              >
                + 시간 추가
              </button>
            </div>
          </div>
        )}
        {trigger?.trigger_type === "interval" && (
          <div className="mt-4">
            <p className="mb-2 text-slate-400">간격 (분)</p>
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
              className="w-32 rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
            />
          </div>
        )}
        <button
          onClick={saveTrigger}
          disabled={saving}
          className="btn-primary mt-4"
        >
          저장
        </button>
      </section>

      {/* 구역별 공급 시간 (1번부터 순차 공급, 순서 설정 없음) */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-200">
          구역별 공급 시간 (1번 → 12번 순차 공급)
        </h2>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-400">공급시간(초) 일괄 설정:</span>
          <input
            type="number"
            min={0}
            value={bulkDurationSeconds}
            onChange={(e) => setBulkDurationSeconds(e.target.value)}
            placeholder="300"
            className="w-24 rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-slate-100"
          />
          <button
            type="button"
            onClick={applyBulkDuration}
            className="btn-secondary py-1.5 text-sm"
          >
            일괄 설정
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400">
                <th className="py-2 pr-4">구역</th>
                <th className="py-2 pr-4">이름</th>
                <th className="py-2 pr-4">공급시간(초)</th>
                <th className="py-2">사용</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.zone_id} className="border-b border-slate-700/50">
                  <td className="py-2 pr-4 font-mono">{z.zone_id}</td>
                  <td className="py-2 pr-4">
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
                      className="w-24 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-slate-100"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="number"
                      min={0}
                      value={z.duration_seconds}
                      onChange={(e) =>
                        setZones((prev) =>
                          prev.map((x) =>
                            x.zone_id === z.zone_id
                              ? { ...x, duration_seconds: parseInt(e.target.value, 10) || 0 }
                              : x
                          )
                        )
                      }
                      className="w-20 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-slate-100"
                    />
                  </td>
                  <td className="py-2">
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
          className="btn-primary mt-4"
        >
          구역 설정 저장
        </button>
      </section>
    </div>
  );
}
