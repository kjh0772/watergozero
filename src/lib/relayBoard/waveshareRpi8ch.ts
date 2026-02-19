/**
 * Waveshare RPi Relay Board (B) 8ch — GPIO 제어 (Linux sysfs 전용, 네이티브 모듈 없음)
 * 참조: https://www.waveshare.com/wiki/RPi_Relay_Board_(B)#WiringPi
 *
 * 채널–BCM 핀: Ch1=5, Ch2=6, Ch3=13, Ch4=16, Ch5=19, Ch6=20, Ch7=21, Ch8=26
 * 릴레이는 Low 레벨 동작: 출력 0 = 릴레이 ON, 출력 1 = OFF
 *
 * Modbus 코일 매핑: 1032(인덱스0)=Ch1(펌프), 1033~1039(인덱스1~7)=Ch2~Ch8(밸브0~6)
 */

import * as fs from "fs";
import * as path from "path";

const BCM_PINS_CH1_TO_CH8 = [5, 6, 13, 16, 19, 20, 21, 26] as const;
const RELAY_CHANNELS = 8;
const SYSFS_GPIO = "/sys/class/gpio";

let valuePaths: string[] | null = null;
let initError: Error | null = null;

function isLinux(): boolean {
  return typeof process !== "undefined" && process.platform === "linux";
}

/**
 * sysfs로 GPIO export 후 value 경로 저장 (Linux에서만, 최초 1회)
 */
function ensureInit(): boolean {
  if (!isLinux()) return false;
  if (initError) return false;
  if (valuePaths) return true;
  try {
    if (!fs.existsSync(SYSFS_GPIO)) {
      initError = new Error("sysfs GPIO not found");
      return false;
    }
    const paths: string[] = [];
    for (const bcm of BCM_PINS_CH1_TO_CH8) {
      const exportPath = path.join(SYSFS_GPIO, "export");
      const gpioDir = path.join(SYSFS_GPIO, `gpio${bcm}`);
      const valuePath = path.join(gpioDir, "value");
      const directionPath = path.join(gpioDir, "direction");

      if (!fs.existsSync(gpioDir)) {
        try {
          fs.writeFileSync(exportPath, String(bcm), "utf8");
        } catch (e) {
          // 이미 export된 경우 무시
        }
      }
      if (fs.existsSync(directionPath)) {
        try {
          fs.writeFileSync(directionPath, "out", "utf8");
        } catch (_) {
          // ignore
        }
      }
      if (fs.existsSync(valuePath)) paths.push(valuePath);
    }
    if (paths.length === RELAY_CHANNELS) {
      valuePaths = paths;
      return true;
    }
    initError = new Error(`GPIO init: only ${paths.length}/${RELAY_CHANNELS} pins ready`);
    return false;
  } catch (e) {
    initError = e instanceof Error ? e : new Error(String(e));
    console.warn("relayBoard waveshare 8ch: GPIO init skipped", initError?.message);
    return false;
  }
}

/**
 * true=ON일 때 GPIO 출력 (보드에 따라 반전 필요 시 RELAY_ACTIVE_LOW 변경)
 * Waveshare (B): Low=ON → true면 "0". 일부 보드는 High=ON → true면 "1"로 바꿔야 함.
 */
const RELAY_ACTIVE_LOW = process.env.RELAY_ACTIVE_LOW !== "0";

/**
 * 코일 상태 8개를 릴레이 보드 Ch1~Ch8에 출력.
 * RELAY_ACTIVE_LOW=true(기본): true=ON → GPIO 0 (Waveshare 등)
 * RELAY_ACTIVE_LOW=false: true=ON → GPIO 1 (High=ON 보드)
 * @param coils 최소 8개. 인덱스 0~7이 Ch1~Ch8에 대응 (1032~1039)
 */
export function writeRelayBoard(coils: boolean[]): void {
  if (!ensureInit() || !valuePaths) return;
  for (let i = 0; i < RELAY_CHANNELS && i < coils.length; i++) {
    try {
      const on = coils[i];
      const v = RELAY_ACTIVE_LOW ? (on ? "0" : "1") : (on ? "1" : "0");
      fs.writeFileSync(valuePaths[i], v, "utf8");
    } catch (e) {
      console.warn("relayBoard write channel", i + 1, e);
    }
  }
}

/**
 * 릴레이 보드 사용 가능 여부 (Linux + sysfs GPIO 정상 초기화)
 */
export function isRelayBoardAvailable(): boolean {
  return isLinux() && ensureInit() && valuePaths !== null;
}

/**
 * GPIO unexport (프로세스 종료 시 호출 권장). root가 아닐 수 있어 실패할 수 있음.
 */
export function unexportRelayBoard(): void {
  if (!isLinux() || !valuePaths) return;
  try {
    const unexportPath = path.join(SYSFS_GPIO, "unexport");
    for (const bcm of BCM_PINS_CH1_TO_CH8) {
      try {
        fs.writeFileSync(unexportPath, String(bcm), "utf8");
      } catch (_) {
        // ignore
      }
    }
  } catch (_) {
    // ignore
  }
  valuePaths = null;
}
