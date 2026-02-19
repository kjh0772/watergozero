/**
 * Modbus RTU 설정 (MODBUS_GUIDE.md 기준)
 * - 연결 파라미터, 코일/레지스터 주소, Slave ID
 */

/** Baud Rate (고정) */
export const MODBUS_BAUD_RATE = 9600;

/** PLC 통신 타임아웃 (ms) */
export const MODBUS_PLC_TIMEOUT_MS = 2000;

/** 센서 통신 타임아웃 (ms) — sensors/thx */
export const MODBUS_SENSOR_TIMEOUT_MS = 1200;

/** Slave 전환 후 턴어라운드: PLC (ms) */
export const TURNAROUND_PLC_MS = 20;

/** Slave 전환 후 턴어라운드: 센서 (ms) */
export const TURNAROUND_SENSOR_MS = 8;

/** 재연결 시도 간격 (ms) */
export const RECONNECT_INTERVAL_MS = 5000;

/** 기본 포트 목록: Windows COM, Linux tty (첫 항목이 기본 연결값) */
export const DEFAULT_PORTS: string[] =
  typeof process !== "undefined" && process.platform === "win32"
    ? ["COM3", "COM4", "COM5"]
    : ["/dev/ttyUSB0", "/dev/serial1", "/dev/ttyAMA0"];

/** Slave ID: PLC */
export const SLAVE_ID_PLC = 1;

/** Slave ID: 온습도·CO2 센서 */
export const SENSOR_SLAVE_IDS = [2, 3] as const;

// --- 코일 (PLC, Slave 1) ---

/** 코일 읽기: 시작 주소, 길이 (PLC 상태 수신) */
export const COIL_READ_START = 0;
export const COIL_READ_LENGTH = 50;

/** 코일 배열 인덱스 → 용도 (문서화) */
export const COIL_INDEX_RAIN_SENSOR = 0;

/** 코일 쓰기: base 주소, 16개 연속 (1032~1047) */
export const COIL_WRITE_BASE = 1032;
export const COIL_WRITE_LENGTH = 16;

/** 출력 릴레이 (고정): 코일 0=펌프 P1(1032), 1~15=밸브0~14(1033~1047, 구역 1~15) */
export const RELAY_INDEX_P1 = 0;
export const RELAY_INDEX_VALVE_START = 1;
export const RELAY_INDEX_VALVE_END = 15;
/** 코일에 매핑된 구역 밸브 수 */
export const RELAY_VALVE_COUNT = 15;

/** 단일 코일 API: plcAddress = COIL_API_BASE + address */
export const COIL_API_BASE = 1000;

// --- 레지스터 ---

/** PLC Holding Registers: 시작 주소, 길이 */
export const PLC_REGISTER_START = 2000;
export const PLC_REGISTER_LENGTH = 20;

/** 센서: 레지스터 개수 (습도, 온도, CO2) */
export const SENSOR_REGISTER_LENGTH = 3;

/** 센서 레지스터 인덱스 */
export const SENSOR_REG_HUMIDITY = 0;
export const SENSOR_REG_TEMPERATURE = 1;
export const SENSOR_REG_CO2 = 2;
