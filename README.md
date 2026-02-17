# CyberLage – Deutsche Cybersecurity Compliance Intelligence

![CyberLage Banner](SCREENSHOTS/banner.png)

## Start Here

- Für Menschen (klarer Einstieg): `DEPLOYMENT_MIT_KI_AGENT.md`
- Für Agenten (ohne Rückfragen): `docs/AGENT_ZERO_TOUCH_PROMPT.md`
- Pflicht-Inputs/Fallbacks: `docs/ENVIRONMENT_MATRIX.md`
- Public-Release Gate vor Veröffentlichung: `docs/PUBLIC_RELEASE_GATE.md`
- Dokumentationsindex: `docs/README.md`

## Was ist CyberLage?

CyberLage ist eine deutsche Compliance-Intelligence-Plattform, die sicherheitsrelevante Hinweise aus BSI, CISA, NVD und Microsoft aggregiert, KI-gestützt anreichert und gegen NIS2, DORA sowie DSGVO abgleicht. Die Plattform arbeitet als Compliance-Layer über bestehenden SIEM/XDR-Lösungen und hilft dabei, regulatorisch relevante Meldungen schnell zu erkennen.

- Aggregiert Bedrohungsdaten aus BSI, CISA, NVD, Microsoft
- KI-gestützte Anreicherung und Priorisierung
- Automatischer Abgleich gegen NIS2, DORA, DSGVO
- Vollständig deutschsprachige Oberfläche

## Das Problem

SOC-Teams erhalten täglich Hunderte bis Tausende Meldungen, von denen nur ein Bruchteil wirklich handlungs- oder meldepflichtig ist. Die regulatorische Einordnung erfolgt häufig manuell, verzögert und ohne einheitlichen Rahmen.

## Die Lösung

CyberLage verdichtet das Rauschen zu einem klaren Lagebild: Alerts werden normalisiert, KI-gestützt zusammengefasst und mit Compliance-Relevanz versehen. Das Ergebnis ist eine priorisierte, regulatorisch interpretierte Sicherheitslage in deutscher Sprache.

## Features

- Aktuelles Bedrohungslage-Dashboard mit Priorisierung
- KI-Zusammenfassungen und deutschsprachige Bewertung
- Compliance-Indikatoren für NIS2, DORA, DSGVO
- Zeitliche Übersicht und Trends

## Repository Struktur (Public Release)

- `cyberradar-fetcher`: Azure Functions für Feeds, Enrichment und Speicherung
- `cyberradar-portal`: Next.js Portal (Dashboard, Detailansichten, KI-Analyst)

## Was Sie nach Deployment erhalten

- Eine laufende CyberLage-Instanz unter `https://<WEBAPP_NAME>.azurewebsites.net`
- Dashboard, Meldungen, Compliance-Radar, Quellen, KI-Analyst
- Meldepflicht-Hinweise mit BSI-Verlinkung
- Öffentliche Release-Variante ohne Tenant-Management und ohne Audit/Nachweise

## Warnhinweis

- Dieses Repository wird fortlaufend weiterentwickelt.
- KI-Ausgaben können Fehler enthalten; prüfen Sie Entscheidungen, Inhalte und Azure-Ressourcen immer fachlich.
- Feedback, Issues, Pull Requests und Forks sind ausdrücklich willkommen.

## Schnellstart

### Option A: Deployment mit KI-Agent (Empfohlen)

Siehe `DEPLOYMENT_MIT_KI_AGENT.md` und die Schritt-für-Schritt-Tasks unter `tasks/README.md`.
Der Agent übernimmt die Einrichtung und das Deployment – du gibst nur Subscription-ID, Resource Group und (falls KI gewünscht) den Azure OpenAI Ressourcen‑Namen an.
Falls Azure OpenAI nicht automatisch erstellt werden kann, fragt der Agent nach Endpoint/Key/Deployment.
Für Microsoft 365 Message Center & Service Health wird zusätzlich eine **Entra App** benötigt (siehe unten).
Der Agent verwendet standardisierte Ressourcennamen (Prefix `cyberlage-<env>-<region>` plus stabiler Suffix aus der Subscription‑ID).

