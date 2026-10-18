param([string]$FixturePath, [string]$ScriptPath)
$ErrorActionPreference = 'Stop'
$fixture = Get-Content -LiteralPath $FixturePath -Raw | ConvertFrom-Json

# Only fake credentials supplied by the test runner reach this harness.
function git { $global:LASTEXITCODE = if ($fixture.ignored) { 0 } else { 1 } }
function Read-Host {
  param([string]$Prompt, [switch]$AsSecureString)
  if (-not $AsSecureString) { throw 'Masked input is required.' }
  $secure = [Security.SecureString]::new()
  foreach ($character in $fixture.key.ToCharArray()) { $secure.AppendChar($character) }
  $secure.MakeReadOnly()
  return $secure
}

try { & $ScriptPath } catch {
  Write-Output ('Setup rejected input: ' + $_.Exception.GetType().Name + ', line ' + $_.InvocationInfo.ScriptLineNumber)
  exit 1
}
