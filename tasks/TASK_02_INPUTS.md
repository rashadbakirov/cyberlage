# TASK_02_INPUTS

## Benutzer liefert (interaktiv abfragen)

Referenz: `docs/ENVIRONMENT_MATRIX.md`

**Pflicht:**
- Azure Subscription ID
- Resource Group Name (Standard: `demo_cyberRadar_de`)

**Optional (Default wird genutzt):**
- Region (Standard: `westeurope`)

**Optional/empfohlen:**
- Azure OpenAI Ressourcen‑Name (falls KI gewünscht)
- Namenspräfix (Standard: `cyberlage-demo-weu`)
- Bereits vorhandene Ressourcennamen (falls vorhanden)

**Optional (Microsoft 365 Feeds):**
- `M365_TENANT_ID`
- `M365_CLIENT_ID`
- `M365_CLIENT_SECRET`
- Hinweis: Entra App mit `ServiceMessage.Read.All` + `ServiceHealth.Read.All` (Admin Consent erforderlich)

## Azure OpenAI (falls nicht automatisch erstellbar)
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT`

## Antwortformat (für Agent)
Agent speichert die Werte als Variablen:

```bash
AZURE_SUBSCRIPTION_ID=...
AZURE_RESOURCE_GROUP=demo_cyberRadar_de
AZURE_REGION=westeurope
NAME_PREFIX=cyberlage-demo-weu
```

## Namensstandard (empfohlen)
Ziel: konsistente, professionelle Namen ohne Zufallsanteil. Der Agent leitet einen stabilen Suffix aus der Subscription‑ID ab.

```bash
ENV_TAG=demo
REGION_TAG=weu
NAME_PREFIX="cyberlage-${ENV_TAG}-${REGION_TAG}"

SUB_ID_SHORT=$(echo "$AZURE_SUBSCRIPTION_ID" | tr -cd 'a-z0-9' | cut -c1-6)
NAME_PREFIX_SAFE=$(echo "$NAME_PREFIX" | tr -cd 'a-z0-9')
UNIQUE_SUFFIX="$SUB_ID_SHORT"
```
