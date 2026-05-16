Add-Type -AssemblyName System.Text.Encoding
$utf8 = [System.Text.UTF8Encoding]::new($false)

# ===== FIX 1: Remove debtorJob/debtorKinship/creditorsCount from the Portal interface =====
# and compute them inside from executionData
$portalFile = "c:\Users\HEX STORE\Downloads\New folder\src\app\components\lawyer\ExecutionDashboard\components\ExecutionFinancialHubPortal.tsx"
$portalContent = [System.IO.File]::ReadAllText($portalFile, $utf8)

# Remove the props from interface
$portalContent = $portalContent.Replace(
    "    debtorJob: string;`r`n    debtorEmploymentType: any;`r`n    debtorKinship: string;`r`n    initiator: string;",
    "    initiator: string;"
)
$portalContent = $portalContent.Replace(
    "    creditorsCount: number;`r`n    evictionCaseExpensesTotalForFinancial: number;",
    "    evictionCaseExpensesTotalForFinancial: number;"
)

# Remove salarySeizureXxx from interface (we'll use the same releaseSeizureAssetRow)
$portalContent = $portalContent.Replace(
    "    salarySeizureReleaseSeizureAssetRow: (row: any) => void;`r`n    salarySeizureUndoReleaseSeizureAssetRow: (row: any) => void;`r`n    beginThirdPartyReceiveStep:",
    "    beginThirdPartyReceiveStep:"
)

# Add computed variables inside the component (after the destructuring of props)
$componentStart = "`"const ExecutionFinancialHubPortal: React.FC<ExecutionFinancialHubPortalProps> = ({`"
$componentPattern = [regex]::Escape("const ExecutionFinancialHubPortal: React.FC<ExecutionFinancialHubPortalProps> = ({") + "([^}]+)" + [regex]::Escape("}) => {")

# Instead, let's find the function signature and add computed vars right after
$searchFunc = "}) => {"
$idx = $portalContent.IndexOf("const ExecutionFinancialHubPortal")
$idx = $portalContent.IndexOf("=> {", $idx)
$idx = $portalContent.IndexOf("=> {", $idx + 1)  # second one is the actual function
$insertPoint = $idx + 4  # after "=> {"

$computedVars = @"
    
    // Compute debtor fields from executionData
    const debtors = (executionData?.debtors as any[]) || [];
    const firstDebtor = debtors[0] || {};
    const debtorJob = firstDebtor?.occupation || 'ÙƒØ§Ø³Ø¨';
    const debtorEmploymentType = firstDebtor?.employmentType;
    const debtorKinship = firstDebtor?.kinship || '';
    const creditors = (executionData?.creditors as any[]) || [];
    const creditorsCount = Array.isArray(creditors) ? creditors.length : 0;
    
    const salarySeizureReleaseSeizureAssetRow = releaseSeizureAssetRow;
    const salarySeizureUndoReleaseSeizureAssetRow = undoReleaseSeizureAssetRow;
"@

# This won't work well with Arabic. Let me take a different approach.
# Instead, I'll edit the Portal component to compute these inside.
# Remove debtorJob, debtorEmploymentType, debtorKinship from destructuring
# and compute them inside

# Let me find the destructuring pattern and simplify it
Write-Host "Need a different approach - rewriting..."

[System.IO.File]::WriteAllText($portalFile, $portalContent, $utf8)
Write-Host "Portal file updated with interface fixes"
