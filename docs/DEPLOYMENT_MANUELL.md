# Manuelles Deployment (Voraussetzungen & Ressourcen)

Diese Seite beschreibt, was **zwingend erforderlich** ist, damit CyberLage end‑to‑end funktioniert.

Zusätzlich:
- Variablen-Matrix: `docs/ENVIRONMENT_MATRIX.md`
- System-Kurzüberblick: `docs/SYSTEM_OVERVIEW.md`
- Public Release Gate: `docs/PUBLIC_RELEASE_GATE.md`

## Kurzfassung

- **Nur `npm install` reicht nicht.**
- Für echte Daten & KI‑Funktionen müssen Azure‑Ressourcen vorhanden sein.

## Voraussetzungen (lokal)

- Node.js >= 18
- npm
- Azure CLI (`az`)
- Azure Functions Core Tools (`func`) – für den Fetcher

Setup-Helfer:

```bash
bash scripts/setup.sh
```

PowerShell:

```powershell
pwsh -File scripts/setup.ps1
```

## Azure‑Ressourcen (Pflicht für End‑to‑End)

1. **Cosmos DB (SQL API)**
   - Database: `cyberradar`
   - Container: `raw_alerts` (Partition Key: `/sourceId`)
   - Container: `fetch_logs` (Partition Key: `/runId`)
   - Container: `source_registry` (Partition Key: `/category`)
   - Container: `alert_actions` (Partition Key: `/alertId`)
   - Container: `alert_status` (Partition Key: `/alertId`)
2. **Azure Functions** (Fetcher)
   - Lädt/aktualisiert Bedrohungsdaten in Cosmos DB
3. **Azure Storage Account**
   - Logs und Cache des Fetchers
4. **Azure App Service (Web App)**
   - Hosting des Portals
   - Empfohlen: Plan + WebApp explizit erstellen, Deploy separat per ZIP

## Azure‑Ressourcen (für KI‑Features)

5. **Azure OpenAI**
   - Endpoint, Key, Deployment
   - Ohne diese Werte sind KI‑Briefing & KI‑Chat deaktiviert.

## Optional (Microsoft 365 Feeds)

6. **Microsoft Entra App Registration**
   - Application permissions: `ServiceMessage.Read.All`, `ServiceHealth.Read.All`
   - Admin Consent erforderlich

## Optional (Suche & komfortables Browsing)

7. **Azure AI Search**
   - Endpoint, Key, Index

## Minimal‑Demo (lokal, ohne Azure OpenAI)

- Cosmos DB ist **Pflicht** (sonst keine Daten).
- Danach können Demo‑Daten geladen werden (aktuell **3** bereits angereicherte Alerts):

```bash
./scripts/seed-data.sh
```

PowerShell:

```powershell
pwsh -File scripts/seed-data.ps1
```

## Betrieb & Taktung

- Fetcher‑Timer: alle 10 Minuten (mit source‑spezifischem Throttling)
- Enrichment‑Timer: alle 6 Stunden, bis zu 100 Alerts pro Lauf (Azure OpenAI nötig)
- Re‑Enrichment‑Timer: standardmäßig deaktiviert (nur bei Bedarf aktivieren)
- KI‑Chat: nutzt OpenAI, wenn konfiguriert; ohne OpenAI Fallback auf vorhandene Alerts

## Voller Betrieb (empfohlen)

- Cosmos DB + Functions + Storage + OpenAI (+ Search optional)
- Danach `cyberradar-portal` bauen und deployen.

Deployment-Helfer:

```bash
bash scripts/deploy-portal.sh <WEBAPP_NAME> <AZURE_RESOURCE_GROUP>
```

PowerShell:

```powershell
pwsh -File scripts/deploy-portal.ps1 -WebAppName <WEBAPP_NAME> -ResourceGroup <AZURE_RESOURCE_GROUP>
```

## Benötigte Werte (für `.env`)

Pflicht:
- `COSMOS_ENDPOINT`
- `COSMOS_KEY`
- `COSMOS_DATABASE`

Wenn KI genutzt werden soll:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT`

Wenn Microsoft 365 Feeds genutzt werden sollen:
- `M365_TENANT_ID`
- `M365_CLIENT_ID`
- `M365_CLIENT_SECRET`

Optional:
- `SEARCH_ENDPOINT`
- `SEARCH_API_KEY`
- `SEARCH_INDEX`

## Hinweis

Wenn Sie **keine Azure‑Ressourcen** haben, kann der Portal‑Build zwar laufen,
aber ohne Daten und ohne KI‑Anreicherung.
