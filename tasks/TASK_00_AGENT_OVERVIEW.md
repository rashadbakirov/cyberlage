# TASK_00_AGENT_OVERVIEW

## Ziel
Interaktives End‑to‑End Deployment, bei dem der Agent den Benutzer Schritt für Schritt führt.

## Arbeitsmodus (immer interaktiv)
- Der Agent erklärt jeden Schritt kurz und wartet auf Bestätigung.
- Keine Annahmen über bereits vorhandene Ressourcen.
- Wenn etwas fehlt: nachfragen, nicht raten.

## Zwei Modi
1. **Agent erstellt Ressourcen** (Standard)
2. **Benutzer liefert vorhandene Ressourcen-Daten**

## Zero-Touch Modus

Wenn der Benutzer alle Werte vollständig vorgibt (siehe `docs/AGENT_ZERO_TOUCH_PROMPT.md`), führt der Agent ohne Rückfragen aus und liefert am Ende:
- Ressourcennamen
- finale URL
- Validierungsbericht

## Hinweis zu Azure OpenAI
Die Erstellung eines Azure OpenAI Resources kann blockiert sein. In diesem Fall:
- Den Benutzer um **OpenAI-Endpunkt/Key/Deployment** bitten.
- Ohne diese Werte funktionieren KI‑Features (Briefing/Chat) nicht.
