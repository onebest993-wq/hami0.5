Add-Type -AssemblyName System.Text.Encoding
$utf8 = [System.Text.UTF8Encoding]::new($false)
$file = "c:\Users\HEX STORE\Downloads\New folder\src\app\components\lawyer\ExecutionDashboard.tsx"
$content = [System.IO.File]::ReadAllText($file, $utf8)

# Check line endings
if ($content.Contains("`r`n")) { $nl = "`r`n" } else { $nl = "`n" }
Write-Host "Using line ending: $(if ($nl -eq "`r`n") { 'CRLF' } else { 'LF' })"

$searchStart = "                                {dossierLifecyclePanelOpen && dossierLifecyclePopStyle"
$startIdx = $content.IndexOf($searchStart)
if ($startIdx -eq -1) { Write-Host "ERROR: start not found"; exit 1 }

# Find the matching ": null}" that closes this block
# There are 2 ": null}" occurrences - we need the second one (the outer)
$searchFrom = $startIdx + $searchStart.Length + 200
$targetStr1 = "                                    : null}"
$targetStr2 = "                                  : null}"

$idx1 = $content.IndexOf($targetStr1, $searchFrom)
$idx2 = $content.IndexOf($targetStr1, ($idx1 + 1))  # second occurrence is the outer one

if ($idx2 -eq -1) {
    Write-Host "Searching for alternate..."
    $idx2 = $content.IndexOf($targetStr2, $idx1)
    if ($idx2 -eq -1) { Write-Host "ERROR: end not found"; exit 1 }
    $endIdx = $idx2 + $targetStr2.Length
} else {
    $endIdx = $idx2 + $targetStr1.Length
}

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)

$nl = "`n"
$replacement = "                                {dossierLifecyclePanelOpen && dossierLifecyclePopStyle${nl}                                    ? <DossierLifecyclePanel${nl}                                        dossierLifecyclePanelOpen={dossierLifecyclePanelOpen}${nl}                                        dossierLifecyclePopStyle={dossierLifecyclePopStyle}${nl}                                        dossierLifecyclePanelPhase={dossierLifecyclePanelPhase}${nl}                                        setDossierLifecyclePanelPhase={setDossierLifecyclePanelPhase}${nl}                                        dossierStatusDraft={dossierStatusDraft}${nl}                                        dossierPendingStatus={dossierPendingStatus}${nl}                                        setDossierPendingStatus={setDossierPendingStatus}${nl}                                        dossierReasonDraft={dossierReasonDraft}${nl}                                        setDossierReasonDraft={setDossierReasonDraft}${nl}                                        dossierDateDraft={dossierDateDraft}${nl}                                        setDossierDateDraft={setDossierDateDraft}${nl}                                        dossierLifecycleLabelAr={dossierLifecycleLabelAr}${nl}                                        handleDossierLifecyclePick={handleDossierLifecyclePick}${nl}                                        handleDossierLifecycleConfirmDetails={handleDossierLifecycleConfirmDetails}${nl}                                        dossierLifecyclePanelPortalRef={dossierLifecyclePanelPortalRef}${nl}                                    />${nl}                                    : null}"

$newContent = $before + $replacement + $after

$oldLines = ($content -split $nl).Count
$newLines = ($newContent -split $nl).Count
$diff = $oldLines - $newLines
Write-Host "Old lines: $oldLines, New lines: $newLines, Removed: $diff lines"

[System.IO.File]::WriteAllText($file, $newContent, $utf8)
Write-Host "SUCCESS!"
