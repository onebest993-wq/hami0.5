import React from 'react';
import { FollowupTabKeepAlivePanel } from './FollowupTabKeepAlivePanel';
import { requireDecisionsStorageExecutionId } from '../utils/requireDecisionsStorageExecutionId';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';

export function ExecutionFollowupModalAdminRequestsPanel({
    c,
}: {
    c: ExecutionFollowupModalPortalController;
}) {
    const {
        TabRequests,
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        activeDebtorIsLegalEntity,
        activeFollowupDebtorKey,
        activePanelKey,
        appealPerspective,
        assignmentWorkspaceCtx,
        coerciveUiLocked,
        decisionsStorageExecutionId,
        executionDomainContext,
        executionId,
        forcedSummoningAnalysis,
        handleGuarantorRequestFromFollowup,
        handleSpecialFollowupSubmit,
        hideCoerciveTabsForDebtorAgent,
        hideExecutiveDetentionJudgeCard,
        inlineActionGateKey,
        isAlimonyClaimType,
        isHistoricalMode,
        isPersonalStatusExecutionClaim,
        openDecisionsModalWithBoot,
        panelsToRender,
        persistExecutionMerge,
        personalTabLockedForEmployee,
        primaryDebtorKeyResolved,
        remainingBalanceForSeizure,
        requestGuarantorSeizure,
        setInlineActionGateKey,
        setSpecialRequestContent,
        setSpecialRequestDate,
        setSpecialRequestManualTitle,
        setSpecialRequestTemplatePick,
        settlementGuarantorGate,
        showGuarantorInSeizureFollowupTab,
        showPersonalCoerciveFollowupTab,
        showToast,
        spec,
        specialRequestContent,
        specialRequestDate,
        specialRequestManualTitle,
        specialRequestTemplatePick,
        viewExecutionData,
    } = c;

    if (!panelsToRender.has('admin')) return null;

    return (
        <FollowupTabKeepAlivePanel
            key={`admin:${String(activeFollowupDebtorKey ?? '')}`}
            panelId="admin"
            active={activePanelKey === 'admin'}
            className="rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
        >
            <TabRequests
                executionId={requireDecisionsStorageExecutionId({
                    decisionsStorageExecutionId,
                    executionId,
                    executionData: viewExecutionData as Record<string, unknown> | null,
                })}
                executionData={viewExecutionData as Record<string, unknown> | null}
                appealPerspective={appealPerspective}
                specialRequestTemplatePick={specialRequestTemplatePick}
                setSpecialRequestTemplatePick={setSpecialRequestTemplatePick}
                specialRequestDate={specialRequestDate}
                setSpecialRequestDate={setSpecialRequestDate}
                specialRequestContent={specialRequestContent}
                setSpecialRequestContent={setSpecialRequestContent}
                specialRequestManualTitle={specialRequestManualTitle}
                setSpecialRequestManualTitle={setSpecialRequestManualTitle}
                inlineActionGateKey={inlineActionGateKey}
                setInlineActionGateKey={setInlineActionGateKey}
                runSpecialFollowupSubmit={handleSpecialFollowupSubmit}
                activeDebtorIsDeceased={activeDebtorIsDeceased}
                activeDebtorIsLegalEntity={activeDebtorIsLegalEntity}
                hideHiddenFollowupRequests={
                    activeDebtorIsLegalEntity || hideCoerciveTabsForDebtorAgent
                }
                hiddenFollowupRequestOptions={{
                    domainContext: executionDomainContext,
                    flags: {
                        ...spec,
                        showPersonalCoerciveFollowupTab,
                        showGuarantorInSeizureTab: showGuarantorInSeizureFollowupTab,
                        isPersonalStatusExecutionClaim,
                        isAlimonyClaim: isAlimonyClaimType,
                        activeDebtorIsEmployee,
                        personalTabLockedForEmployee,
                        showHiddenExecutiveDossierPresentation:
                            !hideExecutiveDetentionJudgeCard &&
                            !activeDebtorIsEmployee &&
                            remainingBalanceForSeizure > 0,
                    },
                    guarantorCtx: {
                        executionData: viewExecutionData,
                        settlementBreachTriggeredAt:
                            settlementGuarantorGate.settlementBreachTriggeredAt,
                        ledgerPendingSettlement: settlementGuarantorGate.pendingSettlement,
                        financialCenterTotalIqd: remainingBalanceForSeizure,
                        activeDebtorIsDeceased,
                        activeDebtorIsEmployee,
                    },
                    personal: {
                        appealPerspective,
                        coerciveUiLocked,
                        isHistoricalMode,
                        activeDebtorKey: assignmentWorkspaceCtx.activeDebtorKey,
                        primaryDebtorKey: primaryDebtorKeyResolved,
                        kasabRelaxedGates: !activeDebtorIsEmployee,
                        forcedSummonAllowed: forcedSummoningAnalysis.canForceSummon,
                        forcedSummonLockReason: forcedSummoningAnalysis.lockReasonAr,
                        showToast,
                        persistExecutionMerge,
                        onOpenDecisions: openDecisionsModalWithBoot,
                    },
                    guarantor: {
                        executionData: viewExecutionData,
                        coerciveUiLocked,
                        isHistoricalMode,
                        handleGuarantorRequestFromFollowup,
                        requestGuarantorSeizure,
                        onOpenDecisions: openDecisionsModalWithBoot,
                        showToast,
                    },
                }}
            />
        </FollowupTabKeepAlivePanel>
    );
}
