# TASK_04_ENV_AND_SETTINGS

## Retrieve Connection Strings

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

## Local `.env` (for local scripts)

```bash
cp .env.example .env
```

Fill at minimum:
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `COSMOS_CONNECTION_STRING`
- `COSMOS_ENDPOINT`, `COSMOS_KEY`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`
- `AZURE_OPENAI_*`
- `SEARCH_ENDPOINT`, `SEARCH_API_KEY` (if used)

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

If Azure OpenAI is unavailable, leave values empty and keep AI features disabled.

To enable M365 tenant sources, set `ENABLE_TENANT_SOURCES=true` in Function App settings.
