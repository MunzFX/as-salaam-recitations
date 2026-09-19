#!/bin/zsh
set -e
TASK_ROOT="${0:A:h}"
cd "$TASK_ROOT/app"
export PATH="$TASK_ROOT/.tooling/bun-darwin-aarch64:/Users/munzfx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
export XDG_CONFIG_HOME="$TASK_ROOT/.tooling/config"
export WRANGLER_LOG_PATH="$TASK_ROOT/.tooling/wrangler.log"
export WRANGLER_SEND_METRICS=false
if curl --silent --fail http://127.0.0.1:8787/api/archive/session >/dev/null; then
  print 'The As-Salaam preview is already running: http://127.0.0.1:8787'
  exit 0
fi
if ! command -v bun >/dev/null; then
  print 'Bun is needed to start this preview. Install Bun from https://bun.sh, then run this file again.'
  exit 1
fi
if [[ ! -d node_modules ]]; then bun install; fi
bun run build
./node_modules/.bin/wrangler d1 migrations apply as-salaam-preview-db --local --config wrangler.local.jsonc --persist-to .wrangler/local
print 'Your preview is starting at http://127.0.0.1:8787. Keep this window open.'
./node_modules/.bin/wrangler dev --local --config wrangler.local.jsonc --persist-to .wrangler/local --port 8787 --ip 127.0.0.1
