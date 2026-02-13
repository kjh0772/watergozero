/**
 * 서버 최초 실행 시 실행되는 훅
 * Node 런타임에서 Modbus 자동 연결 시도 (Linux: DB 저장값 또는 /dev/ttyUSB0)
 * - 시작 후 3초 대기 후 연결 (이전 프로세스 포트 해제·udev 안정화)
 * - 포트 잠금 오류 시 2초 대기 후 1회 재시도
 */

const isPortLockError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e);
  return /Cannot lock port|Resource temporarily unavailable|EAGAIN|EBUSY/i.test(msg);
};

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // 공급 트리거 스케줄러 (시간 등록/간격 — 60초마다 조건 확인)
  const { startTriggerScheduler } = await import("@/lib/triggerScheduler");
  startTriggerScheduler();

  if (typeof process !== "undefined" && process.platform !== "linux") return;

  const { MODBUS_BAUD_RATE } = await import("@/lib/modbus/config");
  let port = "/dev/ttyUSB0";
  let baudRate = MODBUS_BAUD_RATE;
  try {
    const { getSystemDb } = await import("@/lib/db");
    const db = getSystemDb();
    const row = db.prepare("SELECT modbus_port, baud_rate FROM plc_settings WHERE id = 1").get() as
      | { modbus_port: string; baud_rate: number }
      | undefined;
    if (row?.modbus_port?.trim()) port = row.modbus_port.trim();
    if (row?.baud_rate && row.baud_rate > 0) baudRate = row.baud_rate;
  } catch {
    // DB 미초기화 시 기본값 유지
  }

  // Linux: 포트가 없으면 자동 연결 스킵 (/dev/serial1 미존재 시)
  if (port.startsWith("/dev/")) {
    const { existsSync } = await import("fs");
    if (!existsSync(port)) {
      console.warn("[Modbus] 자동 연결 스킵 (포트 없음):", port);
      return;
    }
  }

  await new Promise((r) => setTimeout(r, 3000));

  const { initModbus } = await import("@/lib/modbus/client");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await initModbus(port, baudRate);
      console.log("[Modbus] 서버 시작 시 자동 연결:", port);
      return;
    } catch (e) {
      if (attempt === 0 && isPortLockError(e)) {
        console.warn("[Modbus] 포트 잠금, 2초 후 재시도:", port);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      console.warn("[Modbus] 자동 연결 실패 (시스템설정에서 연결 재시도 가능):", port, e instanceof Error ? e.message : e);
      return;
    }
  }
}
