$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)]
  [string]$WebAppName,

  [Parameter(Mandatory = $true)]
  [string]$ResourceGroup
)

function Write-Log([string]$Message) {
  Write-Host "[CyberLage Portal Deploy] $Message"
}

function Fail([string]$Message) {
  throw "[CyberLage Portal Deploy] FEHLER: $Message"
}

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Fail "Befehl fehlt: $Name"
  }
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
$portalDir = Join-Path $root "cyberradar-portal"
$envFile = Join-Path $root ".env"
$zipPath = Join-Path $root "portal-deploy.zip"

Assert-Command "npm"
Assert-Command "az"

if (-not (Test-Path $envFile)) {
  Fail ".env fehlt. Bitte zuerst TASK_04 ausfuehren."
}

Load-DotEnv -Path $envFile

Write-Log "Portal bauen (inkl. Prebuild-Env-Check)"
Set-Location $portalDir
npm install
npm run build

Write-Log "Deployment-Paket erstellen"
if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}

$packageItems = Get-ChildItem -Force | Where-Object { $_.Name -notin @("node_modules", ".next", ".git") }
if ($packageItems.Count -eq 0) {
  Fail "Keine Dateien fuer ZIP-Paket gefunden."
}
Compress-Archive -Path $packageItems.Name -DestinationPath $zipPath -Force

Write-Log "Kudu-Build aktivieren"
az webapp config appsettings set `
  --name $WebAppName `
  --resource-group $ResourceGroup `
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true 1>$null

Write-Log "ZIP deploy starten"
az webapp deploy `
  --name $WebAppName `
  --resource-group $ResourceGroup `
  --src-path $zipPath `
  --type zip `
  --track-status true 1>$null

if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}

Write-Log "Deployment abgeschlossen: https://$WebAppName.azurewebsites.net"
