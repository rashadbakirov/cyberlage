# Public Release Gate

This gate must be fully green before publishing the `public_release` branch.

## 1. Scope

- Branch: `public_release`
- Goal: public demo variant without tenant-specific runtime features
- Result: reproducible deployment with final Azure web URL

## 2. Security and Hygiene

- No `.env` files tracked in git (`.env.example` is allowed)
- No ZIP/log/deployment artifacts tracked in git
- No internal exports, test dumps, or local tool config files tracked
- No known secret patterns in code/config
- Tenant-specific endpoints/features disabled or removed in public release

## 3. Documentation

- `README.md` explains:
  - what CyberLage is
  - what is available after deployment
  - quick start for humans and agents
  - warning that AI output can be wrong
- `DEPLOYMENT_MIT_KI_AGENT.md` includes:
  - clear inputs
  - prompt template
  - expected deployment result (URL)
- `tasks/README.md` and tasks are consistent and complete
- `docs/ENVIRONMENT_MATRIX.md` describes required/optional/fallback behavior

## 4. Deployment Readiness

- Standardized resource names (`cyberlage-<env>-<region>-<suffix>`)
- Full resource list documented
- Expected Cosmos containers documented:
  - `raw_alerts` (`/sourceId`)
  - `fetch_logs` (`/runId`)
  - `source_registry` (`/category`)
  - `alert_actions` (`/alertId`)
  - `alert_status` (`/alertId`)

## 5. Functional Validation (Must Pass)

- Home page loads (`HTTP 200`)
- API baseline works (`/api/stats`)
- Reporting warning is visible for relevant alerts (text + buttons)
- `Audit & Evidence` is not available as active workflow in public UI
- Footer contains:
  - `© 2025 CyberLage`
  - `Rashad Bakirov`
  - clickable LinkedIn link

## 6. Release Decision

- Gate check executed:
  - Linux/macOS/CI: `scripts/public-release-check.sh`
  - PowerShell: `scripts/public-release-check.ps1`
- Acceptance test matrix from `docs/ACCEPTANCE_TESTS.md` completed
- Signoff protocol in `docs/PUBLIC_RELEASE_SIGNOFF.md` completed
