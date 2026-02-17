$ErrorActionPreference = "Stop"

function Write-Log([string]$Message) {
  Write-Host "[CyberLage Seed] $Message"
}

function Fail([string]$Message) {
  throw "[CyberLage Seed] ERROR: $Message"
}

function Load-DotEnv([string]$Path) {
  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    if ($line.StartsWith("#")) { return }

    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }

    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()

    if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
      $value = $value.Substring(1, $value.Length - 2)
    } elseif ($value.StartsWith("'") -and $value.EndsWith("'") -and $value.Length -ge 2) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [Environment]::SetEnvironmentVariable($key, $value, "Process")
  }
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root ".env"

if (-not (Test-Path $envFile)) {
  Fail ".env is missing. Copy .env.example to .env and fill required values."
}

Load-DotEnv -Path $envFile

$cosmosEndpoint = $env:COSMOS_ENDPOINT
if ([string]::IsNullOrWhiteSpace($cosmosEndpoint)) {
  $cosmosEndpoint = $env:COSMOS_DB_ENDPOINT
}

$cosmosKey = $env:COSMOS_KEY
if ([string]::IsNullOrWhiteSpace($cosmosKey)) {
  $cosmosKey = $env:COSMOS_DB_KEY
}

$cosmosDatabase = $env:COSMOS_DATABASE
if ([string]::IsNullOrWhiteSpace($cosmosDatabase)) {
  $cosmosDatabase = $env:COSMOS_DB_DATABASE
}
if ([string]::IsNullOrWhiteSpace($cosmosDatabase)) {
  $cosmosDatabase = "cyberradar"
}

$cosmosContainer = $env:COSMOS_CONTAINER
if ([string]::IsNullOrWhiteSpace($cosmosContainer)) {
  $cosmosContainer = $env:COSMOS_DB_CONTAINER_THREATS
}
if ([string]::IsNullOrWhiteSpace($cosmosContainer)) {
  $cosmosContainer = "raw_alerts"
}

if ([string]::IsNullOrWhiteSpace($cosmosEndpoint) -or [string]::IsNullOrWhiteSpace($cosmosKey)) {
  Fail "COSMOS_ENDPOINT/COSMOS_KEY are required (or COSMOS_DB_ENDPOINT/COSMOS_DB_KEY)."
}

[Environment]::SetEnvironmentVariable("COSMOS_ENDPOINT", $cosmosEndpoint, "Process")
[Environment]::SetEnvironmentVariable("COSMOS_KEY", $cosmosKey, "Process")
[Environment]::SetEnvironmentVariable("COSMOS_DATABASE", $cosmosDatabase, "Process")
[Environment]::SetEnvironmentVariable("COSMOS_CONTAINER", $cosmosContainer, "Process")

Write-Log "Loading demo data into Cosmos DB"
Set-Location (Join-Path $root "cyberradar-portal")
node ../scripts/seed-data.js
Write-Log "Seed completed"
