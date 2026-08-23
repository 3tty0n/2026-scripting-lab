#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
hook=.git/hooks/pre-push
cat > "$hook" <<'HOOK'
#!/bin/sh
if [ -x "$(command -v gh)" ]; then
    sh tools/sync-gists.sh || {
        echo "Failed to update gitst" >&2
        exit 1
    }
else
    echo "No gh then skip updating gist" >&2
fi
HOOK
chmod +x "$hook"
echo "Added: $hook"
