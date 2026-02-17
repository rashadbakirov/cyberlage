# TASK_06_DEPLOY_FETCHER

```bash
cd cyberradar-fetcher
npm install
npm run build
func azure functionapp publish "$FUNCTION_APP" --typescript
```

Expected result: Function App is online and running on schedule.

Schedule:
- Fetch timer: every 10 minutes
- Enrichment timer: every 6 hours (up to 100 alerts per run)
- Re-enrichment timer: disabled by default (enable only if needed)
