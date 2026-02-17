# TASK_03_CREATE_RESOURCES

## Login & Subscription setzen

```bash
az login
az account set --subscription "$AZURE_SUBSCRIPTION_ID"
```

## Resource Group

```bash
az group create --name "$AZURE_RESOURCE_GROUP" --location "$AZURE_REGION"
```

## Namen ableiten (standardisiert & global eindeutig)

```bash
NAME_PREFIX_SAFE=$(echo "$NAME_PREFIX" | tr -cd 'a-z0-9')
SUB_ID_SHORT=$(echo "$AZURE_SUBSCRIPTION_ID" | tr -cd 'a-z0-9' | cut -c1-6)
UNIQUE_SUFFIX="$SUB_ID_SHORT"

COSMOS_ACCOUNT="${NAME_PREFIX_SAFE}${UNIQUE_SUFFIX}cosmos"
STORAGE_ACCOUNT="${NAME_PREFIX_SAFE}${UNIQUE_SUFFIX}sa"
FUNCTION_APP="${NAME_PREFIX}-fetcher-${UNIQUE_SUFFIX}"
WEBAPP_NAME="${NAME_PREFIX}-portal-${UNIQUE_SUFFIX}"
APP_SERVICE_PLAN="${NAME_PREFIX}-asp-${UNIQUE_SUFFIX}"
DB_NAME="cyberradar"
```

## Cosmos DB

```bash
az cosmosdb create \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --kind GlobalDocumentDB \
  --default-consistency-level Session

az cosmosdb sql database create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$DB_NAME"

az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --database-name "$DB_NAME" \
  --name raw_alerts \
  --partition-key-path /sourceId

az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --database-name "$DB_NAME" \
  --name fetch_logs \
  --partition-key-path /runId

az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --database-name "$DB_NAME" \
  --name source_registry \
  --partition-key-path /category

az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --database-name "$DB_NAME" \
  --name alert_actions \
  --partition-key-path /alertId

az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --database-name "$DB_NAME" \
  --name alert_status \
  --partition-key-path /alertId
```

## Cosmos Region-Fallback (Pflicht bei Kapazitätsfehlern)

Wenn die Erstellung in der Zielregion mit `ServiceUnavailable` fehlschlägt, **Deployment nicht abbrechen**.
Verwenden Sie den Fallback-Workflow (z. B. `germanywestcentral`, dann `northeurope`):

```bash
bash scripts/create-cosmos-with-fallback.sh \
  "$COSMOS_ACCOUNT" \
  "$AZURE_RESOURCE_GROUP" \
  "$AZURE_REGION" \
  "germanywestcentral,northeurope"
```

PowerShell:

```powershell
pwsh -File scripts/create-cosmos-with-fallback.ps1 `
  -AccountName $COSMOS_ACCOUNT `
  -ResourceGroup $AZURE_RESOURCE_GROUP `
  -PrimaryRegion $AZURE_REGION `
  -FallbackRegions @("germanywestcentral", "northeurope")
```

Anschließend Database/Container wie oben erstellen und mit den nächsten Tasks fortfahren.

## Storage + Function App

```bash
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --location "$AZURE_REGION" \
  --sku Standard_LRS

az functionapp create \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --consumption-plan-location "$AZURE_REGION" \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name "$FUNCTION_APP" \
  --storage-account "$STORAGE_ACCOUNT"
```

## Portal (App Service)

```bash
az appservice plan create \
  --name "$APP_SERVICE_PLAN" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --location "$AZURE_REGION" \
  --is-linux \
  --sku B1

az webapp create \
  --name "$WEBAPP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --plan "$APP_SERVICE_PLAN" \
  --runtime "NODE:20-lts"
```

Hinweis: In `TASK_03` wird nur die Web-App-Infrastruktur erstellt.
Der Code-Deploy erfolgt erst in `TASK_07_DEPLOY_PORTAL.md`.
