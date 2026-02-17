# TASK_06_DEPLOY_FETCHER

```bash
cd cyberradar-fetcher
npm install
npm run build
func azure functionapp publish "$FUNCTION_APP" --typescript
```

Erwartung: Function App ist online und läuft planmäßig.

Taktung:
- Fetch‑Timer: alle 10 Minuten
- Enrichment‑Timer: alle 6 Stunden (bis zu 100 Alerts pro Lauf)
- Re‑Enrichment‑Timer: standardmäßig deaktiviert (nur bei Bedarf aktivieren)
