Add-Type -AssemblyName System.Text.Encoding
$utf8 = [System.Text.UTF8Encoding]::new($false)

# ===== FIX 1: Update financialStatus type in Portal interface =====
$portalFile = "c:\Users\HEX STORE\Downloads\New folder\src\app\components\lawyer\ExecutionDashboard\components\ExecutionFinancialHubPortal.tsx"
$portalContent = [System.IO.File]::ReadAllText($portalFile, $utf8)

$portalContent = $portalContent.Replace(
    "financialStatus: string;",
    "financialStatus: { label: string; color: string; pulse: boolean };"
)
[System.IO.File]::WriteAllText($portalFile, $portalContent, $utf8)
Write-Host "FIX 1: Updated financialStatus type in Portal interface"

# ===== FIX 2: Add missing variables in ExecutionDashboard.tsx =====
$file = "c:\Users\HEX STORE\Downloads\New folder\src\app\components\lawyer\ExecutionDashboard.tsx"
$content = [System.IO.File]::ReadAllText($file, $utf8)

# Add debtorJob, debtorEmploymentType, debtorKinship after initiator line inside component
# Find a good spot - after a line that has "creditors = []" in the destructuring
$insertAfter = "        creditors = [],"
$insertBlock = @"
        creditors = [],
        creditorsCount = 0,
"@
if ($content.Contains($insertAfter)) {
    $content = $content.Replace($insertAfter, $insertBlock)
    Write-Host "FIX 2a: Added creditorsCount in destructuring"
}

# Find debtors = [] and add debtor fields after it
$insertAfter2 = "        debtors = [],"
$insertBlock2 = @"
        debtors = [],
        debtorJob = 'كاسب',
        debtorEmploymentType = undefined,
        debtorKinship = '',
"@
if ($content.Contains($insertAfter2)) {
    $content = $content.Replace($insertAfter2, $insertBlock2)
    Write-Host "FIX 2b: Added debtorJob, debtorEmploymentType, debtorKinship in destructuring"
}

# ===== FIX 3: Fix salary seizure prop values =====
$content = $content.Replace(
    "salarySeizureReleaseSeizureAssetRow={salarySeizureReleaseSeizureAssetRow}",
    "salarySeizureReleaseSeizureAssetRow={releaseSeizureAssetRow}"
)
Write-Host "FIX 3a: Fixed salarySeizureReleaseSeizureAssetRow prop"

$content = $content.Replace(
    "salarySeizureUndoReleaseSeizureAssetRow={salarySeizureUndoReleaseSeizureAssetRow}",
    "salarySeizureUndoReleaseSeizureAssetRow={undoReleaseSeizureAssetRow}"
)
Write-Host "FIX 3b: Fixed salarySeizureUndoReleaseSeizureAssetRow prop"

# Remove the extra creditorsCount variable definition that was added inline
# (it's now in destructuring)
$content = $content.Replace(
    "`n                    creditorsCount={creditorsCount}",
    "`n                    creditorsCount={creditorsCount}"
)

[System.IO.File]::WriteAllText($file, $content, $utf8)
Write-Host "Main file saved."

# Verify
$verify = [System.IO.File]::ReadAllText($file, $utf8)
if ($verify.Contains("creditorsCount = 0") -and $verify.Contains("debtorJob = 'كاسب'")) {
    Write-Host "VERIFICATION: All fixes applied successfully!"
} else {
    Write-Host "WARNING: Some fixes may not have been applied correctly"
}

Write-Host "DONE"
