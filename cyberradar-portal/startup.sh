#!/usr/bin/env bash
set -eu
# Some App Service images invoke a minimal shell; enable pipefail when supported.
set -o pipefail 2>/dev/null || true

# Azure App Service startup command for Next.js standalone output.
# Ensures `public/` and `.next/static/` exist under `.next/standalone/`.

if [ ! -f ".next/standalone/server.js" ]; then
  echo "ERROR: Missing .next/standalone/server.js. Did the build run with Next output='standalone'?" >&2
  echo "TIP: Ensure 'next.config.ts' contains: output: \"standalone\" and the deployment runs 'next build'." >&2
  ls -la .next || true
  exit 1
fi

rm -rf .next/standalone/.next/static .next/standalone/public
mkdir -p .next/standalone/.next

cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

cd .next/standalone
exec node server.js
