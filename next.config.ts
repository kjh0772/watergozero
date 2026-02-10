import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 라즈베리파이(linux arm64): better-sqlite3 등 네이티브 모듈은 번들 제외 → Pi에서 npm install 시 해당 플랫폼용으로 빌드됨
  serverExternalPackages: ["better-sqlite3", "modbus-serial"],
  // 프로덕션 소스맵 비활성화 (Pi 메모리·디스크 절약)
  productionBrowserSourceMaps: false,
  // 기존 webpack externals 유지 (호환)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("better-sqlite3");
    }
    return config;
  },
};

export default nextConfig;
