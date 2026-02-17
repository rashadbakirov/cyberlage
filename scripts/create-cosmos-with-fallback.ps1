#!/usr/bin/env pwsh
param(
  [Parameter(Mandatory = $true)]
  [string]$AccountName,

  [Parameter(Mandatory = $true)]
  [string]$ResourceGroup,

  [string]$PrimaryRegion = "westeurope",

  [string[]]$FallbackRegions = @("germanywestcentral", "northeurope"),

  [string]$ConsistencyLevel = "Session"
)

$ErrorActionPreference = "Stop"

function Get-CosmosState {
  param(
    [string]$Name,
    [string]$Group
  )

  $state = az cosmosdb show --name $Name --resource-group $Group --query provisioningState -o tsv 2>$null
  if ($LASTEXITCODE -ne 0) {
    return ""
  }
  return ($state | Out-String).Trim()
}

function Wait-ForDeletion {
  param(
    [string]$Name,
    [string]$Group
  )

  for ($i = 0; $i -lt 60; $i++) {
    $exists = az cosmosdb show --name $Name --resource-group $Group --query name -o tsv 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($exists | Out-String))) {
      return
    }
    Start-Sleep -Seconds 10
  }

  throw "Timed out waiting for deletion of Cosmos account '$Name'."
}

function Remove-FailedCosmosIfExists {
  param(
    [string]$Name,
    [string]$Group
  )

  $state = Get-CosmosState -Name $Name -Group $Group
  if ([string]::IsNullOrWhiteSpace($state)) {
    return
  }

  Write-Host "[Cosmos Fallback] Existing account state is '$state'. Deleting '$Name' before retry..."
  az cosmosdb delete --name $Name --resource-group $Group --yes --no-wait 1>$null 2>$null
  Wait-ForDeletion -Name $Name -Group $Group
}

$candidateRegions = @()
$candidateRegions += $PrimaryRegion
$candidateRegions += $FallbackRegions
$candidateRegions = $candidateRegions |
  ForEach-Object { ($_ | Out-String).Trim().ToLowerInvariant() } |
  Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
  Select-Object -Unique

if ($candidateRegions.Count -eq 0) {
  throw "No candidate regions provided."
}

$errors = @()
foreach ($region in $candidateRegions) {
  Write-Host "[Cosmos Fallback] Trying region '$region'..."
  Remove-FailedCosmosIfExists -Name $AccountName -Group $ResourceGroup

  az cosmosdb create `
    --name $AccountName `
    --resource-group $ResourceGroup `
    --kind GlobalDocumentDB `
    --default-consistency-level $ConsistencyLevel `
    --locations "regionName=$region" "failoverPriority=0" "isZoneRedundant=False" `
    -o none 2>$null

  if ($LASTEXITCODE -eq 0) {
    $state = Get-CosmosState -Name $AccountName -Group $ResourceGroup
    if ($state -eq "Succeeded") {
      Write-Host "[Cosmos Fallback] Created Cosmos DB account '$AccountName' in region '$region'."
      Write-Output $region
      exit 0
    }
  }

  $errors += "Region '$region' failed."
  Write-Host "[Cosmos Fallback] Region '$region' failed. Trying next region..."
}

throw ("Cosmos creation failed in all candidate regions: " + ($candidateRegions -join ", ") + ". " + ($errors -join " "))
