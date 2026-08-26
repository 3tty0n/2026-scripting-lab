#!/bin/sh
# リポジトリ直下で http.server すると古いパスになるので _site を出す。
set -eu
cd "$(dirname "$0")/.."
if [ ! -d node_modules ]; then
  npm ci
fi
npm run serve
