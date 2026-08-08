import React, { Suspense } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import { getLocalTodayYmd } from '../executionDashboardDate';
import {
    EXEC_FOC_LAZY_FALLBACK,
    EXEC_OVERLAY_LAZY_FALLBACK,
} from '../executionDashboardLazyShellUi';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import type { SaveSeizedMovableInitInput } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardFollowupSeizureInits';
import {
    LazyExecutionFinancialHubPortal,
    LazyFinancialOperationsCenter,
    LazySeizureRequestSubjectModal,
    LazyUnifiedSeizureLogHost,
} from '../executionDashboardLazyRegistry';
import type { ExecutionDashboardPhoneBodyDeferredScope } from './ExecutionDashboardPhoneBodyDeferredScope';
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import {
    mergeSeizedMovableLists,
    mergeSeizedPropertyLists,
} from '../utils/executionPhoneBodyExecutionDataMerge';

function seizedMovablesFromExecutionData(
    executionData: ExecutionDashboardPhoneBodyDeferredScope['executionData'],
    fallback: SeizedMovable[],
): SeizedMovable[] {
    const rows = executionData?.seizedMovables;
    const fromData = Array.isArray(rows) ? rows : [];
    return mergeSeizedMovableLists(fromData, fallback);
}

function seizedPropertiesFromExecutionData(
    executionData: ExecutionDashboardPhoneBodyDeferredScope['executionData'],
    fallback: SeizedProperty[],
): SeizedProperty[] {
    const rows = executionData?.seizedProperties;
    const fromData = Array.isArray(rows) ? rows : [];
    return mergeSeizedPropertyLists(fromData, fallback);
}

export type ExecutionDashboardPhoneBodyTertiaryPanelsProps = {
    scope: ExecutionDashboardPhoneBodyDeferredScope;
    tertiaryStageReady: boolean;
    propertyInlineSaveCtx: PropertyInlineSaveContext;
    movableInlineSaveCtx: MovableInlineSaveContext;
    saveSeizedMovableInitForDecision: (input: SaveSeizedMovableInitInput) => SeizedMovable | null | void;
    closeFinancialHubPortal: () => void;
    toggleFinancialCenterExpanded: () => void;
    openGuarantorFollowupDetails: () => void;
    directOpenPaymentCalculator: () => void;
    directOpenSettlementCalculator: () => void;
    directOpenLedgerModal: () => void;
    directOpenEvictionExpenseModal: () => void;
    expandDebtor?: (debtorKey: string) => void;
    primaryDebtorWorkspaceKey?: string;
    setShowUnifiedExecutionModal?: Dispatch<SetStateAction<boolean>>;
    setExecutionDebtorTabIndex?: Dispatch<SetStateAction<number>>;
};

