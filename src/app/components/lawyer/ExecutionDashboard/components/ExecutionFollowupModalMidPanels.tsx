import React from 'react';
import { LazyOtherPartyActionsLog } from '../executionDashboardLazyRegistryOverlays';
import { EXEC_SECTION_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import { FollowupTabKeepAlivePanel } from './FollowupTabKeepAlivePanel';
import { requireDecisionsStorageExecutionId } from '../utils/requireDecisionsStorageExecutionId';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';

export function ExecutionFollowupModalMidPanels({
    c,
}: {
    c: ExecutionFollowupModalPortalController;
}) {
    const {
        TabOtherParty,
        TabSeizureRequests,
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        activeFollowupDebtorKey,
        activePanelKey,
        appealPerspective,
        claimType,
        coerciveUiLocked,
        creditorOtherPartyTrackHandlers,
        decisionsStorageExecutionId,
        executionCoerciveButtonDisabled,
        executionId,
        getLocalTodayYmd,
        handleCoerciveAction,
        handleGuarantorRequestFromFollowup,
        inlineActionGateKey,
        isAlimonyClaimType,
        isHistoricalMode,
        isRepresentingDebtor,
        nextTimelineId,
        openOtherPartyAppealsModal,
        otherPartyCreditorMirrorProps,
        otherPartyTabSubmitHandler,
        panelsToRender,
        persistExecutionMerge,
        persistGuarantorFollowupDetails,
        pushTimelineEvent,
        remainingBalanceForSeizure,
        requestFollowupSeizureDecision,
        requestGuarantorSeizure,
        saveCoerciveAction,
        saveSeizedMovableInitForDecision,
        saveSeizedPropertyInitForDecision,
        saveStandaloneExecutionMarkForDecision,
        saveThirdPartySeizureForDecision,
        seizureDetailCompletion,
        seizureMatrix,
        setInlineActionGateKey,
        settlementGuarantorGate,
        showToast,
        spec,
        viewExecutionData,
    } = c;

    return (
        <>
            {panelsToRender.has('other_party') ? (
                <FollowupTabKeepAlivePanel
                    key={`other_party:${String(activeFollowupDebtorKey ?? '')}`}
                    panelId="other_party"
                    active={activePanelKey === 'other_party'}
                    className="rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
                >
                    <TabOtherParty
                        executionData={viewExecutionData}
                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                        persistExecutionMerge={persistExecutionMerge}
                        handleOtherPartyActionSubmitToDecisions={otherPartyTabSubmitHandler}
                        EXEC_OVERLAY_LAZY_FALLBACK={EXEC_SECTION_LAZY_FALLBACK}
                        LazyOtherPartyActionsLog={LazyOtherPartyActionsLog}
                        showCreditorRequestsMirror={isRepresentingDebtor}
                        isRepresentingDebtor={isRepresentingDebtor}
                        showToast={showToast}
                        pushTimelineEvent={pushTimelineEvent}
                        nextTimelineId={nextTimelineId}
                        creditorRequestsMirror={otherPartyCreditorMirrorProps ?? undefined}
                        onOpenAppeals={openOtherPartyAppealsModal}
                        creditorTrackHandlers={creditorOtherPartyTrackHandlers}
                        appealPerspective={appealPerspective}
                    />
                </FollowupTabKeepAlivePanel>
            ) : null}

            {panelsToRender.has('seizure_requests') &&
            !spec.hideFollowupSeizureRequestsTab &&
            !seizureMatrix.hideSeizureTab ? (
                <FollowupTabKeepAlivePanel
                    key={`seizure_requests:${String(activeFollowupDebtorKey ?? '')}`}
                    panelId="seizure_requests"
                    active={activePanelKey === 'seizure_requests'}
                    className="rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
                >
                    <TabSeizureRequests
                        executionId={requireDecisionsStorageExecutionId({
                            decisionsStorageExecutionId,
                            executionId,
                            executionData: viewExecutionData as Record<string, unknown> | null,
                        })}
                        executionData={viewExecutionData}
                        remainingBalanceIqd={remainingBalanceForSeizure}
                        financialCenterTotalIqd={remainingBalanceForSeizure}
                        seizureMatrix={seizureMatrix}
                        seizureDetailCompletion={seizureDetailCompletion}
                        saveCoerciveAction={saveCoerciveAction}
                        persistExecutionMerge={persistExecutionMerge}
                        persistGuarantorFollowupDetails={persistGuarantorFollowupDetails}
                        pushTimelineEvent={pushTimelineEvent}
                        nextTimelineId={nextTimelineId}
                        getLocalTodayYmd={getLocalTodayYmd}
                        showToast={showToast}
                        activeDebtorIsDeceased={activeDebtorIsDeceased}
                        activeDebtorIsEmployee={activeDebtorIsEmployee}
                        executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                        coerciveUiLocked={coerciveUiLocked}
                        isHistoricalMode={isHistoricalMode}
                        inlineActionGateKey={inlineActionGateKey}
                        setInlineActionGateKey={setInlineActionGateKey}
                        handleCoerciveAction={handleCoerciveAction}
                        handleGuarantorRequestFromFollowup={handleGuarantorRequestFromFollowup}
                        requestFollowupSeizureDecision={requestFollowupSeizureDecision}
                        saveSeizedPropertyInitForDecision={saveSeizedPropertyInitForDecision}
                        saveSeizedMovableInitForDecision={saveSeizedMovableInitForDecision}
                        saveThirdPartySeizureForDecision={saveThirdPartySeizureForDecision}
                        saveStandaloneExecutionMarkForDecision={
                            saveStandaloneExecutionMarkForDecision
                        }
                        requestGuarantorSeizure={requestGuarantorSeizure}
                        forceHideGuarantorSeizureSubTab={spec.hideGuarantorSeizureSubTab}
                        financialGuarantorRequestOnly={spec.showFinancialGuarantorRequestOnly}
                        isFinancialDebtCollectionClaim={spec.isFinancialDebtCollection}
                        settlementBreachTriggeredAt={
                            settlementGuarantorGate.settlementBreachTriggeredAt
                        }
                        hideAllGuarantorPresence={spec.hideAllGuarantorPresence}
                        ledgerPendingSettlement={settlementGuarantorGate.pendingSettlement}
                        isAlimonyClaim={isAlimonyClaimType}
                        claimType={claimType}
                    />
                </FollowupTabKeepAlivePanel>
            ) : null}
        </>
    );
}
