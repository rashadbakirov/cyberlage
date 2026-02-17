# TASK_04_ENV_AND_SETTINGS

## Verbindungsstrings abrufen

```bash
COSMOS_CONN=$(az cosmosdb keys list \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv)

BLOB_CONN=$(az storage account show-connection-string \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query connectionString -o tsv)
```

## .env im Repo (für lokale Scripts)

```bash
cp .env.example .env
```

Fülle mindestens:
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `COSMOS_CONNECTION_STRING`
- `COSMOS_ENDPOINT`, `COSMOS_KEY`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`
- `AZURE_OPENAI_*`
- `SEARCH_ENDPOINT`, `SEARCH_API_KEY` (falls genutzt)

## Function App Settings (Fetcher)

```bash
az functionapp config appsettings set \
  --name "$FUNCTION_APP" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --settings \
  COSMOS_CONNECTION_STRING="$COSMOS_CONN" \
  BLOB_CONNECTION_STRING="$BLOB_CONN" \
  COSMOS_DATABASE=cyberradar \
  NVD_API_KEY="${NVD_API_KEY:-}" \
  AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
  AZURE_OPENAI_API_KEY="$AZURE_OPENAI_KEY" \
  AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
  AZURE_OPENAI_API_VERSION="2024-10-21" \
  AZURE_OPENAI_MODEL="gpt-4o" \
  M365_TENANT_ID="$M365_TENANT_ID" \
  M365_CLIENT_ID="$M365_CLIENT_ID" \
  M365_CLIENT_SECRET="$M365_CLIENT_SECRET"
```

## Web App Settings (Portal)

```bash
az webapp config appsettings set \
  --name "$WEBAPP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --settings \
  NEXTAUTH_URL="https://$WEBAPP_NAME.azurewebsites.net" \
  NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  ENCRYPTION_KEY="$ENCRYPTION_KEY" \
  COSMOS_ENDPOINT="$COSMOS_ENDPOINT" \
  COSMOS_KEY="$COSMOS_KEY" \
  COSMOS_DATABASE=cyberradar \
  AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
  AZURE_OPENAI_API_KEY="$AZURE_OPENAI_KEY" \
  AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
  AZURE_OPENAI_API_VERSION="2024-10-21" \
  AZURE_OPENAI_MODEL="gpt-4o" \
  SEARCH_ENDPOINT="$SEARCH_ENDPOINT" \
  SEARCH_API_KEY="$SEARCH_API_KEY" \
  SEARCH_INDEX="cyberradar-alerts-index"
```

> Falls Azure OpenAI nicht verfügbar: Werte leer lassen und die KI‑Funktionen deaktiviert lassen.
> M365-Tenant-Quellen aktivieren: `ENABLE_TENANT_SOURCES=true` in den Function-App-Settings setzen.
