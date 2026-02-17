#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

log() {
  printf "[CyberLage Seed] %s\n" "$1"
}

fail() {
  printf "[CyberLage Seed] FEHLER: %s\n" "$1" >&2
  exit 1
}

if [ ! -f "$ENV_FILE" ]; then
  fail ".env fehlt. Bitte .env.example nach .env kopieren und befüllen."
fi

set -a
source "$ENV_FILE"
set +a

export COSMOS_ENDPOINT="${COSMOS_ENDPOINT:-${COSMOS_DB_ENDPOINT:-}}"
export COSMOS_KEY="${COSMOS_KEY:-${COSMOS_DB_KEY:-}}"
export COSMOS_DATABASE="${COSMOS_DATABASE:-${COSMOS_DB_DATABASE:-cyberradar}}"
export COSMOS_CONTAINER="${COSMOS_CONTAINER:-${COSMOS_DB_CONTAINER_THREATS:-raw_alerts}}"

if [ -z "${COSMOS_ENDPOINT}" ] || [ -z "${COSMOS_KEY}" ]; then
  fail "COSMOS_ENDPOINT/COSMOS_KEY fehlen (oder COSMOS_DB_ENDPOINT/COSMOS_DB_KEY)."
fi

log "Demo-Daten werden in Cosmos DB geladen"

cd "$ROOT_DIR/cyberradar-portal"
node ../scripts/seed-data.js

log "Seed abgeschlossen"