**Schnellstart (für Menschen):**
1. Repository in VS Code öffnen (oder zuerst `git clone`).
2. KI‑Agent starten (Claude Code / Codex / Copilot Workspace / Cursor).
3. Diesen Prompt an den Agenten schicken:

```text
I want to deploy CyberLage from this repo: [REPO_URL or PATH].
First read DEPLOYMENT_MIT_KI_AGENT.md, then tasks/README.md and all tasks in order.
Work step-by-step and ask me for missing info.

Resource Group: demo_cyberRadar_de
Subscription ID: <YOUR_SUBSCRIPTION_ID>
Azure OpenAI resource name: <YOUR_OPENAI_RESOURCE_NAME>
Name prefix (optional, default: cyberlage-demo-weu)

Microsoft 365 Enterprise App (optional, für Message Center & Service Health):
M365_TENANT_ID=<YOUR_TENANT_ID>
M365_CLIENT_ID=<YOUR_CLIENT_ID>
M365_CLIENT_SECRET=<YOUR_CLIENT_SECRET>

If Azure OpenAI can’t be created automatically, use:
AZURE_OPENAI_ENDPOINT=<YOUR_OPENAI_ENDPOINT>
AZURE_OPENAI_KEY=<YOUR_OPENAI_KEY>
AZURE_OPENAI_DEPLOYMENT=<YOUR_OPENAI_DEPLOYMENT>
```

**Alternative Einzeiler (Agent klont selbst):**

```text
Clone this repository and deploy it end-to-end on Azure:
https://github.com/rashadbakirov/CybersecurityAIAgent.git
Use only the release setup docs: DEPLOYMENT_MIT_KI_AGENT.md and tasks/README.md.
Work interactively and ask for missing values.
Subscription ID: <YOUR_SUBSCRIPTION_ID>
Resource Group: <YOUR_RESOURCE_GROUP>
Azure OpenAI resource name: <YOUR_OPENAI_RESOURCE_NAME>
```

**Zero-Touch Prompt (ohne Rückfragen):**
- `docs/AGENT_ZERO_TOUCH_PROMPT.md`

### Option B: Manuelles Deployment

Kurzfassung: Für End‑to‑End sind Azure‑Ressourcen nötig (Cosmos DB + Fetcher + Storage; OpenAI optional).
Für Microsoft 365 Message Center/Service Health brauchst du eine Entra App mit Graph‑Berechtigungen.
Details und vollständige Anforderungen: `docs/DEPLOYMENT_MANUELL.md`.

Minimaler lokaler Start (UI):

1. `.env.example` nach `.env` kopieren und befüllen
2. Abhängigkeiten installieren:

```bash
cd cyberradar-portal
npm install
```

3. Development-Server starten:

```bash
npm run dev
```

Die Datenanreicherung erfolgt über Azure Functions im Ordner `cyberradar-fetcher`.
Hinweis: Ohne Cosmos DB und Fetcher laufen UI/Build, aber es gibt keine realen Daten.

### Betrieb & Taktung (Kurzüberblick)

- **Fetcher:** Azure Function alle 10 Minuten (mit source‑spezifischem Throttling).
- **Enrichment:** Timer alle 6 Stunden, verarbeitet bis zu 100 Alerts pro Lauf (benötigt Azure OpenAI).
- **Demo‑Daten:** `./scripts/seed-data.sh` (Linux/macOS) oder `pwsh -File scripts/seed-data.ps1` (Windows) lädt standardmäßig **3** bereits angereicherte Demo‑Alerts.
- **KI‑Chat:** Nutzt OpenAI, wenn konfiguriert; ohne OpenAI antwortet der Chat im Fallback‑Modus nur auf Basis der vorhandenen Alerts.

## Release Qualität

- Gate-Checklist: `docs/PUBLIC_RELEASE_GATE.md`
- Acceptance Tests: `docs/ACCEPTANCE_TESTS.md`
- Signoff-Protokoll: `docs/PUBLIC_RELEASE_SIGNOFF.md`
- Automatischer Hygiene-Check:
  - Linux/macOS/CI: `scripts/public-release-check.sh`
  - PowerShell: `scripts/public-release-check.ps1`

