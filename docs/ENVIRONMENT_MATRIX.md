# Environment Matrix

This matrix defines which variables are required for successful deployment.

## Required (Always)

| Variable | Description |
|---|---|
| `AZURE_SUBSCRIPTION_ID` | Azure subscription |
| `AZURE_RESOURCE_GROUP` | Target resource group |
| `AZURE_REGION` | Region, e.g. `westeurope` |
| `COSMOS_ENDPOINT` | Cosmos DB endpoint |
| `COSMOS_KEY` | Cosmos DB key |
| `COSMOS_DATABASE` | Database name (`cyberradar`) |
| `COSMOS_CONNECTION_STRING` | Fetcher connection |
| `BLOB_CONNECTION_STRING` | Storage connection for fetcher |
| `NEXTAUTH_URL` | Portal base URL, e.g. `https://<WEBAPP_NAME>.azurewebsites.net` |
| `NEXTAUTH_SECRET` | Portal secret |
| `ENCRYPTION_KEY` | 64 hex characters |

## Required for AI Features

| Variable | Description |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint |
| `AZURE_OPENAI_API_KEY` or `AZURE_OPENAI_KEY` | Azure OpenAI key |
| `AZURE_OPENAI_DEPLOYMENT` | Deployment name |
| `AZURE_OPENAI_API_VERSION` | API version (recommended: `2024-10-21`) |
| `AZURE_OPENAI_MODEL` | Model name (e.g. `gpt-4o`) |

## Optional (Feature-Dependent)

| Variable | Description |
|---|---|
| `M365_TENANT_ID` | Entra tenant ID for Message Center/Service Health |
| `M365_CLIENT_ID` | Entra app client ID |
| `M365_CLIENT_SECRET` | Entra app secret |
| `ENABLE_TENANT_SOURCES` | Optional override (`true`/`false`) for tenant feeds |
| `NVD_API_KEY` | Optional for higher NVD rate limit |
| `SEARCH_ENDPOINT` | Azure AI Search endpoint |
| `SEARCH_API_KEY` | Azure AI Search key |
| `SEARCH_INDEX` | Search index (default: `cyberradar-alerts-index`) |

## Fallback Rules (Missing Optional Values)

- Missing `M365_*`: skip M365 feeds and continue deployment.
- Missing `SEARCH_*`: disable search feature and continue.
- Missing OpenAI values: disable AI features and continue.

## Required Public-Release Scope

- Tenant management is not active.
- Audit/evidence workflow is disabled in public UI.
- Deployment ends with web URL: `https://<WEBAPP_NAME>.azurewebsites.net`
