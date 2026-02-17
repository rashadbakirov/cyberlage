# Public Release Gate

Dieser Gate-Check muss vor jeder Veröffentlichung des `private-release` Branches vollständig grün sein.

## 1. Scope

- Branch: `private-release`
- Ziel: öffentliche Demo-Version ohne tenant-spezifische Funktionen
- Ergebnis: reproduzierbares Deployment mit finaler Azure Web URL

## 2. Security & Hygiene

- Keine `.env`-Dateien im Git-Index (`.env.example` ist erlaubt)
- Keine ZIP-/Log-/Deployment-Artefakte im Git-Index
- Keine internen Report-Exporte, Testdumps oder lokalen Tool-Konfigurationsdateien
- Keine bekannten Secret-Pattern im Code/Config
- Tenant-spezifische Endpunkte/Funktionen in Public-Version deaktiviert oder entfernt

## 3. Documentation

- `README.md` erklärt:
  - Was CyberLage ist
  - Was nach Deployment konkret verfügbar ist
  - Schnellstart für Menschen und Agenten
  - Warnhinweis (KI kann falsch liegen, Ressourcen prüfen)
- `DEPLOYMENT_MIT_KI_AGENT.md` enthält:
  - klare Inputs
  - Prompt-Vorlage
  - erwartetes Deployment-Ergebnis (URL)
- `tasks/README.md` + Tasks sind konsistent und vollständig
- `docs/ENVIRONMENT_MATRIX.md` beschreibt Pflicht/Optional/Fallback

## 4. Deployment Readiness

- Standardisierte Ressourcennamen (`cyberlage-<env>-<region>-<suffix>`)
- Vollständige Ressourcenliste dokumentiert
- Erwartete Cosmos-Container dokumentiert:
  - `raw_alerts` (`/sourceId`)
  - `fetch_logs` (`/runId`)
  - `source_registry` (`/category`)
  - `alert_actions` (`/alertId`)
  - `alert_status` (`/alertId`)

## 5. Functional Validation (must pass)

- Startseite lädt (`HTTP 200`)
- API-Basis funktioniert (`/api/stats`)
- Meldepflicht-Hinweis sichtbar für relevante Alerts (Text + Buttons)
- `Audit & Nachweis` in Public-UI nicht als aktiver Workflow verfügbar
- Footer enthält:
  - `© 2025 CyberLage`
  - `Rashad Bakirov`
  - klickbaren LinkedIn-Link

## 6. Release Decision

- Gate-Check ausgeführt:
  - Linux/macOS/CI: `scripts/public-release-check.sh`
  - PowerShell: `scripts/public-release-check.ps1`
- Acceptance Test Matrix aus `docs/ACCEPTANCE_TESTS.md` abgeschlossen
- Signoff-Protokoll in `docs/PUBLIC_RELEASE_SIGNOFF.md` ausgefüllt
