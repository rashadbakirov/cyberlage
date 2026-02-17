# Infrastruktur & Ressourcen

## Für den Proof of Concept genutzte Azure-Ressourcen

Dieses Projekt wurde als PoC mit folgenden Azure-Diensten entwickelt:

| Ressource | Azure-Dienst | PoC-Konfiguration | Zweck |
|-----------|-------------|-------------------|-------|
| Datenbank | Cosmos DB | Provisioned Throughput (Free Tier) oder Serverless (Pay-per-Request) | Bedrohungsdaten, Compliance-Daten |
| Hosting | App Service (Web App) | B1/F1 je nach Verfügbarkeit | Frontend-Dashboard |
| Backend | Azure Functions | Consumption Plan | API & Datenverarbeitung |
| KI | Azure OpenAI | Pay-as-you-go | Anreicherung & Analyse |
| Identität (optional) | Microsoft Entra App Registration | Kostenlos | M365 Message Center & Service Health |
| Speicher | Blob Storage | LRS | Logs, Exporte |
| Observability (optional) | Application Insights | optional (manuell/CLI) | Monitoring & Telemetrie |

### Kostenhinweis

Für die Entwicklung und den PoC wurde ein Azure-Sponsorship genutzt.
Die tatsächlichen Kosten hängen stark von Nutzung und Konfiguration ab.

**Empfehlung:** Starten Sie mit den Free-Tier-Optionen (wo verfügbar) und dem Consumption Plan.
Für einen PoC mit geringem Datenvolumen entstehen minimale Kosten.

**Wichtig zu Cosmos DB:** Der Free Tier gilt nur für Konten mit bereitgestelltem Durchsatz (Provisioned Throughput)
und bietet einen begrenzten kostenlosen Durchsatz sowie Speicher pro Azure-Abonnement (1 Konto).
Für **Serverless** ist der Free Tier **nicht verfügbar** – hier gilt Pay‑per‑Request.

## Alternativen zu Azure

Sie sind nicht an Azure gebunden. Folgende Alternativen sind möglich:

| Komponente | Azure | Alternative |
|-----------|-------|-------------|
| Datenbank | Cosmos DB | MongoDB Atlas (Free Tier), Supabase, PlanetScale |
| Hosting | Static Web App | Vercel (Free), Netlify (Free), Cloudflare Pages |
| Backend | Functions | Vercel Functions, AWS Lambda, Cloudflare Workers |
| KI | Azure OpenAI | OpenAI API direkt, Anthropic Claude API, lokale LLMs |
| Speicher | Blob Storage | AWS S3, Cloudflare R2 (Free 10GB) |

## Minimale Konfiguration für den Start

Wenn Sie die Kosten minimieren möchten:
1. Cosmos DB mit bereitgestelltem Durchsatz + Free Tier (begrenzter kostenloser Durchsatz/Speicher, 1 Konto/Subscription)
2. Alternativ: Cosmos DB Serverless (Pay‑per‑Request, kein Free Tier)
3. App Service Plan (F1/B1, je nach Verfügbarkeit)
4. Azure Functions Consumption (monatliches Free Grant)
5. OpenAI API mit GPT-4o-mini (kostengünstigste Option)
