/**
 * Modbus RTU 클라이언트 (MODBUS_GUIDE.md 기준)
 * - connectRTUBuffered, setID, 턴어라운드, readCoils/readRegisters/writeCoils
 */

import ModbusRTU from "modbus-serial";
import {
  MODBUS_BAUD_RATE,
  MODBUS_PLC_TIMEOUT_MS,
  TURNAROUND_PLC_MS,
  TURNAROUND_SENSOR_MS,
} from "./config";

let client: ModbusRTU | null = null;
let currentPort: string | null = null;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 현재 연결된 포트 (없으면 null) */
export function getCurrentPort(): string | null {
  return currentPort;
}

/** 연결 여부 */
export function isConnected(): boolean {
  return client != null && (client as unknown as { isOpen?: boolean }).isOpen !== false;
}

/**
 * Modbus RTU 연결 초기화
 * @param port 시리얼 포트 (예: COM3, /dev/ttyUSB0)
 * @param baudRate 기본 9600
 * 변경: 기존 연결을 완전히 닫은 뒤 새 연결 시도 (close 콜백 대기 → 포트 잠금 방지)
 */
export function initModbus(port: string, baudRate: number = MODBUS_BAUD_RATE): Promise<void> {
  const closeExisting = (): Promise<void> =>
    new Promise((done) => {
      if (!client) {
        done();
        return;
      }
      try {
        (client as ModbusRTU & { close: (cb: () => void) => void }).close(() => {
          client = null;
          currentPort = null;
          done();
        });
      } catch {
        client = null;
        currentPort = null;
        done();
      }
    });

  return closeExisting()
    .then(() => delay(400))
    .then(
      () =>
        new Promise((resolve, reject) => {
          const c = new ModbusRTU();
          c.setTimeout(MODBUS_PLC_TIMEOUT_MS);
          c.connectRTUBuffered(port, { baudRate }, (err: Error | null) => {
            if (err) {
              currentPort = null;
              reject(err);
              return;
            }
            client = c;
            currentPort = port;
            resolve();
          });
        })
    );
}

/** 연결 해제 */
export function closeModbus(): Promise<void> {
  return new Promise((resolve) => {
    if (!client) {
      resolve();
      return;
    }
    try {
      (client as ModbusRTU & { close: (cb: () => void) => void }).close(() => {
        client = null;
        currentPort = null;
        resolve();
      });
    } catch {
      client = null;
      currentPort = null;
      resolve();
    }
  });
}

/** Slave ID 설정 후 턴어라운드 (PLC용 20ms) */
export async function setIDAndTurnaround(slaveId: number, forSensor = false): Promise<void> {
  if (!client) throw new Error("Modbus not connected");
  client.setID(slaveId);
  await delay(forSensor ? TURNAROUND_SENSOR_MS : TURNAROUND_PLC_MS);
}

/** 내부 클라이언트 반환 (연결됐을 때만) */
export function getClient(): ModbusRTU | null {
  return client;
}

/**
 * 코일 읽기 (FC1)
 * @returns boolean[] (인덱스 = 코일 주소 오프셋)
 */
export async function readCoils(
  startAddress: number,
  length: number,
  slaveId: number,
  options?: { timeoutMs?: number; turnAroundMs?: number }
): Promise<boolean[]> {
  const c = getClient();
  if (!c) throw new Error("Modbus not connected");
  await setIDAndTurnaround(slaveId, false);
  if (options?.timeoutMs != null) c.setTimeout(options.timeoutMs);
  const res = await c.readCoils(startAddress, length);
  const arr = (res as { data?: boolean[] }).data ?? (res as unknown as boolean[]);
  return Array.isArray(arr) ? arr : [];
}

/**
 * Holding 레지스터 읽기 (FC3)
 */
export async function readHoldingRegisters(
  startAddress: number,
  length: number,
  slaveId: number,
  options?: { timeoutMs?: number }
): Promise<number[]> {
  const c = getClient();
  if (!c) throw new Error("Modbus not connected");
  await setIDAndTurnaround(slaveId, false);
  if (options?.timeoutMs != null) c.setTimeout(options.timeoutMs);
  const res = await c.readHoldingRegisters(startAddress, length);
  const arr = (res as { data?: number[] }).data ?? (res as unknown as number[]);
  return Array.isArray(arr) ? arr : [];
}

/**
 * Input 레지스터 읽기 (FC4)
 */
export async function readInputRegisters(
  startAddress: number,
  length: number,
  slaveId: number,
  options?: { timeoutMs?: number }
): Promise<number[]> {
  const c = getClient();
  if (!c) throw new Error("Modbus not connected");
  await setIDAndTurnaround(slaveId, true);
  if (options?.timeoutMs != null) c.setTimeout(options.timeoutMs);
  const res = await c.readInputRegisters(startAddress, length);
  const arr = (res as { data?: number[] }).data ?? (res as unknown as number[]);
  return Array.isArray(arr) ? arr : [];
}

/**
 * 코일 연속 쓰기 (FC15)
 * @param startAddress 시작 주소
 * @param values boolean[] (최대 16개 등)
 */
export async function writeCoils(
  startAddress: number,
  values: boolean[],
  slaveId: number
): Promise<void> {
  const c = getClient();
  if (!c) throw new Error("Modbus not connected");
  await setIDAndTurnaround(slaveId, false);
  await c.writeCoils(startAddress, values);
}
