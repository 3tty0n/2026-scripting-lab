#!/bin/sh
# usage: tools/build-beamer.sh DECK [OUTPUT.pdf]
# slides.md (Reveal 用 DSL) から Beamer の PDF を作る。DECK は 01-basics または src/01-basics。
# Web のスライドと同じ slides.md から作るので、内容がずれない。
set -eu
cd "$(dirname "$0")/.."
root=$(pwd)
kit=$root/vendor/slidekit

deck=${1:?"usage: tools/build-beamer.sh DECK [OUTPUT.pdf]"}
case "$deck" in
  src/*) deck_dir=$deck ;;
  *) deck_dir=src/$deck ;;
esac
source_file=$root/$deck_dir/slides.md
output=${2:-$root/$deck_dir/beamer.pdf}
test -f "$source_file"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

fonts="Path=$kit/theme/assets/fonts/,Extension=.ttf,UprightFont=*-Regular,BoldFont=*-Bold"
{
  cat "$root/tools/beamer-header.tex"
  # 日本語の字体 (LuaTeX-ja)。ヘッダ内のパスは実行時に決める
  printf '%s\n' '\usepackage{luatexja-fontspec}'
  printf '%s\n' "\\setmainjfont[$fonts]{IBMPlexSansJP}"
  printf '%s\n' "\\setsansjfont[$fonts]{IBMPlexSansJP}"
} > "$tmp/header.tex"

mkdir -p "$(dirname -- "$output")"

build() {   # build 出力先 [はみ出しを続けるページ番号,...]
  BEAMER_BREAK=${2:-} python3 "$root/tools/beamer-prep.py" "$root" < "$source_file" > "$tmp/slides.md"
  pandoc "$tmp/slides.md" \
    --from=markdown-tex_math_dollars-smart \
    --to=beamer --slide-level=2 \
    --pdf-engine=lualatex \
    --variable=aspectratio:169 \
    --variable=fontsize:10pt \
    --variable=classoption:t \
    --variable=mainfont:IBMPlexSansJP \
    --variable="mainfontoptions:$fonts" \
    --variable=sansfont:IBMPlexSansJP \
    --variable="sansfontoptions:$fonts" \
    --highlight-style=tango \
    --resource-path="$root:$root/assets:$kit/theme/assets:$root/$deck_dir" \
    --include-in-header="$tmp/header.tex" \
    --output="$1" 2> "$tmp/pandoc.log" || { tail -30 "$tmp/pandoc.log" >&2; exit 1; }
}

build "$output"
# はみ出したフレーム (内容が切れる) は、次のページへ続けて作り直す
breaks=$(python3 "$root/tools/beamer-overflow.py" "$output")
[ -z "$breaks" ] || build "$output" "$breaks"
left=$(python3 "$root/tools/beamer-overflow.py" "$output")
[ -z "$left" ] || echo "beamer: $deck: まだはみ出しているページ: $left" >&2
printf '%s\n' "$output"
