# Manual Deployment (Requirements and Resources)

This page defines what is strictly required for CyberLage to run end-to-end.

Additional references:
- Variable matrix: `docs/ENVIRONMENT_MATRIX.md`
- System overview: `docs/SYSTEM_OVERVIEW.md`
- Public release gate: `docs/PUBLIC_RELEASE_GATE.md`

## Summary

- `npm install` alone is not enough.
- Real data and AI features require Azure resources.

## Local Prerequisites

- Node.js >= 18
- npm
- Azure CLI (`az`)
- Azure Functions Core Tools (`func`) for fetcher

Setup helper:

```bash
bash scripts/setup.sh
```

PowerShell:

```powershell
pwsh -File scripts/setup.ps1
```

## Azure Resources (Required for End-to-End)

1. **Cosmos DB (SQL API)**
   - Database: `cyberradar`
   - Containers:
     - `raw_alerts` (PK `/sourceId`)
     - `fetch_logs` (PK `/runId`)
     - `source_registry` (PK `/category`)
     - `alert_actions` (PK `/alertId`)
     - `alert_status` (PK `/alertId`)
2. **Azure Functions (Fetcher)**
   - Loads/updates threat data into Cosmos DB
3. **Azure Storage Account**
   - Logs and cache for fetcher
4. **Azure App Service (Web App)**
   - Hosts portal
   - Recommended: create plan + web app explicitly, deploy code separately

## Azure Resources (For AI Features)

5. **Azure OpenAI**
   - Endpoint, key, deployment
   - Without these values, AI briefing/chat stay disabled.

## Optional (Microsoft 365 Feeds)

6. **Microsoft Entra App Registration**
   - Application permissions: `ServiceMessage.Read.All`, `ServiceHealth.Read.All`
   - Admin consent required

## Optional (Search and Better Browsing)

7. **Azure AI Search**
   - Endpoint, key, index

## Minimal Local Demo (Without Azure OpenAI)

- Cosmos DB is required.
- Then load demo alerts (currently **3**, already enriched):

```bash
./scripts/seed-data.sh
```

PowerShell:

```powershell
pwsh -File scripts/seed-data.ps1
```

## Runtime Cadence

- Fetch timer: every 10 minutes (source-specific throttling)
- Enrichment timer: every 6 hours, up to 100 alerts per run (requires Azure OpenAI)
- Re-enrichment timer: disabled by default
- AI chat: uses OpenAI if configured; otherwise fallback from existing alerts

## Full Runtime (Recommended)

- Cosmos DB + Functions + Storage + OpenAI (+ Search optional)
- Build and deploy `cyberradar-portal`

Deployment helper:

```bash
bash scripts/deploy-portal.sh <WEBAPP_NAME> <AZURE_RESOURCE_GROUP>
```

PowerShell:

```powershell
pwsh -File scripts/deploy-portal.ps1 -WebAppName <WEBAPP_NAME> -ResourceGroup <AZURE_RESOURCE_GROUP>
```

## Required `.env` Values

Required:
- `COSMOS_ENDPOINT`
- `COSMOS_KEY`
- `COSMOS_DATABASE`

If AI is required:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT`

If M365 feeds are required:
- `M365_TENANT_ID`
- `M365_CLIENT_ID`
- `M365_CLIENT_SECRET`

Optional:
- `SEARCH_ENDPOINT`
- `SEARCH_API_KEY`
- `SEARCH_INDEX`

## Note

If no Azure resources are configured, the portal build may still run, but without data and AI enrichment.
