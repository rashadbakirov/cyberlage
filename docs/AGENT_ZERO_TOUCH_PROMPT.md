# Agent Zero-Touch Prompt

Copy this prompt 1:1 into your AI coding agent.

```text
Clone and deploy this repository end-to-end on Azure using branch main:
https://github.com/rashadbakirov/cyberlage.git

Read and execute in this order:
1) README.md
2) DEPLOYMENT_MIT_KI_AGENT.md
3) tasks/README.md
4) all task files in order

Do not ask follow-up questions.
Use provided values and defaults.
If optional values are missing, disable that feature and continue.

Fixed inputs:
AZURE_SUBSCRIPTION_ID=<YOUR_SUBSCRIPTION_ID>
AZURE_RESOURCE_GROUP=<YOUR_RESOURCE_GROUP>
AZURE_REGION=westeurope
NAME_PREFIX=cyberlage-demo-weu

OpenAI:
AZURE_OPENAI_ENDPOINT=<YOUR_OPENAI_ENDPOINT>
AZURE_OPENAI_API_KEY=<YOUR_OPENAI_KEY>
AZURE_OPENAI_KEY=<YOUR_OPENAI_KEY>
AZURE_OPENAI_DEPLOYMENT=<YOUR_OPENAI_DEPLOYMENT>
AZURE_OPENAI_MODEL=gpt-4o
AZURE_OPENAI_API_VERSION=2024-10-21

M365 (optional):
M365_TENANT_ID=<OPTIONAL>
M365_CLIENT_ID=<OPTIONAL>
M365_CLIENT_SECRET=<OPTIONAL>

Portal:
NEXTAUTH_SECRET=<YOUR_NEXTAUTH_SECRET>
ENCRYPTION_KEY=<64_HEX_CHARS>

Expected output:
- Created/used Azure resources list
- Applied app settings list (redact secrets)
- Final URL: https://<WEBAPP_NAME>.azurewebsites.net
- Validation report for task TASK_08_VALIDATE.md
```

## Notes

- Variable details: `docs/ENVIRONMENT_MATRIX.md`
- Validation steps: `docs/ACCEPTANCE_TESTS.md`
