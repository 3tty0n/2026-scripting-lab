#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

for name in pre-commit pre-push; do
    hook=".git/hooks/$name"
    cp "tools/hooks/$name" "$hook"
    chmod +x "$hook"
    echo "Added: $hook"
done
