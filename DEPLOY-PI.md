# 라즈베리파이 배포 가이드 (Raspberry Pi)

`better-sqlite3`는 **네이티브 모듈**이라 **반드시 라즈베리파이(linux arm64) 위에서** `npm install`과 `npm run build`를 실행해야 합니다.  
Windows/Mac에서 만든 `node_modules`나 `.next`를 Pi로 복사하면 `No native build was found for platform=linux arch=arm64` 오류가 납니다.

## 요구 사항

- Raspberry Pi (arm64 권장)
- Node.js **20.x** (Next.js 15 요구: `^18.18.0 || ^19.8.0 || >= 20.0.0`)

## 1. Node.js 20 설치 (Pi에서)

```bash
# NodeSource 저장소로 Node 20 설치 (Raspberry Pi OS / Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 확인
node -v   # v20.x.x
npm -v
```

## 2. 프로젝트 배포

**방법 A: Git으로 클론 (권장)**

```bash
cd /home/pi
git clone <저장소-URL> go   # 또는 원하는 폴더명
cd go
```

**방법 B: 소스만 복사**

- PC에서 **소스 파일만** Pi로 복사 (예: `src/`, `scripts/`, `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json` 등).
- **복사하지 말 것:** `node_modules/`, `.next/`, `data/`(필요 시 빈 폴더만 만들고 Pi에서 DB 초기화).

## 3. Modbus 시리얼 포트 권한 (USB-RS485 사용 시)

`/dev/ttyUSB0` 등 시리얼 포트 접근을 위해 **실행 사용자를 dialout 그룹에 추가**하세요. 적용 후 재로그인 또는 재부팅이 필요합니다.

```bash
sudo usermod -aG dialout $USER
# 재로그인 또는: sudo reboot
```

확인: `ls -l /dev/ttyUSB0` → `dialout` 그룹이면, 해당 그룹 소속 사용자는 접근 가능합니다.

## 4. Pi에서 설치·빌드·실행 (필수)

아래는 **전부 라즈베리파이 SSH/터미널에서** 실행합니다.

```bash
cd /home/pi/go   # 프로젝트 루트

# 의존성 설치 → better-sqlite3가 linux arm64용으로 컴파일됨
npm install

# DB 초기화 (data 폴더 및 테이블 생성)
npm run db:init

# 프로덕션 빌드 (Pi에서 실행해야 .next가 이 환경에 맞게 생성됨)
npm run build

# 서버 실행 (기본 포트 3000)
npm start
```

이후 브라우저에서 `http://<라즈베리파이-IP>:3000` 으로 접속.

## 5. 오류 해결

### Modbus: `Cannot lock port` / `Resource temporarily unavailable`

실행 사용자가 시리얼 포트에 접근할 수 있어야 합니다. **dialout 그룹 추가** 후 재로그인하세요.

```bash
sudo usermod -aG dialout $USER
# 재로그인 또는 재부팅
```

### `routesManifest.dataRoutes is not iterable`

`.next`가 다른 환경(예: Windows)에서 빌드되었거나 손상된 경우 발생합니다. **라즈베리파이에서** 아래를 실행하세요.

```bash
cd /home/pi/go
rm -rf .next
npm run build
npm start
```

소스만 Git/복사로 가져왔고 Pi에서 `npm run build`를 한 번도 안 했다면, 반드시 Pi에서 `npm run build` 후 `npm start` 하세요.

## 6. 백그라운드 실행 (선택)

서버를 계속 켜 두려면 `pm2` 또는 systemd를 사용할 수 있습니다.

**PM2 예시:**

```bash
sudo npm install -g pm2
cd /home/pi/go
pm2 start npm --name "go" -- start
pm2 save
pm2 startup   # 부팅 시 자동 실행 설정 (안내에 따라 명령 실행)
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u pi --hp /home/pi
```

## 요약

| 항목 | 설명 |
|------|------|
| **Pi에서만** | `npm install`, `npm run build`, `npm start` 실행 |
| **복사 금지** | Windows/Mac의 `node_modules/`, `.next/` 를 Pi로 그대로 복사하지 말 것 |
| **Node 버전** | Node.js 20.x 사용 |

이렇게 하면 `better-sqlite3`가 Pi(linux arm64)용으로 빌드되어 `No native build was found for platform=linux arch=arm64` 오류가 나지 않습니다.