## Architektur

Eine detaillierte Architekturübersicht finden Sie in `ARCHITEKTUR.md`.
Kurzfassung für neue Nutzer: `docs/SYSTEM_OVERVIEW.md`.

## Datenquellen

Eine vollständige Übersicht der integrierten Feeds finden Sie in `docs/DATENQUELLEN.md`.

## Infrastruktur & Kosten

Details zu Azure-Ressourcen, Free-Tier-Optionen und Alternativen stehen in `INFRASTRUKTUR.md`.

## Screenshots

### Dashboard Übersicht
<!-- Screenshot: dashboard-overview.png -->
![Dashboard Übersicht](SCREENSHOTS/dashboard-overview.png)
Die zentrale Ansicht bündelt aktuelle Hinweise aus allen Quellen und macht deren Dringlichkeit sofort sichtbar.
Sie sehen KPIs (kritisch/hoch/mittel), Trends im Zeitverlauf, Quellenverteilung und die wichtigsten Alerts für die tägliche Lageeinschätzung.

### Bedrohungsdetails
<!-- Screenshot: threat-detail.png -->
![Bedrohungsdetails](SCREENSHOTS/threat-detail.png)
Die Detailansicht führt alle Kontextinformationen zusammen: Titel, Zusammenfassung, CVE-Referenzen, Exploit-Status,
betroffene Produkte sowie eine strukturierte Compliance-Einschätzung. So lässt sich in Sekunden entscheiden,
ob ein Hinweis technisch relevant ist und ob eine regulatorische Bewertung erforderlich sein könnte.

### Bedrohungsdetails (Erweiterte Ansicht)
<!-- Screenshot: threat-detail-2.png -->
![Bedrohungsdetails – erweitert](SCREENSHOTS/threat-detail-2.png)
Diese Ansicht zeigt die vertiefte Analyse inklusive zusätzlicher Fakten, Quellhinweisen und Priorisierungslogik.
Sie eignet sich besonders für Analysten, die eine fundierte Entscheidungsvorlage für IT- und Compliance-Verantwortliche erstellen.

### Compliance-Radar
<!-- Screenshot: compliance-radar.png -->
![Compliance-Radar](SCREENSHOTS/compliance-radar.png)
Das Compliance-Radar visualisiert, welche Meldungen potenziell NIS2-, DORA- oder DSGVO-relevant sind.
Die Darstellung hilft, regulatorische Risiken über einen Zeitraum zu erkennen und die Bearbeitung gezielt zu priorisieren.

### Meldepflicht-Assistent
<!-- Screenshot: meldepflicht-assistent.png -->
![Meldepflicht-Assistent](SCREENSHOTS/meldepflicht-assistent.png)
Der Assistent führt schrittweise durch die Bewertung einer möglichen Meldepflicht.
Er zeigt Hinweise, Fristen und empfohlene Maßnahmen, damit Teams nachvollziehbar dokumentieren können,
warum ein Vorfall gemeldet wurde oder nicht.

### KI-Analyse
<!-- Screenshot: ai-analysis.png -->
![KI-Analyse](SCREENSHOTS/ai-analysis.png)
Die KI-Analyse erstellt verständliche Zusammenfassungen, bewertet die Relevanz und liefert konkrete Handlungshinweise.
So lassen sich technische Details schnell in eine Management-taugliche Einschätzung übersetzen.
## Roadmap

- Vollständige Multi-Tenant-Architektur für MSPs
- Tenant-spezifische Relevanzfilterung
- Automatisierte Meldepflicht-Workflows (BSI, BaFin, LDA)
- CSAF/SBOM-gestütztes Schwachstellenmanagement
- Microsoft Sentinel Integration

## Lizenz

MIT-Lizenz – siehe `LICENSE`

## Stern nicht vergessen

Wenn Ihnen CyberLage gefällt, geben Sie dem Repository einen Stern.
Das hilft anderen, das Projekt zu entdecken.






