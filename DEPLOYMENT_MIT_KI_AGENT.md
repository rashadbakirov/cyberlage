# CyberLage Deployment With an AI Coding Agent

## For Human Operators

You need:
1. This repository (URL or local path)
2. An Azure account (free tier is enough for PoC)
3. An AI coding agent (Claude Code, Codex/ChatGPT, Copilot Workspace, Cursor/Windsurf)

The agent handles Azure resource creation, configuration, and deployment. You provide required inputs.

Expected final outcome:
`https://<WEBAPP_NAME>.azurewebsites.net`

Reference docs:
- `docs/ENVIRONMENT_MATRIX.md`
- `docs/AGENT_ZERO_TOUCH_PROMPT.md`

### Interactive Flow (Recommended)

1. Clone/open repository
2. Start AI agent
3. Provide:
   - Subscription ID
   - Resource Group (default: `demo_cyberRadar_de`)
   - Region (optional, default: `westeurope`)
   - Azure OpenAI resource name (if AI features are required)
   - Name prefix (optional, default: `cyberlage-demo-weu`)
   - If OpenAI cannot be auto-created: endpoint, key, deployment
   - Optional M365 app details for Message Center/Service Health:
     - `M365_TENANT_ID`
     - `M365_CLIENT_ID`
     - `M365_CLIENT_SECRET`

### Prompt for Claude Code

```text
Please deploy the CyberLage project from this repository.
First read DEPLOYMENT_MIT_KI_AGENT.md and then all files in tasks/ (see tasks/README.md).
Work step-by-step and ask me for missing information.
Resource Group: demo_cyberRadar_de.
I will provide Subscription ID next.
If M365 Message Center/Service Health is needed, I will provide tenant/client/secret.
Optional name prefix: cyberlage-demo-weu.
```

### Prompt for Codex/ChatGPT

```text
I want to deploy the CyberLage project. Repository path/url: [PATH_OR_URL].
Please read DEPLOYMENT_MIT_KI_AGENT.md and tasks/README.md.
Work interactively and ask for missing Azure values.
Resource Group: demo_cyberRadar_de.
Optional M365 values: M365_TENANT_ID, M365_CLIENT_ID, M365_CLIENT_SECRET.
Optional name prefix: cyberlage-demo-weu.
```

### Prompt (Agent Clones Repository Itself)

```text
Clone this repository and deploy CyberLage end-to-end:
https://github.com/rashadbakirov/cyberlage.git

Use DEPLOYMENT_MIT_KI_AGENT.md and tasks/README.md.
Work step-by-step and ask for missing info.

Subscription ID: <YOUR_SUBSCRIPTION_ID>
Resource Group: <YOUR_RESOURCE_GROUP>
Azure OpenAI resource name: <YOUR_OPENAI_RESOURCE_NAME>
Optional Name Prefix: cyberlage-demo-weu
```

---

## For AI Agents (Machine-Readable Rules)

### Core Principles
- Work interactively: explain each step, then confirm.
- No assumptions: ask when values are missing.
- Two modes:
  1. Create resources in Azure.
  2. Use existing resources provided by user.
- Do not stop on regional capacity issues: if Cosmos creation fails with `ServiceUnavailable`, try fallback regions (`germanywestcentral`, then `northeurope`).

### Naming Standard
Use `cyberlage-<env>-<region>` and append a stable suffix derived from subscription ID.
Example: `cyberlage-demo-weu-<suffix>`.

### Task Order
See `tasks/README.md`.

Important:
- `TASK_03` creates infrastructure only (including App Service/plan).
- Portal code deployment happens in `TASK_07`.

### Required After Deployment

- Functional validation: `tasks/TASK_08_VALIDATE.md`
- Hygiene gate:
  - Linux/macOS/CI: `scripts/public-release-check.sh`
  - PowerShell: `scripts/public-release-check.ps1`
- Signoff: `docs/PUBLIC_RELEASE_SIGNOFF.md`

### Microsoft 365 Feeds
For Message Center and Service Health, use an Entra app with:
- `ServiceMessage.Read.All`
- `ServiceHealth.Read.All`
- Admin consent

If M365 values are missing, skip M365 feeds and continue.

### Azure OpenAI Note
Azure OpenAI resource creation may be blocked in some subscriptions/regions.
If blocked, require:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT`

Without these, AI features (briefing/chat) remain disabled.

### Security and Quality
- AI agents can make configuration/deployment mistakes.
- Validate resources, cost, and app behavior after every run (`TASK_08_VALIDATE.md`).
