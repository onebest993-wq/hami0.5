import React, { Suspense } from 'react';
import type { Dispatch, ElementType, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { StayOfExecutionModalProps } from '@/app/components/lawyer/execution/StayOfExecutionModal';
import type {
    PartyDeathReportModalProps,
    PartyDeathSavePayload,
} from '@/app/components/lawyer/execution/PartyDeathReportModal';
import { parseAmount } from '@/app/utils/execution/amountInput';
import { ExecutionPauseResumeOverlay } from './ExecutionPauseResumeOverlay';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';

interface ExecutionModalsContainerProps {
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    isHistoricalMode: boolean;
    executionId: string;
    executionData: ExecutionFile;
    executionStorageKey: (id: string) => string;
    storageCache: {
        set: (key: string, value: unknown) => void;
    };
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info'
    ) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;

    GuarantorDetailsPostApprovalModal: React.ComponentType<{
        open: boolean;
        onOpenChange: (open: boolean) => void;
        disabled: boolean;
        name: string;
        workplace: string;
        salary: string;
        deduction: string;
        setName: Dispatch<SetStateAction<string>>;
        setWorkplace: Dispatch<SetStateAction<string>>;
        setSalary: Dispatch<SetStateAction<string>>;
        setDeduction: Dispatch<SetStateAction<string>>;
        onSave: () => void;
    }>;
    showGuarantorDetailsModal: boolean;
    setShowGuarantorDetailsModal: Dispatch<SetStateAction<boolean>>;
    setGuarantorDetailsDecisionId: Dispatch<SetStateAction<string | null>>;
    guarantorNameDraft: string;
    guarantorWorkplaceDraft: string;
    guarantorSalaryDraft: string;
    guarantorDeductionDraft: string;
    setGuarantorNameDraft: Dispatch<SetStateAction<string>>;
    setGuarantorWorkplaceDraft: Dispatch<SetStateAction<string>>;
    setGuarantorSalaryDraft: Dispatch<SetStateAction<string>>;
    setGuarantorDeductionDraft: Dispatch<SetStateAction<string>>;
    persistGuarantorFollowupDetails: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: {
            salaryIqd: number | null;
            deductionIqd: number | null;
        }
    ) => void;

    StayOfExecutionModal: React.ComponentType<StayOfExecutionModalProps>;
    showStayOfExecutionModal: boolean;
    setShowStayOfExecutionModal: Dispatch<SetStateAction<boolean>>;
    stayOfExecutionActive: boolean;
    handleSpecialCasesStay: StayOfExecutionModalProps['onApplyStay'];

    PartyDeathReportModal: React.ComponentType<PartyDeathReportModalProps>;
    partyDeathModalParty: 'creditor' | 'debtor' | null;
    setPartyDeathModalParty: Dispatch<SetStateAction<'creditor' | 'debtor' | null>>;
    setPartyDeathModalDecisionId: Dispatch<SetStateAction<string | null>>;
    handlePartyDeathSave: (input: PartyDeathSavePayload) => boolean;
    creditorSubstitutionRequestStatus: PartyDeathReportModalProps['creditorSubstitutionRequestStatus'];
    handleRequestCreditorSubstitution: () => boolean;
    debtorSubstitutionRequestStatus: PartyDeathReportModalProps['debtorSubstitutionRequestStatus'];
    handleRequestDebtorSubstitution: () => boolean;

    X: ElementType;

    showPauseModal: boolean;
    setShowPauseModal: (show: boolean) => void;
    isPaused: boolean;
    setIsPaused: Dispatch<SetStateAction<boolean>>;
    Pause: ElementType;
    Play: ElementType;
    AlertCircle: ElementType;
    CheckCircle: ElementType;
    pauseReason: string;
    setPauseReason: Dispatch<SetStateAction<string>>;
}

