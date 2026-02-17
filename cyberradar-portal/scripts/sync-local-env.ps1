param(
  [string]$ResourceGroup = "<DEIN_RESOURCE_GROUP>",
  [string]$WebAppName = "<DEINE_PORTAL_APP>",
  [string]$SubscriptionId = "<DEINE_SUBSCRIPTION_ID>",
  [string]$OutFile = ".env.local",
  [switch]$UseLocalRedirectUri = $true
)

$ErrorActionPreference = "Stop"

function Get-AppSettingMap {
  param(
    [string]$ResourceGroup,
    [string]$WebAppName,
    [string]$SubscriptionId
  )

  az account set --subscription $SubscriptionId | Out-Null

  # 1) Preferred: Azure management plane (requires Microsoft.Web/sites/config/list/action)
  $raw = az webapp config appsettings list `
    --name $WebAppName `
    --resource-group $ResourceGroup `
    --subscription $SubscriptionId `
    -o json 2>$null

  if ($LASTEXITCODE -eq 0 -and $raw) {
    $settings = $raw | ConvertFrom-Json
    $map = @{}
    foreach ($s in $settings) {
      if ($null -ne $s.name) {
        $map[[string]$s.name] = [string]$s.value
      }
    }
    return $map
  }

  # 2) Fallback: Kudu API (uses publishing credentials)
  $credRaw = az webapp deployment list-publishing-credentials `
    --name $WebAppName `
    --resource-group $ResourceGroup `
    --subscription $SubscriptionId `
    -o json 2>$null

  if ($LASTEXITCODE -ne 0 -or -not $credRaw) {
    throw "Failed to read app settings (management API) and failed to read publishing credentials (Kudu fallback)."
  }

  $creds = $credRaw | ConvertFrom-Json
  $user = [string]$creds.publishingUserName
  $pass = [string]$creds.publishingPassword
  if (-not $user -or -not $pass) {
    throw "Publishing credentials were missing username/password."
  }

  $pair = "$user`:$pass"
  $token = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  $headers = @{ Authorization = "Basic $token" }

  $kuduUrl = "https://$WebAppName.scm.azurewebsites.net/api/settings"
  $settingsObj = Invoke-RestMethod -Uri $kuduUrl -Headers $headers -Method GET -TimeoutSec 60

  $map = @{}
  foreach ($p in $settingsObj.PSObject.Properties) {
    $map[[string]$p.Name] = [string]$p.Value
  }
  return $map
}

function Normalize-EnvValue {
  param([string]$Value)
  if ($null -eq $Value) { return "" }
  # Keep on one line; .env format is KEY=value
  $v = $Value -replace "`r", "" -replace "`n", ""
  return $v
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$portalRoot = Split-Path -Parent $scriptDir
$targetPath = Join-Path $portalRoot $OutFile

$map = Get-AppSettingMap -ResourceGroup $ResourceGroup -WebAppName $WebAppName -SubscriptionId $SubscriptionId

$keys = @(
  # Cosmos DB (required)
  "COSMOS_ENDPOINT",
  "COSMOS_KEY",
  "COSMOS_DATABASE",
  "COSMOS_CONTAINER",

  # Azure OpenAI (for briefing/chat) - optional for basic browsing, required for AI features
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_API_KEY",
  "AZURE_OPENAI_API_VERSION",
  "AZURE_OPENAI_MODEL",

  # Azure AI Search (for search/chat context) - optional for basic browsing, required for search/chat
  "SEARCH_ENDPOINT",
  "SEARCH_INDEX",
  "SEARCH_API_KEY",

  # Tenant connection (optional)
  "CYBERLAGE_APP_CLIENT_ID",
  "CYBERLAGE_APP_CLIENT_SECRET",
  "CYBERLAGE_APP_REDIRECT_URI",

  # Misc
  "ENCRYPTION_KEY",
  "MCP_API_KEY"
)

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# Auto-generated for local dev from Azure App Service app settings.")
$lines.Add("# Source: $WebAppName ($ResourceGroup)")
$lines.Add("# Generated: $(Get-Date -Format o)")
$lines.Add("# NOTE: This file is ignored by git (.env*). Do not commit secrets.")
$lines.Add("")
$lines.Add("NEXT_PUBLIC_APP_URL=http://localhost:3000")
$lines.Add("NEXT_PUBLIC_APP_NAME=CyberLage")
$lines.Add("")

$missing = New-Object System.Collections.Generic.List[string]
foreach ($k in $keys) {
  if ($map.ContainsKey($k) -and $map[$k]) {
    $v = Normalize-EnvValue -Value $map[$k]
    $lines.Add("$k=$v")
  } else {
    # It's OK for some keys to be missing (e.g., MCP_API_KEY).
    $missing.Add($k) | Out-Null
  }
}

if ($UseLocalRedirectUri) {
  # For local OAuth consent flow: use localhost callback.
  # The app registration must allow this redirect URI if you plan to use the consent method locally.
  $lines = $lines | Where-Object { $_ -notmatch "^CYBERLAGE_APP_REDIRECT_URI=" }
  $lines += "CYBERLAGE_APP_REDIRECT_URI=http://localhost:3000/api/auth/callback"
}

if (Test-Path -LiteralPath $targetPath) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupPath = Join-Path $portalRoot "$OutFile.bak-$stamp"
  Copy-Item -LiteralPath $targetPath -Destination $backupPath -Force
}

Set-Content -LiteralPath $targetPath -Value $lines -Encoding UTF8

# Only print non-sensitive info.
Write-Host "Wrote $OutFile in $portalRoot"
Write-Host "Missing (ok if unused): $($missing -join ', ')"

