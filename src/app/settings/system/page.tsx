"use client";

/**
 * 설정2: 시스템설정 - PLC 설정 및 정보, 센서 연결 상태
 */

import { useCallback, useEffect, useState } from "react";
import type { PlcSettings, SensorConnection, TankCalibration, TankPumpSettings } from "@/lib/types";

const SENSOR_LABELS: Record<string, string> = {
  temperature: "온도",
  humidity: "습도",
  soil_moisture: "토양함수",
  soil_temp: "토양온도",
  tank_level: "물탱크 수위",
};

export default function SystemSettingsPage() {
  const [plc, setPlc] = useState<PlcSettings | null>(null);
  const [sensors, setSensors] = useState<SensorConnection[]>([]);
  const [tank, setTank] = useState<TankCalibration | null>(null);
  const [tankPump, setTankPump] = useState<TankPumpSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Modbus 연결 상태: 연결 여부, 현재 포트, 선택 가능 포트 목록
  const [modbusConnected, setModbusConnected] = useState(false);
  const [modbusCurrentPort, setModbusCurrentPort] = useState<string | null>(null);
  const [modbusPorts, setModbusPorts] = useState<string[]>([]);
  const [modbusSelectedPort, setModbusSelectedPort] = useState("");
  const [modbusConnecting, setModbusConnecting] = useState(false);

  // Coil Test: 1032~1047 수동 ON/OFF
  const [coilTestCoils, setCoilTestCoils] = useState<boolean[] | null>(null);
  const [coilTestLoading, setCoilTestLoading] = useState(false);
  const [coilTestWriting, setCoilTestWriting] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/settings/system");
      if (!res.ok) throw new Error("조회 실패");
      const data = await res.json();
      setPlc(data.plc);
      setSensors(data.sensors ?? []);
      setTank(data.tank);
      setTankPump(data.tankPump ?? null);
    } finally {
      setLoading(false);
    }
  };

  const loadModbusStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/modbus/status");
      const data = await res.json();
      setModbusConnected(!!data.connected);
      setModbusCurrentPort(data.currentPort ?? null);
      setModbusPorts(Array.isArray(data.ports) ? data.ports : []);
      setModbusSelectedPort((prev) => {
        if (prev) return prev;
        if (data.currentPort) return data.currentPort;
        if (data.ports?.[0]) return data.ports[0];
        return prev;
      });
    } catch {
      setModbusConnected(false);
      setModbusCurrentPort(null);
      setModbusPorts([]);
    }
  }, []);

  const loadCoilTest = useCallback(async () => {
    if (!modbusConnected) {
      setCoilTestCoils(null);
      return;
    }
    setCoilTestLoading(true);
    try {
      const res = await fetch("/api/modbus/coils");
      const data = await res.json();
      if (res.ok && Array.isArray(data.coils)) {
        setCoilTestCoils(data.coils.length >= 16 ? data.coils.slice(0, 16) : [...data.coils, ...Array(16 - data.coils.length).fill(false)]);
      } else {
        setCoilTestCoils(null);
      }
    } catch {
      setCoilTestCoils(null);
    } finally {
      setCoilTestLoading(false);
    }
  }, [modbusConnected]);

  const coilTestToggle = useCallback(
    async (index: number) => {
      if (coilTestCoils == null || coilTestWriting || index < 0 || index >= 16) return;
      const next = [...coilTestCoils];
      next[index] = !next[index];
      setCoilTestWriting(true);
      try {
        const res = await fetch("/api/modbus/coils", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coils: next }),
        });
        if (res.ok) setCoilTestCoils(next);
        else setMessage("코일 쓰기 실패");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "코일 쓰기 실패");
      } finally {
        setCoilTestWriting(false);
      }
    },
    [coilTestCoils, coilTestWriting]
  );

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!loading) loadModbusStatus();
  }, [loading, loadModbusStatus]);

  useEffect(() => {
    if (modbusConnected) loadCoilTest();
    else setCoilTestCoils(null);
  }, [modbusConnected, loadCoilTest]);

  // PLC 설정 로드 시 선택 포트 초기화 (저장된 modbus_port 반영)
  useEffect(() => {
    if (plc?.modbus_port && !modbusSelectedPort) setModbusSelectedPort(plc.modbus_port);
  }, [plc?.modbus_port, modbusSelectedPort]);

  const modbusRetry = async () => {
    const port = modbusSelectedPort || plc?.modbus_port || modbusPorts[0];
    if (!port) {
      setMessage("연결할 포트를 선택해 주세요.");
      return;
    }
    setModbusConnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/modbus/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port, baudRate: plc?.baud_rate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "연결 실패");
      setMessage("Modbus 연결됨: " + port);
      await loadModbusStatus();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "연결 실패");
      await loadModbusStatus();
    } finally {
      setModbusConnecting(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plc, sensors, tank, tankPump }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setMessage("시스템 설정 저장됨");
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-100">시스템설정</h1>
      {message && (
        <p
          className={
            message.startsWith("저장") || message.startsWith("Modbus")
              ? "text-teal-400"
              : "text-red-400"
          }
        >
          {message}
        </p>
      )}

      {/* Modbus 연결 상태 */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-200">Modbus 연결 상태</h2>
        <div className="mb-4 flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              modbusConnected ? "bg-emerald-500" : "bg-slate-500"
            }`}
            title={modbusConnected ? "연결됨" : "연결 안 됨"}
          />
          <span className="text-slate-300">
            {modbusConnected
              ? `연결됨 (${modbusCurrentPort ?? ""})`
              : "연결 안 됨"}
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-400">포트 선택</label>
            <select
              value={modbusSelectedPort}
              onChange={(e) => setModbusSelectedPort(e.target.value)}
              className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 min-w-[140px]"
            >
              {modbusPorts.length === 0 ? (
                <option value="">포트 없음</option>
              ) : (
                modbusPorts.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="button"
            onClick={modbusRetry}
            disabled={modbusConnecting || !modbusSelectedPort}
            className="btn-primary"
          >
            {modbusConnecting ? "연결 중…" : "연결 재시도"}
          </button>
        </div>

        {/* Coil Test: 1032~1047 수동 ON/OFF */}
        {modbusConnected && (
          <div className="mt-4 border-t border-slate-600 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">Coil Test (1032~1047)</h3>
              <button
                type="button"
                onClick={loadCoilTest}
                disabled={coilTestLoading}
                className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600 disabled:opacity-50"
              >
                {coilTestLoading ? "읽는 중…" : "새로고침"}
              </button>
            </div>
            {coilTestLoading && coilTestCoils == null ? (
              <p className="text-xs text-slate-500">코일 상태 읽는 중…</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                {Array.from({ length: 16 }, (_, i) => {
                  const addr = 1032 + i;
                  const on = coilTestCoils?.[i] ?? false;
                  return (
                    <button
                      key={addr}
                      type="button"
                      onClick={() => coilTestToggle(i)}
                      disabled={coilTestWriting}
                      title={`${addr} ${on ? "ON" : "OFF"}`}
                      className={`rounded px-2 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                        on
                          ? "bg-teal-600 text-white hover:bg-teal-500"
                          : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                      }`}
                    >
                      {addr}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* PLC 설정 및 정보 */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-200">
          PLC 설정 및 정보 (Modbus RS485)
        </h2>
        {plc && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-400">이름</label>
              <input
                type="text"
                value={plc.name}
                onChange={(e) => setPlc((p) => (p ? { ...p, name: e.target.value } : null))}
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Modbus 포트</label>
              <input
                type="text"
                value={plc.modbus_port}
                onChange={(e) =>
                  setPlc((p) => (p ? { ...p, modbus_port: e.target.value } : null))
                }
                placeholder="/dev/ttyUSB0"
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Baud rate</label>
              <input
                type="number"
                value={plc.baud_rate}
                onChange={(e) =>
                  setPlc((p) => (p ? { ...p, baud_rate: parseInt(e.target.value, 10) || 9600 } : null))
                }
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Slave ID</label>
              <input
                type="number"
                value={plc.slave_id}
                onChange={(e) =>
                  setPlc((p) => (p ? { ...p, slave_id: parseInt(e.target.value, 10) || 1 } : null))
                }
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">릴레이 개수</label>
              <input
                type="number"
                min={1}
                max={32}
                value={plc.relay_count}
                onChange={(e) =>
                  setPlc((p) =>
                    p ? { ...p, relay_count: parseInt(e.target.value, 10) || 16 } : null
                  )
                }
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
              />
            </div>
          </div>
        )}
      </section>

      {/* 센서 연결 상태 */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-200">센서 연결 상태</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400">
                <th className="py-2 pr-4">센서</th>
                <th className="py-2 pr-4">주소/채널</th>
                <th className="py-2">연결</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((s) => (
                <tr key={s.sensor_type} className="border-b border-slate-700/50">
                  <td className="py-2 pr-4 text-slate-200">
                    {SENSOR_LABELS[s.sensor_type] ?? s.sensor_type}
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="text"
                      value={s.address}
                      onChange={(e) =>
                        setSensors((prev) =>
                          prev.map((x) =>
                            x.sensor_type === s.sensor_type
                              ? { ...x, address: e.target.value }
                              : x
                          )
                        )
                      }
                      placeholder="주소 또는 채널"
                      className="w-40 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-slate-100"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={!!s.enabled}
                      onChange={(e) =>
                        setSensors((prev) =>
                          prev.map((x) =>
                            x.sensor_type === s.sensor_type
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
      </section>

      {/* 지하수 펌프(P1) 물탱크 수위 기준 가동/정지 */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-200">
          지하수 펌프 (물탱크 수위)
        </h2>
        <p className="mb-3 text-sm text-slate-400">
          P1 지하수펌프는 물탱크 수위에 따라 자동 가동/정지 (가동 수위 이하에서 가동, 정지 수위 이상에서 정지)
        </p>
        {tankPump && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-400">가동 수위 (cm)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={tankPump.start_level_cm}
                onChange={(e) =>
                  setTankPump((p) =>
                    p ? { ...p, start_level_cm: parseFloat(e.target.value) || 0 } : null
                  )
                }
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
              />
              <p className="mt-1 text-xs text-slate-500">수위가 이 값 이하로 내려가면 펌프 가동</p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">정지 수위 (cm)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={tankPump.stop_level_cm}
                onChange={(e) =>
                  setTankPump((p) =>
                    p ? { ...p, stop_level_cm: parseFloat(e.target.value) || 0 } : null
                  )
                }
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
              />
              <p className="mt-1 text-xs text-slate-500">수위가 이 값 이상이면 펌프 정지</p>
            </div>
          </div>
        )}
      </section>

      {/* 물탱크 AD–cm 캘리브레이션 */}
      <section className="card">
        <h2 className="mb-4 text-lg font-medium text-slate-200">
          물탱크 수위 캘리브레이션 (AD → cm)
        </h2>
        {tank && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-400">AD 최소</label>
              <input
                type="number"
                value={tank.ad_min}
                onChange={(e) =>
                  setTank((t) =>
                    t ? { ...t, ad_min: parseFloat(e.target.value) || 0 } : null
                  )
                }
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">AD 최대</label>
              <input
                type="number"
                value={tank.ad_max}
                onChange={(e) =>
                  setTank((t) =>
                    t ? { ...t, ad_max: parseFloat(e.target.value) || 1023 } : null
                  )
                }
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">cm 최소</label>
              <input
                type="number"
                value={tank.cm_min}
                onChange={(e) =>
                  setTank((t) =>
                    t ? { ...t, cm_min: parseFloat(e.target.value) || 0 } : null
                  )
                }
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">cm 최대</label>
              <input
                type="number"
                value={tank.cm_max}
                onChange={(e) =>
                  setTank((t) =>
                    t ? { ...t, cm_max: parseFloat(e.target.value) || 100 } : null
                  )
                }
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
              />
            </div>
          </div>
        )}
      </section>

      <button onClick={saveAll} disabled={saving} className="btn-primary">
        전체 저장
      </button>
    </div>
  );
}
