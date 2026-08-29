import React from 'react';
import {
    LazyEmployeeAssignmentCoerciveFollowupBlock,
    LazyPersonalCoerciveFollowupPanel,
} from '../executionDashboardLazyRegistryShell';
import { EXEC_SECTION_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import SecureStoreService from '@/app/services/SecureStoreService';
import { FollowupTabKeepAlivePanel } from './FollowupTabKeepAlivePanel';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';

export function ExecutionFollowupModalPersonalTabPanel({
    c,
    custodyRemovalClaimActive,
}: {
    c: ExecutionFollowupModalPortalController;
    custodyRemovalClaimActive: boolean;
}) {
    const {
        TabPersonal,
        activeFollowupDebtorKey,
        activeNoticeState,
        activePanelKey,
        activeDebtorIsEmployee,
        activeDebtorNoticeScope,
        coerciveUiLocked,
        debtorArrested,
        debtorAttendedVoluntarily,
        debtorForcedToAttend,
        debtorSummonsProfile,
        debtorsSectionRef,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        earnerFinancialPersonalCoerciveActive,
        employeeForcedBringAwaitingPersonalOutcome,
        employeePersonalTabUnlockStorageKey,
        forcedBringDecisionState,
        forcedSummoningAnalysis,
        handleEmployeeAssignmentRequestForcedBring,
        handleEmployeeAssignmentRequestInvestigation,
        handleEmployeeAssignmentResolveForcedBringOutcome,
        handleEmployeeAssignmentTerminate,
        handleEmployeeRegisterArrestOrder,
        handleEmployeeWarrantOutcome,
        hideExecutiveDetentionJudgeCard,
        isEvictionExecutionModule,
        isHistoricalMode,
        kasabTerminationEmphasis,
        nextTimelineId,
        noticeVoluntaryPeriodEndOptimistic,
        openDecisionsModalWithBoot,
        openGuarantorDetailsModal,
        panelsToRender,
        persistExecutionMerge,
        personalTabLockedForEmployee,
        primaryDebtorKeyResolved,
        primaryDebtorWorkspaceKey,
        pushTimelineEvent,
        remaining,
        resolvedEmployeeSummonsAssignment,
        setActiveNoticeState,
        setDebtorArrested,
        setDebtorForcedToAttend,
        setExecutionDebtorTabIndex,
        setNonInterferenceIssued,
        setPersonalTabUnlockByDebtor,
        setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab,
        showEmployeeAssignmentCoerciveBlock,
        showPersonalCoerciveFollowupTab,
        showToast,
        spec,
        viewExecutionData,
        voluntaryAttendanceCount,
        voluntaryEndOptimistic,
        workspaceCtx,
    } = c;

    if (!panelsToRender.has('personal') || !showPersonalCoerciveFollowupTab) return null;

    return (
        <FollowupTabKeepAlivePanel
            key={`personal:${String(activeFollowupDebtorKey ?? '')}`}
            panelId="personal"
            active={activePanelKey === 'personal'}
            className="rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 sm:p-5"
        >
            <TabPersonal
                personalTabLockedForEmployee={personalTabLockedForEmployee}
                onConfirmUnlock={() =>
                    setPersonalTabUnlockByDebtor((prev) => {
                        const next = { ...prev, [activeFollowupDebtorKey]: true };
                        if (employeePersonalTabUnlockStorageKey) {
                            try {
                                SecureStoreService.setItemSync(
                                    employeePersonalTabUnlockStorageKey,
                                    JSON.stringify(next),
                                );
                            } catch {}
                        }
                        return next;
                    })
                }
                activeNoticeState={activeNoticeState}
                debtorSummonsProfile={debtorSummonsProfile}
                setDebtorForcedToAttend={setDebtorForcedToAttend}
                setActiveNoticeState={setActiveNoticeState}
                showToast={showToast}
                setNonInterferenceIssued={setNonInterferenceIssued}
                debtorArrested={debtorArrested}
                setDebtorArrested={setDebtorArrested}
                showEmployeeAssignmentCoerciveBlock={showEmployeeAssignmentCoerciveBlock}
                resolvedEmployeeSummonsAssignment={resolvedEmployeeSummonsAssignment}
                EXEC_SECTION_LAZY_FALLBACK={EXEC_SECTION_LAZY_FALLBACK}
                LazyEmployeeAssignmentCoerciveFollowupBlock={LazyEmployeeAssignmentCoerciveFollowupBlock}
                forcedBringDecisionState={forcedBringDecisionState}
                employeeForcedBringAwaitingPersonalOutcome={employeeForcedBringAwaitingPersonalOutcome}
                LazyPersonalCoerciveFollowupPanel={LazyPersonalCoerciveFollowupPanel}
                decisionsStorageExecutionId={decisionsStorageExecutionId}
                decisionsReloadEpoch={decisionsReloadEpoch}
                coerciveUiLocked={coerciveUiLocked}
                debtorAttendedVoluntarily={debtorAttendedVoluntarily}
                debtorForcedToAttend={debtorForcedToAttend}
                voluntaryAttendanceCount={voluntaryAttendanceCount}
                isEvictionExecutionModule={isEvictionExecutionModule}
                executionData={viewExecutionData}
                voluntaryEndOptimistic={voluntaryEndOptimistic}
                noticeVoluntaryPeriodEndOptimistic={noticeVoluntaryPeriodEndOptimistic}
                forcedSummoningAnalysis={forcedSummoningAnalysis}
                viewExecutionData={viewExecutionData}
                isHistoricalMode={isHistoricalMode}
                remaining={remaining}
                persistExecutionMerge={persistExecutionMerge}
                pushTimelineEvent={pushTimelineEvent}
                nextTimelineId={nextTimelineId}
                assignmentWorkspaceCtx={workspaceCtx}
                primaryDebtorKeyResolved={primaryDebtorKeyResolved}
                onOpenDecisions={openDecisionsModalWithBoot}
                onOpenSummonsCenter={() => {
                    setSummonsContextDebtorKey(String(workspaceCtx.activeDebtorKey));
                    setSummonsHubInitialMainTab('tabligh');
                    setShowUnifiedSummonsModal(true);
                }}
                onOpenGuarantorDetails={() => {
                    setShowUnifiedExecutionModal(false);
                    setExecutionDebtorTabIndex(0);
                    if (primaryDebtorWorkspaceKey) {
                        debtorsSectionRef.current?.expandDebtor(primaryDebtorWorkspaceKey);
                    }
                    openGuarantorDetailsModal();
                }}
                kasabTerminationEmphasis={kasabTerminationEmphasis}
                activeDebtorIsEmployee={activeDebtorIsEmployee}
                custodyRemovalClaimActive={custodyRemovalClaimActive}
                hidePersonalJudgePresentation={
                    spec.hidePersonalJudgePresentation ||
                    (activeDebtorIsEmployee && !custodyRemovalClaimActive)
                }
                hideExecutiveDetentionJudgeCard={
                    hideExecutiveDetentionJudgeCard ||
                    (activeDebtorIsEmployee && !custodyRemovalClaimActive)
                }
                earnerFinancialPersonalCoerciveActive={earnerFinancialPersonalCoerciveActive}
                hidePersonalForcedBringActivation={
                    earnerFinancialPersonalCoerciveActive
                        ? false
                        : spec.hidePersonalForcedBringActivation
                }
                activeDebtorNoticeScope={activeDebtorNoticeScope}
                handleEmployeeAssignmentRequestInvestigation={
                    handleEmployeeAssignmentRequestInvestigation
                }
                handleEmployeeRegisterArrestOrder={handleEmployeeRegisterArrestOrder}
                handleEmployeeAssignmentRequestForcedBring={
                    handleEmployeeAssignmentRequestForcedBring
                }
                handleEmployeeAssignmentResolveForcedBringOutcome={
                    handleEmployeeAssignmentResolveForcedBringOutcome
                }
                handleEmployeeWarrantOutcome={handleEmployeeWarrantOutcome}
                handleEmployeeAssignmentTerminate={handleEmployeeAssignmentTerminate}
            />
        </FollowupTabKeepAlivePanel>
    );
}
