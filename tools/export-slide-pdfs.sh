#!/bin/sh
# 各回の reveal.js を 16:9 の PDF にする。Pages デプロイ前にも使う。
set -eu
cd "$(dirname "$0")/.."
mkdir -p slides-pdf
python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &
pid=$!
trap 'kill "$pid"' EXIT
sleep 1
for d in 01-basics 02-text 03a-llm 03b-forth; do
  npx --yes decktape@3.16.0 reveal \
    --size 1920x1080 \
    --load-pause 2500 \
    --chrome-arg=--no-sandbox \
    --chrome-arg=--disable-gpu \
    "http://127.0.0.1:8765/$d/index.html" \
    "slides-pdf/$d.pdf"
done