export function ExecutionDashboardPhoneBodyTertiaryPanels({
    scope,
    tertiaryStageReady,
    propertyInlineSaveCtx,
    movableInlineSaveCtx,
    saveSeizedMovableInitForDecision,
    closeFinancialHubPortal,
    toggleFinancialCenterExpanded,
    openGuarantorFollowupDetails,
    directOpenPaymentCalculator,
    directOpenSettlementCalculator,
    directOpenLedgerModal,
    directOpenEvictionExpenseModal,
    expandDebtor,
    primaryDebtorWorkspaceKey,
    setShowUnifiedExecutionModal,
    setExecutionDebtorTabIndex,
}: ExecutionDashboardPhoneBodyTertiaryPanelsProps) {
    const {
        activeDebtorIsDeceased,
        activeFinancialTab,
        accumulatedAlimony,
        appealPerspective,
        appendGuarantorFollowupRequest,
        assignmentWorkspaceCtx,
        beginThirdPartyReceiveStep,
        calculatedExecutionFee,
        cancelThirdPartyReceiveStep,
        claimType,
        clearActiveSalarySeizurePath,
        closeUnifiedSeizureLog,
        confirmThirdPartyReceive,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        executionData,
        executionId,
        executionStatus,
        evictionAssetsTabUnlocked,
        evictionCaseExpenses,
        evictionCaseExpensesTotalForFinancial,
        evictionLawyerFeesInTotals,
        financialHubAutoOpenMode,
        financialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        financialLedger,
        financialLawyerFeesAmount,
        financialPrincipalAmount,
        financialStatus,
        focusSeizureMovableInlineCompletion,
        focusSeizurePropertyInlineCompletion,
        followupSalarySeizureLabel,
        getLocalTodayYmd: scopeGetLocalTodayYmd,
        guarantorFollowupAwaitingDetailsSave,
        handleCoerciveAction,
        handleEvictionLawyerFeeRequest,
        handleEvictionLedgerActivated,
        handleFundsLedgerPayment,
        isAlimonyClaim,
        isEvictionExecutionModule,
        isFinancialCenterExpanded,
        isNonFinancialClaim,
        isPaused,
        isRepresentingDebtor,
        lawyerFeePayoutApproved,
        monthlyAlimony,
        movableSeizureRegistryAssets,
        movableSeizureRequestModalOpen,
        movableSeizureSubjectDraft,
        nextTimelineId,
        paidClientFees,
        paidCourtFees,
        paidDebt,
        paidDirectorateFees,
        parsedClientFees,
        parsedCourtFees,
        parsedDirectorateFees,
        patchSalarySeizureAssetDetails,
        persistExecutionMerge,
        realEstateSeizureRegistryAssets,
        releaseSeizureAssetRow,
        remaining,
        salarySeizureRegistryAssets,
        salarySeizureTabRows,
        seizureLogExecutorDecisions,
        seizureMatrixLedgerParamsRef,
        setActiveFinancialTab,
        setCaseTasksPending,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        setMovableSeizureRequestModalOpen,
        setMovableSeizureSubjectDraft,
        setPropertySeizureRequestModalOpen,
        setPropertySeizureSubjectDraft,
        setThirdPartyFundsDraftById,
        setThirdPartySeizuresUi,
        setTimelineEvents,
        setUnifiedLedgerRevision,
        setUnifiedSeizureLogTab,
        showExecutionFinancialHub,
        showToast,
        showUnifiedSeizureLogModal,
        standaloneExecutionMarks,
        statusMetadata,
        submitMovableSeizureRequest,
        submitPropertySeizureRequest,
        thirdPartyFundsDraftById,
        thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi,
        timelineDebtorMetadata,
        totalOwed,
        totalWithExecutionFee,
        total_execution_expenses,
        unifiedSeizureLogEntries,
        unifiedSeizureLogTab,
        unifiedSeizureTabCounts,
        updateThirdPartyReceiveDraft,
        viewExecutionData,
        propertySeizureRequestModalOpen,
        propertySeizureSubjectDraft,
        shouldCalculateExecutionFee,
        daysSinceNoticeCalculated,
        gracePeriodEnded,
        initiator,
    } = scope;

    if (!tertiaryStageReady) {
        return null;
    }

    return (
        <>
            <Suspense fallback={showExecutionFinancialHub ? EXEC_OVERLAY_LAZY_FALLBACK : null}>
                <LazyExecutionFinancialHubPortal
                    showExecutionFinancialHub={showExecutionFinancialHub}
                    onCloseFinancialHub={closeFinancialHubPortal}
                    onOpenUnifiedSeizureLog={() => scope.openUnifiedSeizureLog()}
                    financialHubAutoOpenMode={financialHubAutoOpenMode}
                    setFinancialHubAutoOpenMode={setFinancialHubAutoOpenMode}
                    financialHubSeizedMovableId={financialHubSeizedMovableId}
                    setFinancialHubSeizedMovableId={setFinancialHubSeizedMovableId}
                    financialHubSeizedPropertyId={financialHubSeizedPropertyId}
                    setFinancialHubSeizedPropertyId={setFinancialHubSeizedPropertyId}
                    EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                    EXEC_MODAL_Z={EXEC_MODAL_Z}
                    LazyFinancialOperationsCenter={LazyFinancialOperationsCenter}
                    EXEC_FOC_LAZY_FALLBACK={EXEC_FOC_LAZY_FALLBACK}
                    realEstateSeizureRegistryAssets={realEstateSeizureRegistryAssets}
                    movableSeizureRegistryAssets={movableSeizureRegistryAssets}
                    salarySeizureRegistryAssets={salarySeizureRegistryAssets}
                    thirdPartySeizureRegistryAssets={thirdPartySeizureRegistryAssets}
                    standaloneExecutionMarks={standaloneExecutionMarks}
                    executionData={viewExecutionData}
                    executionId={executionId}
                    isFinancialCenterExpanded={isFinancialCenterExpanded}
                    onToggleFinancialCenterExpanded={toggleFinancialCenterExpanded}
                    activeFinancialTab={activeFinancialTab}
                    setActiveFinancialTab={setActiveFinancialTab}
                    principalDebtAmount={financialPrincipalAmount}
                    evictionLawyerFeesInTotals={evictionLawyerFeesInTotals}
                    isEvictionExecutionModule={isEvictionExecutionModule}
                    parsedLawyerFees={financialLawyerFeesAmount}
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
                    initiator={initiator}
                    onOpenPaymentCalculator={directOpenPaymentCalculator}
                    onOpenSettlementCalculator={directOpenSettlementCalculator}
                    handleCoerciveAction={handleCoerciveAction}
                    executionStatus={executionStatus}
                    statusMetadata={statusMetadata}
                    isPaused={isPaused}
                    onOpenLedgerModal={directOpenLedgerModal}
                    financialLedger={financialLedger}
                    evictionCaseExpensesTotalForFinancial={evictionCaseExpensesTotalForFinancial}
                    evictionCaseExpenses={evictionCaseExpenses}
                    onOpenEvictionExpenseModal={directOpenEvictionExpenseModal}
                    handleEvictionLawyerFeeRequest={handleEvictionLawyerFeeRequest}
                    lawyerFeePayoutApproved={lawyerFeePayoutApproved}
                    handleFundsLedgerPayment={handleFundsLedgerPayment}
                    setTimelineEvents={setTimelineEvents}
                    nextTimelineId={nextTimelineId}
                    guarantorFollowupAwaitingDetailsSave={guarantorFollowupAwaitingDetailsSave}
                    onOpenGuarantorFollowupDetails={openGuarantorFollowupDetails}
                    appendGuarantorFollowupRequest={appendGuarantorFollowupRequest}
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    showToast={showToast}
                    timelineDebtorMetadata={timelineDebtorMetadata}
                    assignmentWorkspaceCtx={assignmentWorkspaceCtx}
                    persistExecutionMerge={persistExecutionMerge}
                    handleEvictionLedgerActivated={handleEvictionLedgerActivated}
                    evictionAssetsTabUnlocked={evictionAssetsTabUnlocked}
                    getLocalTodayYmd={
                        typeof scopeGetLocalTodayYmd === 'function' ? scopeGetLocalTodayYmd : getLocalTodayYmd
                    }
                    setCaseTasksPending={setCaseTasksPending}
                    onClearSalarySeizurePath={clearActiveSalarySeizurePath}
                    isRepresentingDebtor={isRepresentingDebtor}
                    activeDebtorIsDeceased={activeDebtorIsDeceased}
                    expandDebtor={expandDebtor}
                    primaryDebtorWorkspaceKey={primaryDebtorWorkspaceKey}
                    setShowUnifiedExecutionModal={setShowUnifiedExecutionModal}
                    setExecutionDebtorTabIndex={setExecutionDebtorTabIndex}
                />

                <LazyUnifiedSeizureLogHost
                    isRepresentingDebtor={isRepresentingDebtor}
                    showModal={showUnifiedSeizureLogModal}
                    hasContent={scope.hasUnifiedSeizureLogContent}
                    activeTab={unifiedSeizureLogTab}
                    onTabChange={setUnifiedSeizureLogTab}
                    counts={unifiedSeizureTabCounts}
                    entries={unifiedSeizureLogEntries}
                    onClose={closeUnifiedSeizureLog}
                    footer={{
                        seizedPropertiesForSeizureLog: seizedPropertiesFromExecutionData(
                            executionData,
                            scope.seizedPropertiesForSeizureLog ?? [],
                        ),
                        seizedMovablesForSeizureLog: seizedMovablesFromExecutionData(
                            executionData,
                            scope.seizedMovablesForSeizureLog ?? [],
                        ),
                        realEstateSeizureRegistryAssets,
                        movableSeizureRegistryAssets,
                        salarySeizureTabRows,
                        thirdPartySeizureRegistryAssets,
                        thirdPartySeizuresUi,
                        thirdPartyFundsDraftById,
                        setThirdPartyFundsDraftById,
                        setThirdPartySeizuresUi,
                        decisionsStorageExecutionId,
                        executionId,
                        executionData: executionData ?? null,
                        seizureLogExecutorDecisions,
                        propertyInlineSaveCtx,
                        movableInlineSaveCtx,
                        saveSeizedMovableInitForDecision,
                        decisionsReloadEpoch,
                        appealPerspective,
                        showToast,
                        focusSeizurePropertyInlineCompletion,
                        focusSeizureMovableInlineCompletion,
                        followupSalarySeizureLabel,
                        activeDebtorIsDeceased,
                        patchSalarySeizureAssetDetails,
                        releaseSeizureAssetRow,
                        persistExecutionMerge,
                        setTimelineEvents,
                        nextTimelineId,
                        getLedgerParams: () => seizureMatrixLedgerParamsRef.current,
                        onLedgerRevision: () => setUnifiedLedgerRevision((v: number) => v + 1),
                        beginThirdPartyReceiveStep,
                        updateThirdPartyReceiveDraft,
                        cancelThirdPartyReceiveStep,
                        confirmThirdPartyReceive,
                    }}
                />
            </Suspense>

            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazySeizureRequestSubjectModal
                    open={propertySeizureRequestModalOpen}
                    title="طلب حجز عقار"
                    placeholder="اكتب موضوع طلب حجز العقار"
                    subjectDraft={propertySeizureSubjectDraft}
                    tone="amber"
                    onClose={() => setPropertySeizureRequestModalOpen(false)}
                    onSubjectDraftChange={setPropertySeizureSubjectDraft}
                    onSubmit={submitPropertySeizureRequest}
                />
            </Suspense>

            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazySeizureRequestSubjectModal
                    open={movableSeizureRequestModalOpen}
                    title="طلب حجز مال منقول"
                    placeholder="اكتب موضوع طلب حجز المال المنقول"
                    subjectDraft={movableSeizureSubjectDraft}
                    tone="sky"
                    onClose={() => setMovableSeizureRequestModalOpen(false)}
                    onSubjectDraftChange={setMovableSeizureSubjectDraft}
                    onSubmit={submitMovableSeizureRequest}
                />
            </Suspense>
        </>
    );
}
