# English Main Migration Checklist

Goal: make branch `main` fully English for public audience while preserving German content in branch `de`.

Rule: this migration is language/content only. Do not change product architecture, data model, or business logic.

## 0. Branch Setup

- [x] Create `main` branch in public repo.
- [x] Create `de` branch from current German baseline.
- [ ] Set GitHub default branch to `main`.
- [ ] Add branch protection for `main` and `de`.

## 1. Branch Routing in README

- [ ] In `main`, add top banner:
  - English (current): `main`
  - German version: `de`
- [ ] In `de`, add top banner:
  - Deutsche Version (aktuell): `de`
  - English version: `main`
- [ ] Ensure both branch links are clickable and valid.

## 2. Documentation Translation (Repository Root + docs/ + tasks/)

- [ ] Translate root docs to English:
  - `README.md`
  - `DEPLOYMENT_MIT_KI_AGENT.md`
  - `ARCHITEKTUR.md`
  - `INFRASTRUKTUR.md`
- [ ] Translate docs under `docs/` to English.
- [ ] Translate deployment tasks under `tasks/` to English.
- [ ] Keep filenames stable unless renaming is required for clarity.
- [ ] Ensure links and references remain valid after text changes.

## 3. Portal UI and UX Text (cyberradar-portal)

- [ ] Translate all UI labels/messages/pages to English.
- [ ] Remove mixed-language output in rendered UI (no German fallback in `main`).
- [ ] Update `src/lib/translations.ts` so English is complete and default.
- [ ] Translate page metadata (`title`, `description`) across routes.
- [ ] Translate API error strings returned to UI where user-visible.
- [ ] Translate script CLI output where it is user-facing.

## 4. AI Prompts and Generated Content Language

- [ ] Translate system/user prompts to English in `cyberradar-portal/src/lib/openai.ts`.
- [ ] Translate reporting-draft text templates in `cyberradar-portal/src/lib/meldepflicht.ts`.
- [ ] Verify generated briefings/chat answers/drafts are English by default.
- [ ] Keep legal references (NIS2/BSIG/DSGVO/DORA names/URLs) intact.

## 5. Fetcher, Enrichment, and Data Text

- [ ] Translate user-visible fetcher/enrichment text and summaries to English.
- [ ] Translate seeded demo content to English where applicable.
- [ ] Keep identifiers, field names, and storage schema unchanged.

## 6. Language Quality Gates

- [ ] Add audit commands/scripts to detect German leftovers in `main`.
- [ ] Run scan before each release (docs + portal + fetcher + tasks).
- [ ] Allowlist legal nouns and proper names where needed.
- [ ] Fail release check if non-allowlisted German content is found.

## 7. Validation

- [ ] UI smoke test: no German text visible in core pages.
- [ ] AI smoke test: briefing/chat/report draft responses are English.
- [ ] Deployment docs test: a new user can deploy using English docs only.
- [ ] Run hygiene check:
  - `scripts/public-release-check.sh` or
  - `pwsh -File scripts/public-release-check.ps1`

## 8. Release Handover

- [ ] Update screenshots/captions if they still show German-only UI text.
- [ ] Publish branch policy in `README.md`.
- [ ] Set repository default branch to `main`.
- [ ] Keep `de` branch as maintained German variant.

## Suggested Execution Order

1. Branch routing banners.
2. Core docs (`README.md`, deployment guide, `tasks/README.md`).
3. `cyberradar-portal/src/lib/translations.ts` and all user-visible UI text.
4. AI prompt/template translation.
5. Fetcher/enrichment wording.
6. Quality gates + final validation.
