# TASK_07_DEPLOY_PORTAL

## Bash

```bash
bash scripts/deploy-portal.sh "$WEBAPP_NAME" "$AZURE_RESOURCE_GROUP"
```

## PowerShell

```powershell
pwsh -File scripts/deploy-portal.ps1 -WebAppName "$WEBAPP_NAME" -ResourceGroup "$AZURE_RESOURCE_GROUP"
```

Hinweis:
- Das Portal-Build enthält einen verpflichtenden Env-Precheck (`cyberradar-portal/scripts/prebuild-check.js`).
- `TASK_07` führt nur den Code-Deploy aus; Infrastruktur muss bereits aus `TASK_03` existieren.

Nach dem Deploy:
- URL: `https://<WEBAPP_NAME>.azurewebsites.net`
