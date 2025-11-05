Param()
$ErrorActionPreference = 'Stop'

Write-Host "Starting to fix script line endings..."
$repo = $PSScriptRoot

Write-Host "Scanning for candidate files..."

$binDirs = @('web/bin','server/bin','cli/bin','open-api/bin','e2e/bin','mobile/bin')
$files = @()

# Collect all .sh/.bash files
# Use wildcard in -Path so -Include is honored
$files += Get-ChildItem -Path (Join-Path $repo '*') -Recurse -File -Include *.sh, *.bash

# Collect files in bin directories (including scripts without extensions but with shebang)
foreach ($d in $binDirs) {
  $p = Join-Path $repo $d
  if (Test-Path $p) { $files += Get-ChildItem -Path $p -Recurse -File }
}

$files = $files | Sort-Object -Property FullName -Unique
Write-Host ("Found {0} files to inspect." -f $files.Count)
$count = 0

foreach ($f in $files) {
  try {
    $content = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
    $needsFix = $content -match "`r"
    $hasShebang = $content.StartsWith('#!')
    $isScript = $hasShebang -or ($f.Extension -in '.sh', '.bash')
    if ($needsFix -and $isScript) {
      $newContent = $content -replace "`r`n", "`n" -replace "`r", ""
      [IO.File]::WriteAllText($f.FullName, $newContent, (New-Object System.Text.UTF8Encoding($false)))
      Write-Host ("Fixed: " + $f.FullName)
      $count++
    }
  } catch {
    Write-Warning ("Skipped (read failed): {0} - {1}" -f $f.FullName, $_.Exception.Message)
  }
}

Write-Host ("Total files fixed: {0}" -f $count)
Write-Host "Finished."
