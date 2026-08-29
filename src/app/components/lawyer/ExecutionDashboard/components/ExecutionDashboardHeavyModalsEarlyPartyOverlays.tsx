/** Guarantor / stay / party-death / pause + alimony beneficiary death — EarlyCluster sibling */
import React, { Suspense } from 'react';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import { closeUnknownScope } from '../closeUnknownScope';
import { ExecutionNamedOverlayInstantFrame } from './executionOverlayInstantPresets';
import {
    LazyAlimonyBeneficiaryDeathModal as LazyAlimonyBeneficiaryDeathModalStrict,
    LazyExecutionModalsContainer as LazyExecutionModalsContainerStrict,
    LazyGuarantorDetailsPostApprovalModal,
    LazyStayOfExecutionModal,
    LazyPartyDeathReportModal,
} from '../executionDashboardLazyRegistryOverlays';

type LooseComp = React.ComponentType<Record<string, unknown>>;
const LazyExecutionModalsContainer = LazyExecutionModalsContainerStrict as unknown as LooseComp;
const LazyAlimonyBeneficiaryDeathModal =
    LazyAlimonyBeneficiaryDeathModalStrict as unknown as LooseComp;

export function ExecutionDashboardHeavyModalsEarlyPartyOverlays({
    s,
}: {
    s: Record<string, unknown>;
}) {
    return (
        <>
            {s.showGuarantorDetailsModal ||
            s.showStayOfExecutionModal ||
            Boolean(s.partyDeathModalParty) ||
            s.showPauseModal ? (
                <Suspense
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title={
                                s.showGuarantorDetailsModal
                                    ? 'بيانات الكفيل'
                                    : s.showStayOfExecutionModal
                                      ? 'وقف التنفيذ'
                                      : s.partyDeathModalParty
                                        ? 'الإبلاغ عن الوفاة'
                                        : 'إيقاف التنفيذ'
                            }
                            onClose={() => {
                                closeUnknownScope(
                                    s,
                                    'onCloseGuarantorDetailsModal',
                                    'setShowGuarantorDetailsModal',
                                )();
                                closeUnknownScope(
                                    s,
                                    'onCloseStayOfExecutionModal',
                                    'setShowStayOfExecutionModal',
                                )();
                                closeUnknownScope(s, 'onClosePartyDeathModal')();
                                closeUnknownScope(
                                    s,
                                    'onClosePauseModal',
                                    'setShowPauseModal',
                                )();
                            }}
                        />
                    }
                >
                    <LazyExecutionModalsContainer
                        EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
                        isHistoricalMode={s.isHistoricalMode}
                        executionId={s.executionId}
                        executionData={s.viewExecutionData}
                        executionStorageKey={s.executionStorageKey}
                        storageCache={s.storageCache}
                        showToast={s.showToast}
                        setTimelineEvents={s.setTimelineEvents}
                        onCloseGuarantorDetailsModal={s.onCloseGuarantorDetailsModal}
                        onCloseStayOfExecutionModal={s.onCloseStayOfExecutionModal}
                        onClosePartyDeathModal={s.onClosePartyDeathModal}
                        onClosePauseModal={s.onClosePauseModal}
                        GuarantorDetailsPostApprovalModal={LazyGuarantorDetailsPostApprovalModal}
                        showGuarantorDetailsModal={s.showGuarantorDetailsModal}
                        setShowGuarantorDetailsModal={s.setShowGuarantorDetailsModal}
                        setGuarantorDetailsDecisionId={s.setGuarantorDetailsDecisionId}
                        guarantorNameDraft={s.guarantorNameDraft}
                        guarantorWorkplaceDraft={s.guarantorWorkplaceDraft}
                        guarantorSalaryDraft={s.guarantorSalaryDraft}
                        guarantorDeductionDraft={s.guarantorDeductionDraft}
                        setGuarantorNameDraft={s.setGuarantorNameDraft}
                        setGuarantorWorkplaceDraft={s.setGuarantorWorkplaceDraft}
                        setGuarantorSalaryDraft={s.setGuarantorSalaryDraft}
                        setGuarantorDeductionDraft={s.setGuarantorDeductionDraft}
                        persistGuarantorFollowupDetails={s.persistGuarantorFollowupDetails}
                        StayOfExecutionModal={LazyStayOfExecutionModal}
                        showStayOfExecutionModal={s.showStayOfExecutionModal}
                        setShowStayOfExecutionModal={s.setShowStayOfExecutionModal}
                        stayOfExecutionActive={s.stayOfExecutionActive}
                        handleSpecialCasesStay={s.handleSpecialCasesStay}
                        PartyDeathReportModal={LazyPartyDeathReportModal}
                        partyDeathModalParty={s.partyDeathModalParty}
                        setPartyDeathModalParty={s.setPartyDeathModalParty}
                        setPartyDeathModalDecisionId={s.setPartyDeathModalDecisionId}
                        handlePartyDeathSave={s.handlePartyDeathSave}
                        creditorSubstitutionRequestStatus={s.creditorSubstitutionRequestStatus}
                        handleRequestCreditorSubstitution={s.handleRequestCreditorSubstitution}
                        debtorSubstitutionRequestStatus={s.debtorSubstitutionRequestStatus}
                        handleRequestDebtorSubstitution={s.handleRequestDebtorSubstitution}
                        X={s.X}
                        showPauseModal={s.showPauseModal}
                        setShowPauseModal={s.setShowPauseModal}
                        isPaused={s.isPaused}
                        setIsPaused={s.setIsPaused}
                        Pause={s.Pause}
                        Play={s.Play}
                        AlertCircle={s.AlertCircle}
                        CheckCircle={s.CheckCircle}
                        pauseReason={s.pauseReason}
                        setPauseReason={s.setPauseReason}
                    />
                </Suspense>
            ) : null}

            {s.alimonyBeneficiaryDeathModalOpen ? (
                <Suspense
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title="وفاة المستفيد من النفقة"
                            onClose={() => {
                                if (typeof s.setAlimonyBeneficiaryDeathModalOpen === 'function') {
                                    (s.setAlimonyBeneficiaryDeathModalOpen as (v: boolean) => void)(
                                        false,
                                    );
                                }
                                if (typeof s.setAlimonyBeneficiaryDeathModalProfile === 'function') {
                                    (
                                        s.setAlimonyBeneficiaryDeathModalProfile as (
                                            v: null,
                                        ) => void
                                    )(null);
                                }
                            }}
                        />
                    }
                >
                    <LazyAlimonyBeneficiaryDeathModal
                        open={s.alimonyBeneficiaryDeathModalOpen}
                        onClose={() => {
                            s.setAlimonyBeneficiaryDeathModalOpen(false);
                            s.setAlimonyBeneficiaryDeathModalProfile(null);
                        }}
                        profile={
                            s.alimonyBeneficiaryDeathModalProfile ?? s.alimonyBeneficiaryProfile
                        }
                        onConfirm={s.handleAlimonyBeneficiaryDeathConfirm}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
