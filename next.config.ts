import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 라즈베리파이(linux arm64): better-sqlite3 등 네이티브 모듈은 번들 제외 → Pi에서 npm install 시 해당 플랫폼용으로 빌드됨
  serverExternalPackages: ["better-sqlite3", "modbus-serial"],
  // 프로덕션 소스맵 비활성화 (Pi 메모리·디스크 절약)
  productionBrowserSourceMaps: false,
  // 서버/instrumentation 빌드 시 네이티브·Node 내장 모듈 번들 제외
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push(
        "better-sqlite3",
        "modbus-serial",
        "serialport",
        "@serialport/bindings-cpp",
      );
    }
    // edge/instrumentation 컴파일에서 Node 내장 모듈 resolve 오류 방지
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      child_process: false,
      net: false,
      tls: false,
      dns: false,
    };
    return config;
  },
};

export default nextConfig;
