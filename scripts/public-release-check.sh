#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FAILED=0

print_section() {
  echo
  echo "== $1 =="
}

fail_with_matches() {
  local label="$1"
  local matches="$2"
  if [[ -n "$matches" ]]; then
    FAILED=1
    echo "[FAIL] $label"
    echo "$matches"
  else
    echo "[OK] $label"
  fi
}

print_section "Public Release Hygiene Check"
echo "Repository: $ROOT_DIR"

TRACKED_FILES="$(git ls-files)"

print_section "Blocked Tracked File Patterns"

fail_with_matches \
  "No tracked .env files (except .env.example)" \
  "$(echo "$TRACKED_FILES" | grep -E '(^|/)\.env($|\.|/)' | grep -Ev '\.env\.example$' || true)"

fail_with_matches \
  "No tracked local settings files" \
  "$(echo "$TRACKED_FILES" | grep -E '(^|/)local\.settings\.json$|(^|/)\.claude/settings\.local\.json$' || true)"

fail_with_matches \
  "No tracked archives/log artifacts" \
  "$(echo "$TRACKED_FILES" | grep -E '\.zip$|(^|/)portal-deploy|(^|/)portal-standalone|(^|/)webapp-logs' || true)"

fail_with_matches \
  "No tracked internal exports/reports" \
  "$(echo "$TRACKED_FILES" | grep -E '(^|/)docs/reports/|(^|/)portal-code-export\.txt$|(^|/)archive-old-projects/' || true)"

print_section "Basic Secret Pattern Check"
SECRET_MATCHES="$(git grep -nE '-----BEGIN (RSA |EC )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}' -- . || true)"
fail_with_matches "No obvious committed secrets" "$SECRET_MATCHES"

print_section "Required Public Docs"
REQUIRED_DOCS=(
  "README.md"
  "DEPLOYMENT_MIT_KI_AGENT.md"
  "tasks/README.md"
  "docs/PUBLIC_RELEASE_GATE.md"
  "docs/ENVIRONMENT_MATRIX.md"
  "docs/AGENT_ZERO_TOUCH_PROMPT.md"
  "docs/ACCEPTANCE_TESTS.md"
  "docs/PUBLIC_RELEASE_SIGNOFF.md"
  "docs/SYSTEM_OVERVIEW.md"
)

for file in "${REQUIRED_DOCS[@]}"; do
  if [[ -f "$file" ]]; then
    echo "[OK] $file"
  else
    FAILED=1
    echo "[FAIL] missing required doc: $file"
  fi
done

print_section "Optional Local Warnings (Not Failing)"
UNTRACKED_SUSPECTS="$(git ls-files --others --exclude-standard | grep -E '(^|/)\.env($|\.|/)|\.zip$|(^|/)portal-deploy|(^|/)portal-standalone|(^|/)webapp-logs' || true)"
if [[ -n "$UNTRACKED_SUSPECTS" ]]; then
  echo "[WARN] suspicious untracked local artifacts found:"
  echo "$UNTRACKED_SUSPECTS"
else
  echo "[OK] no suspicious untracked local artifacts detected"
fi

print_section "Result"
if [[ "$FAILED" -ne 0 ]]; then
  echo "PUBLIC RELEASE CHECK: FAIL"
  exit 1
fi

echo "PUBLIC RELEASE CHECK: PASS"
