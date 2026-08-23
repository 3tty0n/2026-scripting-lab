#!/bin/sh

set -eu
cd "$(dirname "$0")/.."

check_only=${1:-}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
stale=0

while read -r name gid; do
    case "$name" in ''|'#'*) continue ;; esac
    local_file="exercises/$name"
    [ -f "$local_file" ] || { echo "Not found: $local_file"; exit 1; }

    if ! gh api "gists/$gid" --jq ".files[\"$name\"].raw_url" > "$tmp/url" 2>/dev/null; then
        echo "Cannot read gist: $gid ($name)"; exit 1
    fi
    curl -sL "$(cat "$tmp/url")" -o "$tmp/remote"

    if cmp -s "$local_file" "$tmp/remote"; then
        continue
    fi
    stale=$((stale + 1))
    if [ "$check_only" = "--check" ]; then
        echo "Wrong id: $name  https://gist.github.com/$gid"
    else
        gh gist edit "$gid" -f "$name" "$local_file"
        echo "Sent: $name  https://gist.github.com/$gid"
    fi
done < tools/gists.txt

[ "$stale" -eq 0 ] && echo "Gist is updated"
exit 0
