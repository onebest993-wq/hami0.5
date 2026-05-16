Add-Type -AssemblyName System.Text.Encoding
$utf8 = [System.Text.UTF8Encoding]::new($false)
$FilePath = "c:\Users\HEX STORE\Downloads\New folder\src\app\components\lawyer\ExecutionDashboard.tsx"

$content = [System.IO.File]::ReadAllText($FilePath, $utf8)

$oldText = "import { PartyEditModal, CoerciveToolsGrid, DossierMetaEditSection, EvictionProceduresSection, FinancialTab, OtherPartyTab, SeizureRequestsTab, SpecialTab, PersonalTab, CoerciveTab } from './ExecutionDashboard/components';"

$newText = "import { PartyEditModal, CoerciveToolsGrid, DossierMetaEditSection, EvictionProceduresSection, FinancialTab, OtherPartyTab, SeizureRequestsTab, SpecialTab, PersonalTab, CoerciveTab, ExecutionFinancialHubPortal } from './ExecutionDashboard/components';"

if ($content.Contains($oldText)) {
    $content = $content.Replace($oldText, $newText)
    [System.IO.File]::WriteAllText($FilePath, $content, $utf8)
    Write-Host "SUCCESS: Import updated with ExecutionFinancialHubPortal."
} else {
    Write-Host "ERROR: Import line not found."
    $lines = $content -split "`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "PartyEditModal" -and $lines[$i] -match "ExecutionDashboard/components'") {
            Write-Host "Found related line $($i+1): $($lines[$i])"
        }
    }
    exit 1
}
