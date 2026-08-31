#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
exec npx slidekit gist hook
