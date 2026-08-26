#!/bin/sh
set -eu

deck=${1:?"usage: tools/build-handout.sh DECK [OUTPUT.pdf]"}
# DECK は 01-basics または src/01-basics
case "$deck" in
  src/*) deck_dir=$deck ;;
  *) deck_dir=src/$deck ;;
esac
source_file="$deck_dir/slides.md"
output=${2:-"$deck_dir/handout.pdf"}
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

test -f "$source_file"
mkdir -p "$(dirname -- "$output")"
output_dir=$(CDPATH= cd -- "$(dirname -- "$output")" && pwd)
output="$output_dir/$(basename -- "$output")"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

# Reveal DSL (hstack / wrap) を潰してから、画像パスをルート基準へ
node "$root/tools/flatten-slides-dsl.js" "$source_file" \
  | sed "s|](\\./\\.\\./assets/|]($root/assets/|g; s|](\\.\\./assets/|]($root/assets/|g" \
  > "$tmp"

# DSL が残っていないことを軽く確認
if grep -nE '^::: *(r-)?hstack\b|^\|\|\| *$|^```[^`]*\bwrap\b' "$tmp" >/dev/null; then
  echo "flatten-slides-dsl: DSL markers remain in $source_file" >&2
  grep -nE '^::: *(r-)?hstack\b|^\|\|\| *$|^```[^`]*\bwrap\b' "$tmp" >&2 || true
  exit 1
fi

pandoc "$tmp" \
  --from=gfm \
  --pdf-engine=xelatex \
  --variable=documentclass:bxjsarticle \
  --variable=classoption:xelatex,ja=standard \
  --variable=papersize:a4 \
  --variable=mainfont:IBMPlexSansJP \
  --variable="mainfontoptions:Path=$root/assets/fonts/,Extension=.ttf,UprightFont=*-Regular,BoldFont=*-Bold" \
  --resource-path="$root:$root/assets:$deck_dir" \
  --include-in-header="$root/assets/handout.tex" \
  --output="$output"
printf '%s\n' "$output"
