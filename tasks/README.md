# Deployment Tasks (KI-Agent, Schritt für Schritt)

Diese Tasks sind für KI-Coding-Agenten (Claude/Codex) gedacht und führen interaktiv durch das komplette Deployment.
Der KI-Agent führt alle Schritte aus (Ressourcen anlegen, Konfiguration, Deployment).
Benötigt werden nur Subscription-ID, Resource Group und – falls KI genutzt wird – der Azure OpenAI Ressourcen‑Name.
Optional können Microsoft 365 Feeds aktiviert werden (Entra App: M365_TENANT_ID, M365_CLIENT_ID, M365_CLIENT_SECRET).
Bei korrekten Parametern liefert der Ablauf am Ende eine lauffähige App-URL (`https://<WEBAPP_NAME>.azurewebsites.net`).

Hinweis: KI-Agenten können Fehler machen. `TASK_08_VALIDATE.md` ist verpflichtend.

Referenzen:
- Inputs/Fallbacks: `docs/ENVIRONMENT_MATRIX.md`
- Zero-Touch Prompt: `docs/AGENT_ZERO_TOUCH_PROMPT.md`
- Public Gate: `docs/PUBLIC_RELEASE_GATE.md`
- Signoff: `docs/PUBLIC_RELEASE_SIGNOFF.md`


## Reihenfolge

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
