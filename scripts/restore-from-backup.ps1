$src = "c:\Users\HEX STORE\Downloads\New folder\src\app\components\lawyer\ExecutionDashboard.tsx.backup_ExecutionFinancialHub"
$dst = "c:\Users\HEX STORE\Downloads\New folder\src\app\components\lawyer\ExecutionDashboard.tsx"
$bytes = [System.IO.File]::ReadAllBytes($src)
[System.IO.File]::WriteAllBytes($dst, $bytes)
Write-Host "RESTORED OK"
