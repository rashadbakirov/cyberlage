# System Overview (Public Release)

## Goal

CyberLage provides a cybersecurity situation picture by aggregating, enriching, and visualizing security alerts.

## Components

- `cyberradar-fetcher`:
  - Azure Functions for fetching and enrichment
  - writes to Cosmos DB
- `cyberradar-portal`:
  - Next.js UI and API
  - reads from Cosmos DB and presents dashboard/details

There is no third production project in this public release structure.

## Data Flow

```mermaid
flowchart LR
  A[BSI/CISA/NVD/MSRC/News Feeds] --> B[Fetcher Azure Functions]
  B --> C[Cosmos DB]
  C --> D[Portal Next.js]
  D --> E[User Dashboard + Alert Detail + AI Analyst]
```

## Public Release Scope

Active:
- Dashboard
- Alerts/details
- Compliance radar
- Sources
- AI analyst
- Reporting guidance

Inactive:
- Tenant-specific runtime logic
- Audit/evidence workflow as active public feature

## Expected Deployment Result

- Running application at:
  - `https://<WEBAPP_NAME>.azurewebsites.net`
