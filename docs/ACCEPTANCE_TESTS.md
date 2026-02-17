# Acceptance Tests (Public Release)

Diese Matrix ist für den finalen Release-Test aus Sicht eines neuen Nutzers.

## A. Discovery & Onboarding

1. Repository öffnen.
2. `README.md` lesen.
3. Erwartung klar beantworten können:
   - Was macht das Tool?
   - Was bekomme ich nach Deployment?
   - Welcher Pfad ist der schnellste?

Erwartung: Ohne zusätzliche Dokumentensuche ist der Startpfad klar.

## B. Agent Deployment Path

1. Zero-Touch Prompt aus `docs/AGENT_ZERO_TOUCH_PROMPT.md` verwenden.
2. Agent führt Aufgaben in `tasks/` sequentiell aus.
3. Deployment endet mit finaler URL.

Erwartung: Kein manueller Rateschritt nötig.

## C. Infrastructure Validation

1. Web URL erreichbar (`HTTP 200`)
2. Cosmos DB enthält erforderliche Container:
   - `raw_alerts`
   - `fetch_logs`
   - `source_registry`
   - `alert_actions`
   - `alert_status`
3. Fetcher läuft zeitgesteuert.

## D. Functional Validation

1. Startseite lädt.
2. Meldungsliste/Detailseite lädt.
3. Meldepflicht-Warnblock enthält:
   - `Mögliche NIS2-Meldepflicht`
   - `§30 Abs. 1 Nr. 5 BSIG`
   - `24h Meldefrist`
   - `Betrifft uns — Meldung vorbereiten`
   - `Direkt zum BSI-Portal`
4. Footer enthält:
   - `Rashad Bakirov`
   - LinkedIn-Link
5. Public-UI zeigt keinen aktiven Audit/Nachweis-Workflow.

## E. Security & Cleanliness

1. `scripts/public-release-check.sh` ausführen.
2. Ergebnis muss `PASS` sein.

## F. Regression Repeatability

1. Mindestens 3 komplette Deploy-Läufe aus frischem Kontext.
2. Jeder Lauf liefert gültige URL und grüne Tests.
