# Infrastructure and Resources

## Azure Resources Used for the PoC

This project was built as a PoC with these Azure services:

| Resource | Azure Service | PoC Configuration | Purpose |
|---|---|---|---|
| Database | Cosmos DB | Provisioned Throughput (Free Tier) or Serverless (Pay-per-Request) | Threat and compliance data |
| Hosting | App Service (Web App) | B1/F1 (depends on availability) | Frontend portal |
| Backend | Azure Functions | Consumption Plan | Data collection and processing |
| AI | Azure OpenAI | Pay-as-you-go | Enrichment and analysis |
| Identity (optional) | Microsoft Entra App Registration | Free | M365 Message Center & Service Health |
| Storage | Blob Storage | LRS | Logs and exports |
| Observability (optional) | Application Insights | Optional | Monitoring and telemetry |

## Cost Note

Actual cost depends on usage and configuration.

Recommendation:
- Start with free-tier options where available.
- Use Consumption plans for PoC workloads.

Cosmos DB note:
- Free Tier applies to provisioned throughput accounts (one account per subscription).
- Free Tier does not apply to serverless; serverless is pay-per-request.

## Alternatives to Azure

| Component | Azure | Alternative |
|---|---|---|
| Database | Cosmos DB | MongoDB Atlas, Supabase, PlanetScale |
| Hosting | Static Web App | Vercel, Netlify, Cloudflare Pages |
| Backend | Functions | Vercel Functions, AWS Lambda, Cloudflare Workers |
| AI | Azure OpenAI | OpenAI API, Anthropic API, local LLMs |
| Storage | Blob Storage | AWS S3, Cloudflare R2 |

## Minimal Starter Configuration

For a low-cost start:
1. Cosmos DB with provisioned throughput + Free Tier (or serverless)
2. App Service Plan (F1/B1 depending on availability)
3. Azure Functions Consumption
4. OpenAI with a cost-efficient model if AI features are needed
