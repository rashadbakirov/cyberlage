$ErrorActionPreference = "Stop"

param(
  [switch]$SkipAzureLogin
)

function Write-Log([string]$Message) {
  Write-Host "[CyberLage Setup] $Message"
}

function Fail([string]$Message) {
  throw "[CyberLage Setup] ERROR: $Message"
}

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Fail "Missing command: $Name"
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

function Get-RequiredEnv([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    Fail "$Name is required"
  }
  return $value
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root ".env"

Write-Log "Checking prerequisites"
Assert-Command "node"
Assert-Command "npm"
Assert-Command "az"

$nodeVersion = (& node -v).Trim().TrimStart("v")
$nodeMajor = [int](($nodeVersion -split "\.")[0])
if ($nodeMajor -lt 18) {
  Fail "Node.js >= 18 required (found: $nodeVersion)"
}

if (-not (Test-Path $envFile)) {
  Fail ".env is missing. Copy .env.example to .env and fill required values."
}

Load-DotEnv -Path $envFile

$azureSubscriptionId = Get-RequiredEnv "AZURE_SUBSCRIPTION_ID"
$azureResourceGroup = Get-RequiredEnv "AZURE_RESOURCE_GROUP"
$azureRegion = [Environment]::GetEnvironmentVariable("AZURE_REGION", "Process")
if ([string]::IsNullOrWhiteSpace($azureRegion)) { $azureRegion = "westeurope" }

$prefix = [Environment]::GetEnvironmentVariable("CYBERLAGE_PREFIX", "Process")
if ([string]::IsNullOrWhiteSpace($prefix)) { $prefix = "cyberlage" }

$cosmosAccount = [Environment]::GetEnvironmentVariable("COSMOS_ACCOUNT", "Process")
if ([string]::IsNullOrWhiteSpace($cosmosAccount)) {
  $cosmosAccount = "$prefix" + "cosmos" + (Get-Random -Minimum 1000 -Maximum 9999)
}

$storageAccount = [Environment]::GetEnvironmentVariable("STORAGE_ACCOUNT", "Process")
if ([string]::IsNullOrWhiteSpace($storageAccount)) {
  $storageAccount = "$prefix" + "sa" + (Get-Random -Minimum 1000 -Maximum 9999)
}

$functionApp = [Environment]::GetEnvironmentVariable("FUNCTION_APP", "Process")
if ([string]::IsNullOrWhiteSpace($functionApp)) {
  $functionApp = "$prefix-fetcher-" + (Get-Random -Minimum 1000 -Maximum 9999)
}

$fallbackCsv = [Environment]::GetEnvironmentVariable("COSMOS_FALLBACK_REGIONS", "Process")
if ([string]::IsNullOrWhiteSpace($fallbackCsv)) {
  $fallbackCsv = "germanywestcentral,northeurope"
}
$fallbackRegions = $fallbackCsv.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
$cosmosDatabase = [Environment]::GetEnvironmentVariable("COSMOS_DATABASE", "Process")
if ([string]::IsNullOrWhiteSpace($cosmosDatabase)) { $cosmosDatabase = "cyberradar" }

if (-not $SkipAzureLogin) {
  Write-Log "Azure login"
  az login 1>$null
}
az account set --subscription $azureSubscriptionId 1>$null

Write-Log "Creating Resource Group"
az group create --name $azureResourceGroup --location $azureRegion 1>$null

Write-Log "Creating Cosmos DB (with fallback)"
$fallbackScript = Join-Path $root "scripts/create-cosmos-with-fallback.ps1"
pwsh -File $fallbackScript `
  -AccountName $cosmosAccount `
  -ResourceGroup $azureResourceGroup `
  -PrimaryRegion $azureRegion `
  -FallbackRegions $fallbackRegions 1>$null

az cosmosdb sql database create `
  --account-name $cosmosAccount `
  --resource-group $azureResourceGroup `
  --name $cosmosDatabase 1>$null

$containers = @(
  @{ Name = "raw_alerts"; PartitionKey = "/sourceId" },
  @{ Name = "fetch_logs"; PartitionKey = "/runId" },
  @{ Name = "source_registry"; PartitionKey = "/category" },
  @{ Name = "alert_actions"; PartitionKey = "/alertId" },
  @{ Name = "alert_status"; PartitionKey = "/alertId" }
)

foreach ($container in $containers) {
  az cosmosdb sql container create `
    --account-name $cosmosAccount `
    --resource-group $azureResourceGroup `
    --database-name $cosmosDatabase `
    --name $container.Name `
    --partition-key-path $container.PartitionKey 1>$null
}

Write-Log "Creating Storage Account and Function App"
az storage account create `
  --name $storageAccount `
  --resource-group $azureResourceGroup `
  --location $azureRegion `
  --sku Standard_LRS 1>$null

az functionapp create `
  --resource-group $azureResourceGroup `
  --consumption-plan-location $azureRegion `
  --runtime node `
  --runtime-version 20 `
  --functions-version 4 `
  --name $functionApp `
  --storage-account $storageAccount 1>$null

Write-Log "Installing dependencies"
npm install --prefix (Join-Path $root "cyberradar-portal") 1>$null
npm install --prefix (Join-Path $root "cyberradar-fetcher") 1>$null

Write-Log "Setup completed. Add Cosmos endpoint/key to .env if not already present."
