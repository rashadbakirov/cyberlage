# Acceptance Tests (Public Release)

This matrix is for final release testing from the perspective of a new user.

## A. Discovery and Onboarding

1. Open repository.
2. Read `README.md`.
3. Must be able to answer clearly:
   - What does the tool do?
   - What do I get after deployment?
   - What is the fastest path?

Expected: clear start path without searching additional docs.

## B. Agent Deployment Path

1. Use zero-touch prompt from `docs/AGENT_ZERO_TOUCH_PROMPT.md`.
2. Agent executes tasks in `tasks/` sequentially.
3. Deployment ends with final URL.

Expected: no manual guesswork required.

## C. Infrastructure Validation

1. Web URL reachable (`HTTP 200`)
2. Cosmos DB includes required containers:
   - `raw_alerts`
   - `fetch_logs`
   - `source_registry`
   - `alert_actions`
   - `alert_status`
3. Fetcher runs on schedule.

## D. Functional Validation

1. Home page loads.
2. Alert list/detail page loads.
3. Reporting warning block contains:
   - `Possible NIS2 reporting obligation`
   - `Section 30 (1) No. 5 BSIG`
   - `24h reporting deadline`
   - `Affects us - Prepare report`
   - `Open BSI Portal`
4. Footer contains:
   - `Rashad Bakirov`
   - LinkedIn link
5. Public UI does not expose active audit/evidence workflow.

## E. Security and Cleanliness

1. Run `scripts/public-release-check.sh`.
2. Result must be `PASS`.

## F. Regression Repeatability

1. Run at least 3 full deployments from fresh context.
2. Every run ends with valid URL and green checks.
