# Deployment Tasks (AI Agent, Step by Step)

These tasks are intended for AI coding agents (Claude/Codex) and guide an interactive end-to-end deployment.

The agent performs all steps (resource creation, configuration, deployment).

Required inputs:
- Azure Subscription ID
- Azure Resource Group
- Azure OpenAI resource name (if AI features are required)

Optional:
- Microsoft 365 feeds (`M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET`)

Expected final result:
- Running app URL: `https://<WEBAPP_NAME>.azurewebsites.net`

Important: AI agents can make mistakes. `TASK_08_VALIDATE.md` is mandatory.

References:
- Inputs/Fallbacks: `docs/ENVIRONMENT_MATRIX.md`
- Zero-touch prompt: `docs/AGENT_ZERO_TOUCH_PROMPT.md`
- Public gate: `docs/PUBLIC_RELEASE_GATE.md`
- Signoff: `docs/PUBLIC_RELEASE_SIGNOFF.md`

## Order

1. `TASK_00_AGENT_OVERVIEW.md`
2. `TASK_01_PREREQUISITES.md`
3. `TASK_02_INPUTS.md`
4. `TASK_03_CREATE_RESOURCES.md`
5. `TASK_04_ENV_AND_SETTINGS.md`
6. `TASK_05_SEED_DATA.md`
7. `TASK_06_DEPLOY_FETCHER.md`
8. `TASK_07_DEPLOY_PORTAL.md`
9. `TASK_08_VALIDATE.md`
10. `TASK_09_SIGNOFF.md`
