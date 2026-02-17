# CyberLage Deployment mit KI-Coding-Agent

## Für den Benutzer (Mensch)

Sie benötigen:
1. Dieses Repository (URL oder lokaler Pfad)
2. Ein Azure-Konto (für PoC reicht die kostenlose Stufe)
3. Einen KI-Coding-Agent (Claude Code, Codex/ChatGPT, Copilot Workspace, Cursor/Windsurf)

Der Agent übernimmt die Erstellung der Azure-Ressourcen, Konfiguration und das Deployment. Sie liefern nur die nötigen Eingaben (siehe unten).
Wenn alle Parameter korrekt sind, endet der Ablauf mit einer produktiv erreichbaren URL:
`https://<WEBAPP_NAME>.azurewebsites.net`

Pflicht-Inputs und Fallback-Regeln stehen in:
- `docs/ENVIRONMENT_MATRIX.md`
- `docs/AGENT_ZERO_TOUCH_PROMPT.md`

### Interaktiver Ablauf (empfohlen)

1. Repository klonen
2. KI-Agent starten
3. Dem Agenten folgende Information geben:
   - **Subscription ID**
   - **Resource Group** (Standard: `demo_cyberRadar_de`)
   - **Region** (optional, Standard: `westeurope`)
   - **Azure OpenAI Ressourcen‑Name** (falls KI gewünscht)
   - **Name Prefix** (optional, Standard: `cyberlage-demo-weu`)
   - Falls Azure OpenAI nicht automatisch erstellbar ist: **Endpoint, Key, Deployment**
   - **Microsoft 365 Enterprise App** (optional für Message Center/Service Health): Tenant ID, Client ID, Client Secret

### Prompt für Claude Code
```
Bitte deploye das CyberLage-Projekt aus diesem Repository.
Lies zuerst DEPLOYMENT_MIT_KI_AGENT.md und danach alle Dateien im Ordner tasks/ (siehe tasks/README.md).
Arbeite Schritt für Schritt und frage mich nach fehlenden Informationen.
Meine Resource Group lautet demo_cyberRadar_de. Subscription-ID nenne ich dir gleich.
Falls M365 Message Center/Service Health gewünscht: Ich gebe dir Tenant ID, Client ID, Client Secret einer Entra App.
Optionaler Name Prefix: cyberlage-demo-weu.
```

### Prompt für Codex/ChatGPT
```
Ich möchte das CyberLage-Projekt deployen. Das Repository ist [PFAD].
Bitte lies DEPLOYMENT_MIT_KI_AGENT.md und die Tasks unter tasks/README.md.
Arbeite interaktiv und frage mich nach Subscription-ID und fehlenden Azure-Infos.
Resource Group: demo_cyberRadar_de.
Optional (M365 Message Center/Service Health): M365_TENANT_ID, M365_CLIENT_ID, M365_CLIENT_SECRET.
Optional Name Prefix: cyberlage-demo-weu.
```

### Prompt (Agent soll selbst klonen)
```
Clone this repository and deploy CyberLage end-to-end:
https://github.com/rashadbakirov/CybersecurityAIAgent.git

Use DEPLOYMENT_MIT_KI_AGENT.md and tasks/README.md.
Work step-by-step and ask for missing info.

Subscription ID: <YOUR_SUBSCRIPTION_ID>
Resource Group: <YOUR_RESOURCE_GROUP>
Azure OpenAI resource name: <YOUR_OPENAI_RESOURCE_NAME>
Optional Name Prefix: cyberlage-demo-weu
```

---

## Für den KI-Agent (maschinenlesbare Anweisungen)

### Grundprinzipien
- **Interaktiv arbeiten:** jeden Schritt erklären, dann bestätigen lassen.
- **Keine Annahmen:** wenn Daten fehlen, nachfragen.
- **Zwei Modi:**
  1. Agent erstellt Ressourcen in Azure.
  2. Benutzer liefert vorhandene Ressourcen-Details.
- **Bei Region-Kapazität nicht stoppen:** Wenn Cosmos DB in der Zielregion nicht erstellt werden kann (`ServiceUnavailable`), automatisch Fallback-Regionen versuchen (empfohlen: `germanywestcentral`, danach `northeurope`).

### Namensstandard
Der Agent verwendet `cyberlage-<env>-<region>` als Prefix und ergänzt einen stabilen Suffix aus der Subscription‑ID.
Beispiel: `cyberlage-demo-weu-<suffix>`.

### Task-Reihenfolge
Siehe `tasks/README.md`.

Wichtig:
- `TASK_03` erstellt nur Infrastruktur (inkl. Web App/Plan).
- Der eigentliche Portal-Code-Deploy erfolgt in `TASK_07`.

### Nach dem Deployment (Pflicht)

- Funktionale Validierung via `tasks/TASK_08_VALIDATE.md`
- Hygiene/Gate-Check:
  - Linux/macOS/CI: `scripts/public-release-check.sh`
  - PowerShell: `scripts/public-release-check.ps1`
- Signoff via `docs/PUBLIC_RELEASE_SIGNOFF.md`

### Hinweis zu Microsoft 365 Feeds
Für Message Center & Service Health wird eine **Entra App** mit Graph‑Berechtigungen benötigt:
- Application permissions: `ServiceMessage.Read.All`, `ServiceHealth.Read.All`
- Admin Consent erforderlich
- Agent fragt nach `M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET` (sonst wird M365 übersprungen)

### Hinweis zu Azure OpenAI
Die Erstellung eines Azure OpenAI Resources kann blockiert sein. In diesem Fall:
- Benutzer liefert `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, `AZURE_OPENAI_DEPLOYMENT`.
- Ohne diese Werte sind KI-Features (Briefing/Chat) deaktiviert.

### Sicherheits- und Qualitäts-Hinweis
- KI-Agenten können Konfigurations- oder Deploy-Fehler machen.
- Nach jedem Lauf Ressourcen, Kosten und App-Funktion immer verifizieren (Task `TASK_08_VALIDATE.md`).
