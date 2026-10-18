param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$secretPath = Join-Path $projectRoot '.dev.vars'

& git -C $projectRoot check-ignore --quiet -- .dev.vars
if ($LASTEXITCODE -ne 0) { throw '.dev.vars must be ignored by Git before storing a key.' }

Write-Host 'Enter the Gemini API key here. Input is masked and stays in the ignored local .dev.vars file.'
Write-Host 'Do not paste the key into chat. This command does not deploy or call an API.'
$secureValue = Read-Host 'Gemini API key' -AsSecureString
$secretPointer = [IntPtr]::Zero
try {
  $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  $keyValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  # Credentials are opaque. Prefix and length cannot establish authentication.
  if ([string]::IsNullOrWhiteSpace($keyValue)) { throw 'Enter a non-empty key. Nothing was saved.' }
  if ($keyValue -match '[^\x21-\x7e]|["\\]') { throw 'The key must be one line without whitespace, control characters, quotes or backslashes. Nothing was saved.' }
  $secretText = if (Test-Path -LiteralPath $secretPath) { [IO.File]::ReadAllText($secretPath) } else { '' }
  $keyLine = 'GEMINI_API_KEY="' + $keyValue + '"'
  if ([regex]::IsMatch($secretText, '(?m)^\s*(?:export\s+)?GEMINI_API_KEY\s*=')) {
    $secretText = [regex]::Replace($secretText, '(?m)^\s*(?:export\s+)?GEMINI_API_KEY\s*=.*$', [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $keyLine })
  } else {
    $secretText = $secretText.TrimEnd() + [Environment]::NewLine + $keyLine + [Environment]::NewLine
  }
  [IO.File]::WriteAllText($secretPath, $secretText, [Text.UTF8Encoding]::new($false))
  Write-Host 'Saved locally; authentication has not yet been verified. The key was not printed.'
  Write-Host 'Restart the local API worker, then run npm run verify:gemini for one real image-recognition request.'
} finally {
  $keyValue = $null
  $keyLine = $null
  $secretText = $null
  if ($secretPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer) }
  $secureValue.Dispose()
}
