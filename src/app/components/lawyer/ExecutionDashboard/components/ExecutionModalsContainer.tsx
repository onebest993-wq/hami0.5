import React, { Suspense } from 'react';
import { motion } from 'motion/react';
import type { Dispatch, ElementType, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { StayOfExecutionModalProps } from '@/app/components/lawyer/execution/StayOfExecutionModal';
import type {
    PartyDeathReportModalProps,
    PartyDeathSavePayload,
} from '@/app/components/lawyer/execution/PartyDeathReportModal';
import { parseAmount } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';

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
    EXEC_OVERLAY_LAZY_FALLBACK,
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
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
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
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <StayOfExecutionModal
                        open={showStayOfExecutionModal}
                        onClose={() => setShowStayOfExecutionModal(false)}
                        stayActive={stayOfExecutionActive}
                        onApplyStay={handleSpecialCasesStay}
                    />
                </Suspense>
            ) : null}

            {partyDeathModalParty ? (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
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
            {/* 🧠 STATE MACHINE: Pause/Resume Execution Modal */}
            {showPauseModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                    onClick={() => setShowPauseModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#0B1021] border-2 border-amber-500/40 rounded-3xl w-full max-w-md overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-amber-900/30 to-rose-900/30 border-b border-amber-500/30 p-4 flex justify-between items-center">
                            <button type="button"
                                onClick={() => setShowPauseModal(false)}
                                className="p-2 hover:bg-amber-500/20 rounded-lg transition-all"
                            >
                                <X size={20} className="text-white" />
                            </button>
                            <h2 className="text-amber-400 font-bold text-lg flex items-center gap-2">
                                {isPaused ? <Play size={20} /> : <Pause size={20} />}
                                {isPaused ? 'استئناف التنفيذ' : 'إيقاف التنفيذ'}
                            </h2>
                        </div>

                        <div className="p-6 space-y-4">
                            {!isPaused ? (
                                <>
                                    <div className="backdrop-blur-xl bg-amber-900/20 border border-amber-500/30 rounded-2xl p-4">
                                        <div className="flex items-start gap-3 mb-3">
                                            <AlertCircle
                                                size={20}
                                                className="text-amber-400 flex-shrink-0 mt-0.5"
                                            />
                                            <div className="text-right">
                                                <p className="text-amber-300 font-semibold text-sm mb-1">
                                                    تحذير: إيقاف التنفيذ
                                                </p>
                                                <p className="text-gray-300 text-xs leading-relaxed">
                                                    سيتم إيقاف جميع المهل الزمنية وتعطيل أدوات التنفيذ
                                                    الجبري بالكامل. يُستخدم هذا الخيار في حالات التأخير
                                                    التنفيذي أو صدور قرار محكمة بإيقاف التنفيذ.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-right text-amber-300 text-sm font-semibold">
                                            سبب الإيقاف (اختياري)
                                        </label>
                                        <textarea
                                            value={pauseReason}
                                            onChange={(e) => setPauseReason(e.target.value)}
                                            placeholder="مثال: قرار محكمة بإيقاف التنفيذ رقم 123/2026"
                                            className="w-full backdrop-blur-xl bg-slate-900/50 border border-amber-500/30 rounded-xl p-3 text-white text-sm resize-none focus:outline-none focus:border-amber-400/50 transition-all h-24"
                                        />
                                    </div>

                                    <button type="button"
                                        onClick={() => {
                                            setIsPaused(true);
                                            setTimelineEvents((prev) => {
                                                const pauseEvent = {
                                                    id: `pause_${Date.now()}`,
                                                    type: 'system',
                                                    title: '⏸️ إيقاف التنفيذ',
                                                    description: `تم إيقاف التنفيذ قانونياً${
                                                        pauseReason ? `: ${pauseReason}` : ''
                                                    }`,
                                                    date: new Date().toISOString(),
                                                    timestamp: new Date().toISOString(),
                                                };
                                                return [pauseEvent, ...prev];
                                            });

                                            const persistKey = executionData?.id || executionId;
                                            if (persistKey) {
                                                storageCache.set(executionStorageKey(String(persistKey)), {
                                                    ...executionData,
                                                    isPaused: true,
                                                    pauseReason,
                                                });
                                            }

                                            setShowPauseModal(false);
                                            showToast('⏸️ تم إيقاف التنفيذ', 'warning');
                                        }}
                                        className="w-full bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/30"
                                    >
                                        ⏸️ تأكيد الإيقاف
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="backdrop-blur-xl bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-4">
                                        <div className="flex items-start gap-3 mb-3">
                                            <CheckCircle
                                                size={20}
                                                className="text-emerald-400 flex-shrink-0 mt-0.5"
                                            />
                                            <div className="text-right">
                                                <p className="text-emerald-300 font-semibold text-sm mb-1">
                                                    استئناف التنفيذ
                                                </p>
                                                <p className="text-gray-300 text-xs leading-relaxed">
                                                    سيتم استئناف جميع المهل الزمنية وإعادة تفعيل أدوات التنفيذ
                                                    الجبري.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {pauseReason && (
                                        <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-700/30 rounded-xl p-3">
                                            <p className="text-gray-400 text-xs text-right mb-1">
                                                سبب الإيقاف السابق:
                                            </p>
                                            <p className="text-white text-sm text-right">{pauseReason}</p>
                                        </div>
                                    )}

                                    <button type="button"
                                        onClick={() => {
                                            setIsPaused(false);
                                            setPauseReason('');
                                            setTimelineEvents((prev) => {
                                                const resumeEvent = {
                                                    id: `resume_${Date.now()}`,
                                                    type: 'system',
                                                    title: '▶️ استئناف التنفيذ',
                                                    description:
                                                        'تم استئناف التنفيذ وإعادة تفعيل جميع الأدوات',
                                                    date: new Date().toISOString(),
                                                    timestamp: new Date().toISOString(),
                                                };
                                                return [resumeEvent, ...prev];
                                            });

                                            const persistKey = executionData?.id || executionId;
                                            if (persistKey) {
                                                storageCache.set(executionStorageKey(String(persistKey)), {
                                                    ...executionData,
                                                    isPaused: false,
                                                    pauseReason: '',
                                                });
                                            }

                                            setShowPauseModal(false);
                                            showToast('▶️ تم استئناف التنفيذ', 'success');
                                        }}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/30"
                                    >
                                        ▶️ تأكيد الاستئناف
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* 🧠 STATE MACHINE: Paused Banner (if execution is paused) */}
            {isPaused && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed top-0 left-0 right-0 z-[150] bg-gradient-to-r from-amber-900 to-rose-900 border-b-2 border-amber-500 py-3 px-4 shadow-2xl"
                >
                    <div className="flex items-center justify-center gap-3">
                        <Pause size={20} className="text-white animate-pulse" />
                        <p className="text-white font-bold text-sm">⚠️ الإضبارة موقوفة قانونياً</p>
                        {pauseReason && (
                            <p className="text-amber-200 text-xs">({pauseReason})</p>
                        )}
                    </div>
                </motion.div>
            )}
        </>
    );
};