export const ExecutionModalsContainer: React.FC<ExecutionModalsContainerProps> = ({
    EXEC_OVERLAY_LAZY_FALLBACK: _EXEC_OVERLAY_LAZY_FALLBACK,
    isHistoricalMode,
    executionId,
    executionData,
    executionStorageKey,
    storageCache,
    showToast,
    setTimelineEvents,
    GuarantorDetailsPostApprovalModal,
    showGuarantorDetailsModal,
    setShowGuarantorDetailsModal,
    setGuarantorDetailsDecisionId,
    guarantorNameDraft,
    guarantorWorkplaceDraft,
    guarantorSalaryDraft,
    guarantorDeductionDraft,
    setGuarantorNameDraft,
    setGuarantorWorkplaceDraft,
    setGuarantorSalaryDraft,
    setGuarantorDeductionDraft,
    persistGuarantorFollowupDetails,
    StayOfExecutionModal,
    showStayOfExecutionModal,
    setShowStayOfExecutionModal,
    stayOfExecutionActive,
    handleSpecialCasesStay,
    PartyDeathReportModal,
    partyDeathModalParty,
    setPartyDeathModalParty,
    setPartyDeathModalDecisionId,
    handlePartyDeathSave,
    creditorSubstitutionRequestStatus,
    handleRequestCreditorSubstitution,
    debtorSubstitutionRequestStatus,
    handleRequestDebtorSubstitution,
    X,
    showPauseModal,
    setShowPauseModal,
    isPaused,
    setIsPaused,
    Pause,
    Play,
    AlertCircle,
    CheckCircle,
    pauseReason,
    setPauseReason,
}) => {
    return (
        <>
            {showGuarantorDetailsModal ? (
                <Suspense fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}>
                    <GuarantorDetailsPostApprovalModal
                        open={showGuarantorDetailsModal}
                        onOpenChange={(open) => {
                            setShowGuarantorDetailsModal(open);
                            if (!open) setGuarantorDetailsDecisionId(null);
                        }}
                        disabled={isHistoricalMode}
                        name={guarantorNameDraft}
                        workplace={guarantorWorkplaceDraft}
                        salary={guarantorSalaryDraft}
                        deduction={guarantorDeductionDraft}
                        setName={setGuarantorNameDraft}
                        setWorkplace={setGuarantorWorkplaceDraft}
                        setSalary={setGuarantorSalaryDraft}
                        setDeduction={setGuarantorDeductionDraft}
                        onSave={() => {
                            const parseIqd = (s: string): number | null => {
                                const n = parseAmount(s);
                                return Number.isFinite(n) ? n : null;
                            };
                            persistGuarantorFollowupDetails(guarantorNameDraft, guarantorWorkplaceDraft, {
                                salaryIqd: parseIqd(guarantorSalaryDraft),
                                deductionIqd: parseIqd(guarantorDeductionDraft),
                            });
                            setShowGuarantorDetailsModal(false);
                        }}
                    />
                </Suspense>
            ) : null}

            {showStayOfExecutionModal ? (
                <Suspense fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}>
                    <StayOfExecutionModal
                        open={showStayOfExecutionModal}
                        onClose={() => setShowStayOfExecutionModal(false)}
                        stayActive={stayOfExecutionActive}
                        onApplyStay={handleSpecialCasesStay}
                    />
                </Suspense>
            ) : null}

            {partyDeathModalParty ? (
                <Suspense fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}>
                    <PartyDeathReportModal
                        open
                        onClose={() => {
                            setPartyDeathModalParty(null);
                            setPartyDeathModalDecisionId(null);
                        }}
                        deceasedParty={partyDeathModalParty}
                        partyDeathCase={
                            partyDeathModalParty === 'creditor'
                                ? executionData?.creditor_party_death_case ??
                                  (executionData?.party_death_case?.deceased_party === 'creditor'
                                      ? executionData.party_death_case
                                      : null)
                                : executionData?.debtor_party_death_case ??
                                  (executionData?.party_death_case?.deceased_party === 'debtor'
                                      ? executionData.party_death_case
                                      : null)
                        }
                        existingPartyHeirs={
                            partyDeathModalParty === 'creditor'
                                ? (executionData?.creditors?.[0]?.heirs as string[] | undefined)
                                : (executionData?.debtors?.[0]?.heirs as string[] | undefined)
                        }
                        existingPartyHeirDetails={
                            partyDeathModalParty === 'creditor'
                                ? (executionData?.creditors?.[0]?.heirs_details as Array<{
                                      name?: string;
                                      phone?: string;
                                      address?: string;
                                  }> | undefined)
                                : (executionData?.debtors?.[0]?.heirs_details as Array<{
                                      name?: string;
                                      phone?: string;
                                      address?: string;
                                  }> | undefined)
                        }
                        onPartyDeathSave={handlePartyDeathSave}
                        creditorSubstitutionRequestStatus={creditorSubstitutionRequestStatus}
                        onRequestCreditorSubstitution={handleRequestCreditorSubstitution}
                        debtorSubstitutionRequestStatus={debtorSubstitutionRequestStatus}
                        onRequestDebtorSubstitution={handleRequestDebtorSubstitution}
                        creditorDeathReportQueued={false}
                    />
                </Suspense>
            ) : null}

            <ExecutionPauseResumeOverlay
                X={X}
                showPauseModal={showPauseModal}
                setShowPauseModal={setShowPauseModal}
                isPaused={isPaused}
                setIsPaused={setIsPaused}
                Pause={Pause}
                Play={Play}
                AlertCircle={AlertCircle}
                CheckCircle={CheckCircle}
                pauseReason={pauseReason}
                setPauseReason={setPauseReason}
                setTimelineEvents={setTimelineEvents}
                executionId={executionId}
                executionData={executionData}
                executionStorageKey={executionStorageKey}
                storageCache={storageCache}
                showToast={showToast}
            />
        </>
    );
};
