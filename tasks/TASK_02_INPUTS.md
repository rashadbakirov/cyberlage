# TASK_02_INPUTS

## Collect From User (Interactive)

Reference: `docs/ENVIRONMENT_MATRIX.md`

Required:
- Azure Subscription ID
- Resource Group name (default: `demo_cyberRadar_de`)

Optional (defaults can be used):
- Region (default: `westeurope`)

Optional/recommended:
- Azure OpenAI resource name (if AI features are needed)
- Name prefix (default: `cyberlage-demo-weu`)
- Existing resource names (if already created)

Optional (Microsoft 365 feeds):
- `M365_TENANT_ID`
- `M365_CLIENT_ID`
- `M365_CLIENT_SECRET`
- Entra app requires `ServiceMessage.Read.All` and `ServiceHealth.Read.All` with admin consent

## Azure OpenAI (if not auto-creatable)
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT`

## Agent Variable Format

```bash
AZURE_SUBSCRIPTION_ID=...
AZURE_RESOURCE_GROUP=demo_cyberRadar_de
AZURE_REGION=westeurope
NAME_PREFIX=cyberlage-demo-weu
```

## Naming Standard (Recommended)
Use stable professional names without random values. Derive suffix from subscription ID.

```bash
ENV_TAG=demo
REGION_TAG=weu
NAME_PREFIX="cyberlage-${ENV_TAG}-${REGION_TAG}"

SUB_ID_SHORT=$(echo "$AZURE_SUBSCRIPTION_ID" | tr -cd 'a-z0-9' | cut -c1-6)
NAME_PREFIX_SAFE=$(echo "$NAME_PREFIX" | tr -cd 'a-z0-9')
UNIQUE_SUFFIX="$SUB_ID_SHORT"
```
