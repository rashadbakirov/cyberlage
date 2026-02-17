# TASK_08_VALIDATE

## Validate Portal

- Home page loads (`HTTP 200`)
- `GET /api/stats` returns JSON
- Footer contains `Rashad Bakirov` and LinkedIn link

## Validate Public UI Scope

- Reporting block on relevant alert contains:
  - `Possible NIS2 reporting obligation`
  - `Section 30 (1) No. 5 BSIG`
  - `24h reporting deadline`
  - `Affects us - Prepare report`
  - `Open BSI Portal`
- `Audit & Evidence` is not available as an active workflow in public UI

## Validate Cosmos DB

- Containers exist:
  - `raw_alerts`
  - `fetch_logs`
  - `source_registry`
  - `alert_actions`
  - `alert_status`
- `raw_alerts` contains data (live or seeded)

## Validate Function App

- Logs show recurring runs
- If `M365_*` is set: Message Center/Service Health sources are visible
- If `M365_*` is empty: M365 sources are skipped cleanly

## Validate AI Chat

- With OpenAI configured: responses include sources
- Without OpenAI: fallback responses are generated from existing alerts

## Run Public Gate

```bash
bash scripts/public-release-check.sh
```

PowerShell:

```powershell
pwsh -File scripts/public-release-check.ps1
```

If anything fails: fix and rerun `TASK_08` fully.
