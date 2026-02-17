param(
  [int]$BatchLimit = 5,
  [int]$MaxTimeSeconds = 240,
  [int]$SleepSeconds = 5,
  [string]$SubscriptionId = '<YOUR_SUBSCRIPTION_ID>',
  [string]$ResourceGroup = '<YOUR_RESOURCE_GROUP>',
  [string]$FunctionAppName = '<YOUR_FUNCTION_APP>',
  [string]$FunctionName = 'ReEnrich'
)

$ErrorActionPreference = 'Stop'

function Write-Log([string]$message) {
  $ts = (Get-Date).ToString('s')
  Write-Host "[$ts] $message"
}

Write-Log "Starting ReEnrich loop. batchLimit=$BatchLimit maxTimeSeconds=$MaxTimeSeconds sleepSeconds=$SleepSeconds"

$key = az functionapp function keys list `
  -g $ResourceGroup `
  -n $FunctionAppName `
  --function-name $FunctionName `
  --subscription $SubscriptionId `
  --query default -o tsv

if (-not $key) { throw "Could not retrieve function key for $FunctionName" }

$totalProcessed = 0
$totalTokens = 0
$totalCost = 0.0
$batch = 0

$limit = $BatchLimit

while ($true) {
  $batch++
  $uri = "https://$FunctionAppName.azurewebsites.net/api/reenrich?limit=$limit"
  $started = Get-Date

  $resp = $null
  try {
    $resp = curl.exe -sS -X POST -H "x-functions-key: $key" --max-time $MaxTimeSeconds $uri
  } catch {
    Write-Log "batch ${batch}: curl failed ($($_.Exception.Message)) -> retrying with limit=1"
    $limit = 1
    Start-Sleep -Seconds $SleepSeconds
    continue
  }

  if ($resp -notmatch '^\s*\{') {
    Write-Log "batch ${batch}: non-JSON response -> retrying with limit=1"
    $limit = 1
    Start-Sleep -Seconds $SleepSeconds
    continue
  }

  $obj = $resp | ConvertFrom-Json
  if ($null -eq $obj.totalProcessed) {
    $errMsg = $obj.error
    if (-not $errMsg) { $errMsg = 'unknown error / missing totalProcessed' }
    Write-Log "batch ${batch}: unexpected JSON (ok=$($obj.ok)) error=$errMsg -> retrying with limit=1"
    $limit = 1
    Start-Sleep -Seconds $SleepSeconds
    continue
  }

  $dur = (Get-Date) - $started

  $processed = [int]$obj.totalProcessed
  $tokens = [int]$obj.totalTokensUsed
  $cost = [double]$obj.estimatedCostUSD

  $totalProcessed += $processed
  $totalTokens += $tokens
  $totalCost += $cost

  Write-Log ("batch {0,3}: processed={1,3} success={2,3} failed={3,3} skipped={4,3} tokens={5,6} cost=${6,7:N4} duration={7}s" -f `
    $batch, $processed, $obj.totalSuccess, $obj.totalFailed, $obj.totalSkipped, $tokens, $cost, [int]$dur.TotalSeconds)

  if ($processed -eq 0) { break }

  # Adaptive batch sizing: if we are close to gateway timeout, fall back to 1 per request.
  if ($dur.TotalSeconds -gt ($MaxTimeSeconds * 0.85)) {
    $limit = 1
  } else {
    $limit = $BatchLimit
  }

  Start-Sleep -Seconds $SleepSeconds
}

Write-Log "DONE: totalProcessed=$totalProcessed totalTokens=$totalTokens approxCostUSD=$([math]::Round($totalCost,4)) batches=$batch"

