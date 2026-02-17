#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

log() {
  printf "[CyberLage Setup] %s\n" "$1"
}

fail() {
  printf "[CyberLage Setup] FEHLER: %s\n" "$1" >&2
  exit 1
}

check_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Befehl fehlt: $1"
}

check_node_version() {
  local version
  version=$(node -v | sed 's/^v//')
  local major
  major=${version%%.*}
  if [ "$major" -lt 18 ]; then
    fail "Node.js >= 18 erforderlich (gefunden: $version)"
  fi
}

create_cosmosdb_with_fallback() {
  local account_name="$1"
  local resource_group="$2"
  local primary_region="$3"
  local fallback_csv="$4"

  local -a regions=("$primary_region")
  IFS=',' read -r -a fallback_regions <<< "$fallback_csv"
  for r in "${fallback_regions[@]}"; do
    r="$(echo "$r" | xargs)"
    [ -n "$r" ] || continue
    if [ "$r" != "$primary_region" ]; then
      regions+=("$r")
    fi
  done

  for region in "${regions[@]}"; do
    log "Cosmos DB erstellen in Region: $region"
    if az cosmosdb create \
      --name "$account_name" \
      --resource-group "$resource_group" \
      --kind GlobalDocumentDB \
      --default-consistency-level Session \
      --locations regionName="$region" failoverPriority=0 isZoneRedundant=False >/dev/null; then
      log "Cosmos DB erfolgreich in Region $region erstellt."
      return 0
    fi

    log "Region $region fehlgeschlagen, bereinige evtl. fehlgeschlagenes Konto und versuche nächste Region."
    az cosmosdb delete --name "$account_name" --resource-group "$resource_group" --yes --no-wait >/dev/null 2>&1 || true

    for _ in $(seq 1 30); do
      if ! az cosmosdb show --name "$account_name" --resource-group "$resource_group" >/dev/null 2>&1; then
        break
      fi
      sleep 5
    done
  done

  fail "Cosmos DB konnte in keiner Region erstellt werden. Geprüft: ${regions[*]}"
}

log "Voraussetzungen prüfen"
check_cmd node
check_cmd npm
check_cmd az
check_node_version

if [ ! -f "$ENV_FILE" ]; then
  fail ".env fehlt. Bitte .env.example nach .env kopieren und befüllen."
fi

# .env laden (einfache KEY=VALUE Dateien)
set -a
source "$ENV_FILE"
set +a

: "${AZURE_SUBSCRIPTION_ID:?AZURE_SUBSCRIPTION_ID fehlt}"
: "${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP fehlt}"

AZURE_REGION="${AZURE_REGION:-westeurope}"
CYBERLAGE_PREFIX="${CYBERLAGE_PREFIX:-cyberlage}"
COSMOS_ACCOUNT="${COSMOS_ACCOUNT:-${CYBERLAGE_PREFIX}cosmos$RANDOM}"
STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-${CYBERLAGE_PREFIX}sa$RANDOM}"
FUNCTION_APP="${FUNCTION_APP:-${CYBERLAGE_PREFIX}-fetcher-$RANDOM}"
COSMOS_FALLBACK_REGIONS="${COSMOS_FALLBACK_REGIONS:-germanywestcentral,northeurope}"
COSMOS_DATABASE="${COSMOS_DATABASE:-cyberradar}"

log "Azure Login"
az login >/dev/null
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

log "Resource Group erstellen"
az group create --name "$AZURE_RESOURCE_GROUP" --location "$AZURE_REGION" >/dev/null

log "Cosmos DB erstellen"
create_cosmosdb_with_fallback "$COSMOS_ACCOUNT" "$AZURE_RESOURCE_GROUP" "$AZURE_REGION" "$COSMOS_FALLBACK_REGIONS"

az cosmosdb sql database create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$COSMOS_DATABASE" >/dev/null

declare -a containers=(
  "raw_alerts:/sourceId"
  "fetch_logs:/runId"
  "source_registry:/category"
  "alert_actions:/alertId"
  "alert_status:/alertId"
)

for item in "${containers[@]}"; do
  name="${item%%:*}"
  pk="${item##*:}"
  az cosmosdb sql container create \
    --account-name "$COSMOS_ACCOUNT" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --database-name "$COSMOS_DATABASE" \
    --name "$name" \
    --partition-key-path "$pk" >/dev/null
done

log "Storage Account und Function App erstellen"
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --location "$AZURE_REGION" \
  --sku Standard_LRS >/dev/null

az functionapp create \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --consumption-plan-location "$AZURE_REGION" \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name "$FUNCTION_APP" \
  --storage-account "$STORAGE_ACCOUNT" >/dev/null

log "Dependencies installieren"
cd "$ROOT_DIR/cyberradar-portal"
npm install
cd "$ROOT_DIR/cyberradar-fetcher"
npm install

log "Setup abgeschlossen. Bitte Cosmos Endpoint/Key in .env ergänzen, falls noch nicht vorhanden."
