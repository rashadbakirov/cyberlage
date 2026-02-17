#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <WEBAPP_NAME> <AZURE_RESOURCE_GROUP>"
  exit 1
fi

WEBAPP_NAME="$1"
AZURE_RESOURCE_GROUP="$2"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTAL_DIR="$ROOT_DIR/cyberradar-portal"
ENV_FILE="$ROOT_DIR/.env"
ZIP_PATH="$ROOT_DIR/portal-deploy.zip"

log() {
  printf "[CyberLage Portal Deploy] %s\n" "$1"
}

fail() {
  printf "[CyberLage Portal Deploy] FEHLER: %s\n" "$1" >&2
  exit 1
}

check_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Befehl fehlt: $1"
}

check_cmd npm
check_cmd az
check_cmd zip

if [ ! -f "$ENV_FILE" ]; then
  fail ".env fehlt. Bitte zuerst TASK_04 ausfuehren."
fi

# shellcheck source=/dev/null
set -a
source "$ENV_FILE"
set +a

log "Portal bauen (inkl. Prebuild-Env-Check)"
cd "$PORTAL_DIR"
npm install
npm run build

log "Deployment-Paket erstellen"
rm -f "$ZIP_PATH"
zip -r "$ZIP_PATH" . -x "node_modules/*" ".next/*" ".git/*" >/dev/null

log "Kudu-Build aktivieren"
az webapp config appsettings set \
  --name "$WEBAPP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true >/dev/null

log "ZIP deploy starten"
az webapp deploy \
  --name "$WEBAPP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --src-path "$ZIP_PATH" \
  --type zip \
  --track-status true >/dev/null

rm -f "$ZIP_PATH"
log "Deployment abgeschlossen: https://$WEBAPP_NAME.azurewebsites.net"
