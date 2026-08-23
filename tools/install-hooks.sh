#!/bin/sh
# git push のたびに Gist を更新するフックを入れる。
#
#   sh tools/install-hooks.sh
#
# フックはリポジトリに入らない (.git/hooks は追跡されない) ので、
# 手元を作り直したら、これをもう一度実行すること。
set -eu
cd "$(dirname "$0")/.."
hook=.git/hooks/pre-push
cat > "$hook" <<'HOOK'
#!/bin/sh
# 課題ノートブックを公開 Gist へ反映してから push する (tools/sync-gists.sh)。
# 送りたくないときは git push --no-verify
if [ -x "$(command -v gh)" ]; then
    sh tools/sync-gists.sh || {
        echo "Gist の更新に失敗した。push を止める (--no-verify で飛ばせる)" >&2
        exit 1
    }
else
    echo "gh が無いので Gist の更新を飛ばす" >&2
fi
HOOK
chmod +x "$hook"
echo "入れた: $hook"
