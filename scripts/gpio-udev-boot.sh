#!/bin/bash
# 부팅 시 GPIO udev 규칙 복사 및 적용 (Waveshare 8ch 등)
# 이 스크립트가 있는 디렉터리 기준으로 99-gpio-sysfs.rules 복사

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULES_SRC="${SCRIPT_DIR}/99-gpio-sysfs.rules"
RULES_DST="/etc/udev/rules.d/99-gpio-sysfs.rules"

if [ -f "$RULES_SRC" ]; then
  cp "$RULES_SRC" "$RULES_DST" 2>/dev/null && udevadm control --reload-rules
fi
