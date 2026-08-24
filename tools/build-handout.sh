#!/bin/sh
set -eu

deck=${1:?"usage: tools/build-handout.sh DECK [OUTPUT.pdf]"}
source_file="$deck/slides.md"
output=${2:-"$deck/handout.pdf"}
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

test -f "$source_file"
mkdir -p "$(dirname -- "$output")"
output_dir=$(CDPATH= cd -- "$(dirname -- "$output")" && pwd)
output="$output_dir/$(basename -- "$output")"

(cd "$deck" && pandoc slides.md \
  --from=gfm \
  --pdf-engine=xelatex \
  --variable=documentclass:bxjsarticle \
  --variable=classoption:xelatex,ja=standard \
  --variable=papersize:a4 \
  --variable=mainfont:IBMPlexSansJP \
  --variable='mainfontoptions:Path=../assets/fonts/,Extension=.ttf,UprightFont=*-Regular,BoldFont=*-Bold' \
  --include-in-header="$root/assets/handout.tex" \
  --output="$output")
printf '%s\n' "$output"
