# TASK_08_VALIDATE

## Portal prüfen

- Startseite lädt (`HTTP 200`)
- `GET /api/stats` liefert JSON
- Footer enthält `Rashad Bakirov` + LinkedIn-Link

## Public-UI Scope prüfen

- Meldepflicht-Block auf relevanter Meldung enthält:
  - `Mögliche NIS2-Meldepflicht`
  - `§30 Abs. 1 Nr. 5 BSIG`
  - `24h Meldefrist`
  - `Betrifft uns — Meldung vorbereiten`
  - `Direkt zum BSI-Portal`
- Audit/Nachweise sind in Public-UI nicht als aktiver Workflow verfügbar

## Cosmos DB prüfen

- Container vorhanden:
  - `raw_alerts`
  - `fetch_logs`
  - `source_registry`
  - `alert_actions`
  - `alert_status`
- `raw_alerts` enthält Daten (Live- oder Seed-Daten)

## Function App prüfen

- Logs zeigen regelmäßige Runs
- Wenn `M365_*` gesetzt: Message Center/Service Health Quellen sichtbar
- Wenn `M365_*` leer: M365-Sources werden sauber übersprungen

## KI‑Chat prüfen

- Mit OpenAI konfiguriert: Antworten mit Quellen
- Ohne OpenAI: Fallback-Antworten aus vorhandenen Alerts

## Public Gate ausführen

```bash
bash scripts/public-release-check.sh
```

PowerShell:

```powershell
pwsh -File scripts/public-release-check.ps1
```

Wenn etwas fehlt: beheben, dann TASK_08 erneut vollständig ausführen.
