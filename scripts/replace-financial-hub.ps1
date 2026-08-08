param(
    [string]$FilePath = "c:\Users\HEX STORE\Downloads\New folder\src\app\components\lawyer\ExecutionDashboard.tsx"
)

Add-Type -AssemblyName System.Text.Encoding
$utf8 = [System.Text.UTF8Encoding]::new($false)

Write-Host "Reading file with UTF-8..."
$content = [System.IO.File]::ReadAllText($FilePath, $utf8)

$startPattern = "                {showExecutionFinancialHub &&"
$startPattern += "`n                    typeof document !== 'undefined' &&"
$startPattern += "`n                    createPortal("

$endPattern = "                        document.body"
$endPattern += "`n                    )}"

$startIdx = $content.IndexOf($startPattern)
if ($startIdx -eq -1) {
    Write-Host "ERROR: start marker not found"
    $lines = $content -split "`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "showExecutionFinancialHub &&" -and $lines[$i+1] -match "typeof document !== 'undefined'") {
            Write-Host "Found at line $($i+1)"
            $startIdx = 0
            for ($j = 0; $j -lt $i; $j++) { $startIdx += $lines[$j].Length + 1 }
            break
        }
    }
    if ($startIdx -eq -1 -or $startIdx -eq 0) {
        Write-Host "ERROR: still not found"
        exit 1
    }
}

Write-Host "Found start marker at index $startIdx"

$endSearchStart = $startIdx + 200
$endIdx = $content.IndexOf($endPattern, $endSearchStart)
if ($endIdx -eq -1) {
    Write-Host "ERROR: end marker not found, trying alternative..."
    $altEndPattern = "document.body"
    $altEndPattern += "`n                    )}"
    $endIdx = $content.IndexOf($altEndPattern, $endSearchStart)
    if ($endIdx -eq -1) {
        Write-Host "ERROR: alt end marker also not found"
        exit 1
    }
    $endIdx = $endIdx + $altEndPattern.Length
} else {
    $endIdx = $endIdx + $endPattern.Length
}
Write-Host "Found end marker at index $endIdx"

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)

Write-Host "Before length: $($before.Length), After length: $($after.Length)"

# Verify context
Write-Host "=== BEFORE (last 100 chars) ==="
if ($before.Length -gt 100) { Write-Host $before.Substring($before.Length - 100) } else { Write-Host $before }
Write-Host "=== AFTER (first 100 chars) ==="
if ($after.Length -gt 100) { Write-Host $after.Substring(0, 100) } else { Write-Host $after }

