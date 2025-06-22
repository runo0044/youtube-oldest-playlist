#!/usr/bin/env bash
# check-env.sh: 開発環境のバリデーションスクリプト
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

fail() {
  echo -e "${RED}✗ $1${NC}"
  exit 1
}
pass() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Node.js
if ! command -v node >/dev/null 2>&1; then
  fail "Node.js がインストールされていません。https://nodejs.org/ からインストールしてください。"
fi
NODE_VERSION=$(node -v | sed 's/v//')
if [[ $(echo -e "14.0.0\n$NODE_VERSION" | sort -V | head -n1) != "14.0.0" ]]; then
  fail "Node.js バージョンが 14.x 以上である必要があります (現在: $NODE_VERSION)"
else
  pass "Node.js ($NODE_VERSION)"
fi

# npm or yarn
if command -v npm >/dev/null 2>&1; then
  pass "npm ($(npm -v))"
elif command -v yarn >/dev/null 2>&1; then
  pass "yarn ($(yarn -v))"
else
  fail "npm または yarn がインストールされていません。"
fi

# TypeScript
if ! command -v tsc >/dev/null 2>&1; then
  fail "TypeScript (tsc) がインストールされていません。npm install -g typescript でインストールしてください。"
else
  pass "TypeScript ($(tsc -v))"
fi

# Chrome
if command -v google-chrome >/dev/null 2>&1; then
  pass "Google Chrome (google-chrome)"
elif command -v chromium-browser >/dev/null 2>&1; then
  pass "Chromium (chromium-browser)"
else
  fail "Google Chrome または Chromium がインストールされていません。"
fi

echo "Chrome のデベロッパーモードで拡張機能を読み込めることを確認してください。"

# gcloud
if command -v gcloud >/dev/null 2>&1; then
  pass "Google Cloud SDK (gcloud)"
else
  echo -e "${RED}gcloud コマンドが見つかりません。API キー/OAuth の自動生成は手動案内となります。${NC}"
fi

echo -e "\n${GREEN}すべての必須チェックが完了しました。${NC}"
