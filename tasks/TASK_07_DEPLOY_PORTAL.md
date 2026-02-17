# TASK_07_DEPLOY_PORTAL

## Bash

```bash
bash scripts/deploy-portal.sh "$WEBAPP_NAME" "$AZURE_RESOURCE_GROUP"
```

## PowerShell

```powershell
pwsh -File scripts/deploy-portal.ps1 -WebAppName "$WEBAPP_NAME" -ResourceGroup "$AZURE_RESOURCE_GROUP"
```

Note:
- The portal build includes a mandatory env precheck (`cyberradar-portal/scripts/prebuild-check.js`).
- `TASK_07` deploys code only; infrastructure must already exist from `TASK_03`.

After deploy:
- URL: `https://<WEBAPP_NAME>.azurewebsites.net`