$replacement = @"
                <ExecutionFinancialHubPortal
                    showExecutionFinancialHub={showExecutionFinancialHub}
                    setShowExecutionFinancialHub={setShowExecutionFinancialHub}
                    showSeizureLogModal={showSeizureLogModal}
                    setShowSeizureLogModal={setShowSeizureLogModal}
                    executionFinancialHubTab={executionFinancialHubTab}
                    setExecutionFinancialHubTab={setExecutionFinancialHubTab}
                    financialSeizureLogPreview={financialSeizureLogPreview}
                    financialSeizureLogEvents={financialSeizureLogEvents}
                    EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                    EXEC_MODAL_Z={EXEC_MODAL_Z}
                    LazyFinancialOperationsCenter={LazyFinancialOperationsCenter}
                    ClientWalletExecutionSection={ClientWalletExecutionSection}
                    EXEC_FOC_LAZY_FALLBACK={EXEC_FOC_LAZY_FALLBACK}
                    realEstateSeizureRegistryAssets={realEstateSeizureRegistryAssets}
                    movableSeizureRegistryAssets={movableSeizureRegistryAssets}
                    salarySeizureRegistryAssets={salarySeizureRegistryAssets}
                    thirdPartySeizureRegistryAssets={thirdPartySeizureRegistryAssets}
                    standaloneExecutionMarks={standaloneExecutionMarks}
                    executionData={executionData}
                    executionId={executionId}
                    isFinancialCenterExpanded={isFinancialCenterExpanded}
                    setIsFinancialCenterExpanded={setIsFinancialCenterExpanded}
                    activeFinancialTab={activeFinancialTab}
                    setActiveFinancialTab={setActiveFinancialTab}
                    principalDebtAmount={principalDebtAmount}
                    evictionLawyerFeesInTotals={evictionLawyerFeesInTotals}
                    isEvictionExecutionModule={isEvictionExecutionModule}
                    parsedLawyerFees={parsedLawyerFees}
                    total_execution_expenses={total_execution_expenses}
                    monthlyAlimony={monthlyAlimony}
                    totalOwed={totalOwed}
                    remaining={remaining}
                    parsedCourtFees={parsedCourtFees}
                    parsedDirectorateFees={parsedDirectorateFees}
                    parsedClientFees={parsedClientFees}
                    financialStatus={financialStatus}
                    isNonFinancialClaim={isNonFinancialClaim}
                    isAlimonyClaim={isAlimonyClaim}
                    claimType={claimType}
                    paidDebt={paidDebt}
                    totalWithExecutionFee={totalWithExecutionFee}
                    calculatedExecutionFee={calculatedExecutionFee}
                    shouldCalculateExecutionFee={shouldCalculateExecutionFee}
                    accumulatedAlimony={accumulatedAlimony}
                    paidCourtFees={paidCourtFees}
                    paidDirectorateFees={paidDirectorateFees}
                    paidClientFees={paidClientFees}
                    daysSinceNoticeCalculated={daysSinceNoticeCalculated}
                    gracePeriodEnded={gracePeriodEnded}
                    debtorJob={debtorJob}
                    debtorEmploymentType={debtorEmploymentType}
                    debtorKinship={debtorKinship}
                    initiator={initiator}
                    setShowPaymentCalculator={setShowPaymentCalculator}
                    setShowSettlementCalculator={setShowSettlementCalculator}
                    handleCoerciveAction={handleCoerciveAction}
                    executionStatus={executionStatus}
                    statusMetadata={statusMetadata}
                    isPaused={isPaused}
                    setShowLedgerModal={setShowLedgerModal}
                    financialLedger={financialLedger}
                    creditorsCount={creditorsCount}
                    evictionCaseExpensesTotalForFinancial={evictionCaseExpensesTotalForFinancial}
                    evictionCaseExpenses={evictionCaseExpenses}
                    setShowEvictionExpenseModal={setShowEvictionExpenseModal}
                    handleEvictionLawyerFeeRequest={handleEvictionLawyerFeeRequest}
                    lawyerFeePayoutApproved={lawyerFeePayoutApproved}
                    handleFundsLedgerPayment={handleFundsLedgerPayment}
                    setTimelineEvents={setTimelineEvents}
                    nextTimelineId={nextTimelineId}
                    guarantorFollowupAwaitingDetailsSave={guarantorFollowupAwaitingDetailsSave}
                    setShowUnifiedExecutionModal={setShowUnifiedExecutionModal}
                    setExecutionDebtorTabIndex={setExecutionDebtorTabIndex}
                    primaryDebtorWorkspaceKey={primaryDebtorWorkspaceKey}
                    setExpandedDebtorById={setExpandedDebtorById}
                    openGuarantorDetailsModal={openGuarantorDetailsModal}
                    appendGuarantorFollowupRequest={appendGuarantorFollowupRequest}
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    showToast={showToast}
                    timelineDebtorMetadata={timelineDebtorMetadata}
                    assignmentWorkspaceCtx={assignmentWorkspaceCtx}
                    persistExecutionMerge={persistExecutionMerge}
                    handleEvictionLedgerActivated={handleEvictionLedgerActivated}
                    evictionAssetsTabUnlocked={evictionAssetsTabUnlocked}
                    syncPaidClientFeesFromWallet={syncPaidClientFeesFromWallet}
                    getLocalTodayYmd={getLocalTodayYmd}
                    setCaseTasksPending={setCaseTasksPending}
                    patchRealEstateMarkConfirmation={patchRealEstateMarkConfirmation}
                    realEstateAuctionDateDraftById={realEstateAuctionDateDraftById}
                    setRealEstateAuctionDateDraftById={setRealEstateAuctionDateDraftById}
                    saveRealEstateAuctionDate={saveRealEstateAuctionDate}
                    beginRealEstateSalePriceStep={beginRealEstateSalePriceStep}
                    cancelRealEstateSalePriceStep={cancelRealEstateSalePriceStep}
                    confirmRealEstateSaleWithPrice={confirmRealEstateSaleWithPrice}
                    updateRealEstateSaleDraft={updateRealEstateSaleDraft}
                    archiveRealEstateSeizureRow={archiveRealEstateSeizureRow}
                    undoArchiveRealEstateSeizureRow={undoArchiveRealEstateSeizureRow}
                    releaseSeizureAssetRow={releaseSeizureAssetRow}
                    undoReleaseSeizureAssetRow={undoReleaseSeizureAssetRow}
                    saveSeizureAuctionDate={saveSeizureAuctionDate}
                    seizureAuctionDateDraftById={seizureAuctionDateDraftById}
                    setSeizureAuctionDateDraftById={setSeizureAuctionDateDraftById}
                    patchSeizureMarkConfirmation={patchSeizureMarkConfirmation}
                    beginSeizureSalePriceStep={beginSeizureSalePriceStep}
                    confirmSeizureSaleWithPrice={confirmSeizureSaleWithPrice}
                    cancelSeizureSalePriceStep={cancelSeizureSalePriceStep}
                    updateSeizureSaleDraft={updateSeizureSaleDraft}
                    salarySeizureReleaseSeizureAssetRow={salarySeizureReleaseSeizureAssetRow}
                    salarySeizureUndoReleaseSeizureAssetRow={salarySeizureUndoReleaseSeizureAssetRow}
                    beginThirdPartyReceiveStep={beginThirdPartyReceiveStep}
                    updateThirdPartyReceiveDraft={updateThirdPartyReceiveDraft}
                    cancelThirdPartyReceiveStep={cancelThirdPartyReceiveStep}
                    confirmThirdPartyReceive={confirmThirdPartyReceive}
                    toggleStandaloneExecutionMarkConfirmed={toggleStandaloneExecutionMarkConfirmed}
                    archiveStandaloneExecutionMark={archiveStandaloneExecutionMark}
                    undoArchiveStandaloneExecutionMark={undoArchiveStandaloneExecutionMark}
                />
"@

$newContent = $before + $replacement + $after

$oldLines = ($content -split "`n").Count
$newLines = ($newContent -split "`n").Count
$diff = $oldLines - $newLines
Write-Host "Old lines: $oldLines, New lines: $newLines, Removed: $diff lines"

# Write with UTF-8 WITHOUT BOM
[System.IO.File]::WriteAllText($FilePath, $newContent, $utf8)
Write-Host "SUCCESS! File written successfully with UTF-8."
