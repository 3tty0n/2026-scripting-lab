#!/bin/sh
# 課題ノートブックを公開 Gist へ反映する。
#
# Colab は private リポジトリのファイルを開けないので、課題は Gist 経由で配る。
# 中身が変わったものだけ送る。tools/install-hooks.sh を実行しておくと
# git push のたびに走る。
#
#   sh tools/sync-gists.sh          # 変わったものを送る
#   sh tools/sync-gists.sh --check  # 送らずに、ずれているものを並べる

set -eu
cd "$(dirname "$0")/.."

check_only=${1:-}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
stale=0

while read -r name gid; do
    case "$name" in ''|'#'*) continue ;; esac
    local_file="exercises/$name"
    [ -f "$local_file" ] || { echo "無い: $local_file"; exit 1; }

    if ! gh api "gists/$gid" --jq ".files[\"$name\"].raw_url" > "$tmp/url" 2>/dev/null; then
        echo "Gist を読めない: $gid ($name)"; exit 1
    fi
    curl -sL "$(cat "$tmp/url")" -o "$tmp/remote"

    if cmp -s "$local_file" "$tmp/remote"; then
        continue
    fi
    stale=$((stale + 1))
    if [ "$check_only" = "--check" ]; then
        echo "ずれている: $name  https://gist.github.com/$gid"
    else
        gh gist edit "$gid" -f "$name" "$local_file"
        echo "送った: $name  https://gist.github.com/$gid"
    fi
done < tools/gists.txt

[ "$stale" -eq 0 ] && echo "Gist は最新"
exit 0
