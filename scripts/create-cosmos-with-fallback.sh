#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <COSMOS_ACCOUNT> <AZURE_RESOURCE_GROUP> [PRIMARY_REGION] [FALLBACK_CSV]"
  echo "Example: $0 mycosmos my-rg westeurope germanywestcentral,northeurope"
  exit 1
fi

ACCOUNT_NAME="$1"
RESOURCE_GROUP="$2"
PRIMARY_REGION="${3:-westeurope}"
FALLBACK_CSV="${4:-germanywestcentral,northeurope}"
CONSISTENCY_LEVEL="${CONSISTENCY_LEVEL:-Session}"

log() {
  printf "[Cosmos Fallback] %s\n" "$1"
}

get_state() {
  az cosmosdb show --name "$ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP" \
    --query provisioningState -o tsv 2>/dev/null || true
}

wait_for_deletion() {
  for _ in $(seq 1 60); do
    if ! az cosmosdb show --name "$ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
      return 0
    fi
    sleep 10
  done
  echo "Timed out waiting for deletion of '$ACCOUNT_NAME'" >&2
  return 1
}

remove_failed_if_exists() {
  local state
  state="$(get_state)"
  if [ -z "$state" ]; then
    return 0
  fi
  log "Existing account state is '$state'. Deleting '$ACCOUNT_NAME' before retry..."
  az cosmosdb delete --name "$ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP" --yes --no-wait >/dev/null 2>&1 || true
  wait_for_deletion
}

regions=("$PRIMARY_REGION")
IFS=',' read -r -a fallback_regions <<< "$FALLBACK_CSV"
for region in "${fallback_regions[@]}"; do
  region="$(echo "$region" | xargs)"
  [ -n "$region" ] || continue
  if [ "$region" != "$PRIMARY_REGION" ]; then
    regions+=("$region")
  fi
done

for region in "${regions[@]}"; do
  log "Trying region '$region'..."
  remove_failed_if_exists

  if az cosmosdb create \
    --name "$ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --kind GlobalDocumentDB \
    --default-consistency-level "$CONSISTENCY_LEVEL" \
    --locations regionName="$region" failoverPriority=0 isZoneRedundant=False \
    -o none >/dev/null 2>&1; then
    state="$(get_state)"
    if [ "$state" = "Succeeded" ]; then
      log "Created Cosmos DB account '$ACCOUNT_NAME' in region '$region'."
      echo "$region"
      exit 0
    fi
  fi

  log "Region '$region' failed. Trying next region..."
done

echo "Cosmos creation failed in all regions: ${regions[*]}" >&2
exit 1
