$ErrorActionPreference = "Stop"

function Write-Section([string]$Title) {
  Write-Host ""
  Write-Host "== $Title =="
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$failed = $false

function Fail-WithMatches([string]$Label, [array]$Matches) {
  if ($Matches.Count -gt 0) {
    $script:failed = $true
    Write-Host "[FAIL] $Label"
    $Matches | ForEach-Object { Write-Host $_ }
  } else {
    Write-Host "[OK] $Label"
  }
}

Write-Section "Public Release Hygiene Check"
Write-Host "Repository: $root"

$tracked = git ls-files

Write-Section "Blocked Tracked File Patterns"

$envTracked = $tracked | Where-Object {
  ($_ -match '(^|/)\.env($|\.|/)') -and ($_ -notmatch '\.env\.example$')
}
Fail-WithMatches "No tracked .env files (except .env.example)" $envTracked

$localSettings = $tracked | Where-Object {
  ($_ -match '(^|/)local\.settings\.json$') -or ($_ -match '(^|/)\.claude/settings\.local\.json$')
}
Fail-WithMatches "No tracked local settings files" $localSettings

$artifacts = $tracked | Where-Object {
  ($_ -match '\.zip$') -or ($_ -match '(^|/)portal-deploy') -or ($_ -match '(^|/)portal-standalone') -or ($_ -match '(^|/)webapp-logs')
}
Fail-WithMatches "No tracked archives/log artifacts" $artifacts

$internalExports = $tracked | Where-Object {
  ($_ -match '(^|/)docs/reports/') -or ($_ -match '(^|/)portal-code-export\.txt$') -or ($_ -match '(^|/)archive-old-projects/')
}
Fail-WithMatches "No tracked internal exports/reports" $internalExports

Write-Section "Basic Secret Pattern Check"
$secretOutput = git grep -nE '-----BEGIN (RSA |EC )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}' -- . 2>$null
$secretMatches = @()
if ($secretOutput) { $secretMatches = $secretOutput -split "`n" | Where-Object { $_.Trim() -ne "" } }
Fail-WithMatches "No obvious committed secrets" $secretMatches

Write-Section "Required Public Docs"
$requiredDocs = @(
  "README.md",
  "DEPLOYMENT_MIT_KI_AGENT.md",
  "tasks/README.md",
  "docs/PUBLIC_RELEASE_GATE.md",
  "docs/ENVIRONMENT_MATRIX.md",
  "docs/AGENT_ZERO_TOUCH_PROMPT.md",
  "docs/ACCEPTANCE_TESTS.md",
  "docs/PUBLIC_RELEASE_SIGNOFF.md",
  "docs/SYSTEM_OVERVIEW.md"
)

foreach ($file in $requiredDocs) {
  if (Test-Path $file) {
    Write-Host "[OK] $file"
  } else {
    $failed = $true
    Write-Host "[FAIL] missing required doc: $file"
  }
}

Write-Section "Optional Local Warnings (Not Failing)"
$untracked = git ls-files --others --exclude-standard
$suspects = $untracked | Where-Object {
  ($_ -match '(^|/)\.env($|\.|/)') -or
  ($_ -match '\.zip$') -or
  ($_ -match '(^|/)portal-deploy') -or
  ($_ -match '(^|/)portal-standalone') -or
  ($_ -match '(^|/)webapp-logs')
}
if ($suspects.Count -gt 0) {
  Write-Host "[WARN] suspicious untracked local artifacts found:"
  $suspects | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "[OK] no suspicious untracked local artifacts detected"
}

Write-Section "Result"
if ($failed) {
  Write-Host "PUBLIC RELEASE CHECK: FAIL"
  exit 1
}

Write-Host "PUBLIC RELEASE CHECK: PASS"
