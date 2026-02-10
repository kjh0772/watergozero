# 관수 시스템 (Irrigation System)

mission.txt 지침에 따른 심플 관수 제어 시스템입니다.

## 기술 스택

- **Next.js 15** (App Router, TypeScript)
- **SQLite** (better-sqlite3): 시스템설정 DB, 공급설정 DB, 기록 DB
- **Tailwind CSS**

## 하드웨어 (참고)

- 구동: 라즈베리파이 + PLC
- 제어: Modbus RS485, 릴레이 16채널 (P1~P4 + 지역 밸브 12개)
- 펌프: P1 지하수, P2 공급펌프

## DB 구조

| DB 파일 | 용도 |
|--------|------|
| `data/system_config.db` | PLC 설정, 센서 연결 상태, 물탱크 캘리브레이션 |
| `data/supply_config.db` | 관수 방식(요일/매일), 트리거(시간/간격), 구역별 공급 시간 |
| `data/records.db` | 공급 기록 |

## 실행 방법

```bash
# 의존성 설치
npm install

# DB 초기화 (data 폴더 및 테이블/시드 생성)
npm run db:init

# 개발 서버
npm run dev
```

브라우저에서 http://localhost:3000 접속.

**라즈베리파이에서 실행할 때:** `better-sqlite3` 네이티브 모듈은 Pi(linux arm64)에서만 빌드해야 합니다. → [DEPLOY-PI.md](./DEPLOY-PI.md) 참고.

## 페이지

| 경로 | 설명 |
|------|------|
| `/` | 메인: 현재시각, 센서 상태(온도/습도/토양함수/토양온도), 물탱크 수위(AD, cm), 동작상태(펌프, 밸브) |
| `/records` | 공급 기록 조회 |
| `/settings/supply` | 공급설정: 관수 방식, 트리거, 구역별 공급 시간(순차) |
| `/settings/system` | 시스템설정: PLC 설정 및 정보, 센서 연결 상태 |

## 환경

- `.env.local` 은 수정하지 마세요. (필요 시 PLC 포트 등은 시스템설정 화면에서 저장)
