# Environment Matrix

Diese Matrix definiert, welche Variablen für ein erfolgreiches Deployment erforderlich sind.

## Pflicht (immer)

| Variable | Beschreibung |
|---|---|
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription |
| `AZURE_RESOURCE_GROUP` | Ziel-Resource-Group |
| `AZURE_REGION` | Region, z. B. `westeurope` |
| `COSMOS_ENDPOINT` | Cosmos DB Endpoint |
| `COSMOS_KEY` | Cosmos DB Key |
| `COSMOS_DATABASE` | Datenbankname (`cyberradar`) |
| `COSMOS_CONNECTION_STRING` | Verbindung für Fetcher |
| `BLOB_CONNECTION_STRING` | Storage-Verbindung für Fetcher |
| `NEXTAUTH_URL` | Basis-URL des Portals, z. B. `https://<WEBAPP_NAME>.azurewebsites.net` |
| `NEXTAUTH_SECRET` | Secret für Portal |
| `ENCRYPTION_KEY` | 64 Hex Zeichen |

## Pflicht für KI-Funktionen

| Variable | Beschreibung |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI Endpoint |
| `AZURE_OPENAI_API_KEY` oder `AZURE_OPENAI_KEY` | Azure OpenAI Key |
| `AZURE_OPENAI_DEPLOYMENT` | Deployment Name |
| `AZURE_OPENAI_API_VERSION` | API-Version (empfohlen: `2024-10-21`) |
| `AZURE_OPENAI_MODEL` | Modellname (z. B. `gpt-4o`) |

## Optional (Feature-abhängig)

| Variable | Beschreibung |
|---|---|
| `M365_TENANT_ID` | Entra Tenant ID für Message Center/Service Health |
| `M365_CLIENT_ID` | Entra App Client ID |
| `M365_CLIENT_SECRET` | Entra App Secret |
| `ENABLE_TENANT_SOURCES` | Optionaler Override (`true`/`false`) für Tenant-Feeds |
| `NVD_API_KEY` | Optional für höheres NVD-Ratelimit |
| `SEARCH_ENDPOINT` | Azure AI Search Endpoint |
| `SEARCH_API_KEY` | Azure AI Search Key |
| `SEARCH_INDEX` | Search Index (Default: `cyberradar-alerts-index`) |

## Fallback-Regeln (bei fehlenden Optional-Werten)

- Fehlen `M365_*`: M365-Feeds überspringen, Deployment fortsetzen.
- Fehlen `SEARCH_*`: Suchfeature deaktivieren, Deployment fortsetzen.
- Fehlen OpenAI-Werte: KI-Features deaktivieren, Deployment fortsetzen.

## Muss-Konfiguration in Public-Version

- Tenant-Management ist nicht aktiv.
- Audit/Nachweis-Workflow ist in der Public-UI deaktiviert.
- Deployment endet mit Web URL: `https://<WEBAPP_NAME>.azurewebsites.net`
