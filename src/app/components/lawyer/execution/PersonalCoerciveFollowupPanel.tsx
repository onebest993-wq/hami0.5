import React, { useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { UserX, Plane, ShieldAlert, Gavel, X, ChevronDown, Unlock, Send } from 'lucide-react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { guarantorFollowupAwaitingDetailsSave } from '@/app/types/execution';
import {
    appendPersonalCoerciveExecutorRequest,
    getGuarantorRequestOutcome,
    getPersonalCoerciveSubtypeOutcome,
    isGuarantorRequestDecisionRow,
    patchExecutorDecisionRow,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import { formatDateToLocalYmd, getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { CryptoService } from '@/app/services/CryptoService';

export interface PersonalCoerciveFollowupPanelProps {
    executionId: string | undefined;
    decisionsReloadEpoch: number;
    coerciveUiLocked: boolean;
    /** مهلة الإخبار انتهت أو مسار جاهز للإجراءات الجبرية */
    gracePeriodEndedFlag: boolean;
    /** يُسمح بمسار الإحضار الجبري وفق محرك الحصانة */
    forcedSummonAllowed: boolean;
    forcedSummonLockReason?: string;
    executionData: ExecutionFile | null;
    debtorPresentEffective: boolean;
    debtRemainingIqd: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (e: TimelineEvent) => void;
    nextTimelineId: () => string;
    showToast: (
        msg: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: {
            decisionsLink?: boolean;
            decisionsTab?: 'current' | 'previous' | 'appeals';
            decisionId?: string;
            action?: { label: string; onClick: () => void };
        }
    ) => void;
    onOpenDecisions: (opts?: { tab?: 'current' | 'previous' | 'appeals'; decisionId?: string | null }) => void;
    onOpenSummonsCenter: () => void;
    /** طلب كفيل ضامن — يُسجَّل لدى منفذ العدل للبتّ */
    onGuarantorRequest?: () => void;
    /** فتح واجهة إكمال بيانات الكفيل (شارة المدين) بعد موافقة المنفذ دون حفظ */
    onOpenGuarantorDetails?: () => void;
    /** بعد إنهاء وظيفة — إبراز إجراءات الإكراه المقترحة */
    kasabCoerciveEmphasis?: boolean;
    /**
     * للمدين الكاسب فقط: فتح مسارات الإحضار/المفاتحة/الحبس دون انتظار مهلة إخبار أو محرك الحصانة.
     * لا يؤثر على مسار الموظف.
     */
    kasabRelaxedGates?: boolean;
    /** مفتاح المدين النشط في الذمة المقسومة */
    activeDebtorKey?: string;
    /** مفتاح المدين الأساسي للتوافق مع الطلبات القديمة */
    primaryDebtorKey?: string;
    /** معاينة تاريخية — تعطيل أزرار الإكراه والطلبات */
    isHistoricalMode?: boolean;
}

const BTN_BASE =
    'w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] relative z-10 cursor-pointer active:scale-[0.99]';
const BTN_DISABLED = 'opacity-45 cursor-not-allowed hover:border-white/5';

export const PersonalCoerciveFollowupPanel: React.FC<PersonalCoerciveFollowupPanelProps> = ({
    executionId,
    decisionsReloadEpoch,
    coerciveUiLocked,
    gracePeriodEndedFlag,
    forcedSummonAllowed,
    forcedSummonLockReason,
    executionData,
    debtorPresentEffective,
    debtRemainingIqd,
    persistExecutionMerge,
    pushTimelineEvent,
    nextTimelineId,
    showToast,
    onOpenDecisions,
    onOpenSummonsCenter,
    onGuarantorRequest,
    onOpenGuarantorDetails,
    kasabCoerciveEmphasis = false,
    kasabRelaxedGates = false,
    activeDebtorKey = 'primary_debtor',
    primaryDebtorKey = 'primary_debtor',
    isHistoricalMode = false,
}) => {
    /** الافتراضي: احترام التسلسل القانوني؛ الاسترخاء اختياري ومحدود من المستدعي */
    const relaxedPersonal = kasabRelaxedGates;

    type ActionGateKey = 'forced_bring_in' | 'arrest_warrant_investigation' | 'travel_ban' | 'executive_detention' | 'release_debtor';
    const [confirmingKey, setConfirmingKey] = useState<ActionGateKey | null>(null);
    const [sendingKey, setSendingKey] = useState<ActionGateKey | null>(null);
    const [forcedOutcomeModalOpen, setForcedOutcomeModalOpen] = useState(false);
    const [investigationModalOpen, setInvestigationModalOpen] = useState(false);
    const [warrantNoteDraft, setWarrantNoteDraft] = useState('');
    const [detentionRejectionOpen, setDetentionRejectionOpen] = useState(false);
    const [detentionRejectionReason, setDetentionRejectionReason] = useState('');
    const [detentionRejectionSaving, setDetentionRejectionSaving] = useState(false);
    const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false);
    const [releaseConfirmBusy, setReleaseConfirmBusy] = useState(false);

    const exId = String(executionData?.id ?? executionId ?? '').trim();
    const exKey = exId || undefined;
    const debtorTimelineMeta = useMemo(
        () => timelineDebtorMetadata(activeDebtorKey),
        [activeDebtorKey]
    );
    const coerciveDecisionStates = useMemo(
        () => ({
            forced: getPersonalCoerciveSubtypeOutcome(exKey, 'forced_bring_in', {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            arrest: getPersonalCoerciveSubtypeOutcome(exKey, 'arrest_warrant_investigation', {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            travel: getPersonalCoerciveSubtypeOutcome(exKey, 'travel_ban', {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            detention: getPersonalCoerciveSubtypeOutcome(exKey, 'executive_detention', {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            guarantor: getGuarantorRequestOutcome(exKey),
        }),
        [exId, decisionsReloadEpoch, activeDebtorKey, primaryDebtorKey]
    );

    const forced = coerciveDecisionStates.forced;
    const arrest = coerciveDecisionStates.arrest;
    const travel = coerciveDecisionStates.travel;
    const detention = coerciveDecisionStates.detention;
    const guarantorDec = coerciveDecisionStates.guarantor;
    const guarantorAwaitingSave = guarantorFollowupAwaitingDetailsSave(executionData?.guarantor_followup);

    const outcome = executionData?.forced_bring_in_personal_outcome ?? null;
    const arrestStage = executionData?.personal_arrest_warrant_stage ?? 'none';
    const travelActive = executionData?.debtor_travel_ban_active === true;
    const wanted = executionData?.debtor_wanted_arrest_warrant === true;
    const detentionActive = executionData?.debtor_executive_detention_active === true;
    const detentionUntil = executionData?.executive_detention_until ?? null;
    const inAbsentia = executionData?.executive_detention_request_in_absentia === true;
    const warrantCustodyRecorded = executionData?.debtor_arrest_warrant_cleared_after_custody === true;
    const judgeDetention = executionData?.executive_detention_judge_outcome ?? null;
    const investigationSessionOpen =
        executionData?.personal_arrest_investigation_session_open === true ||
        (executionData?.personal_arrest_investigation_session_open !== false &&
            arrest.approved &&
            arrestStage === 'pending_court');
    const showInvestigationBlock =
        outcome === 'absconded' ||
        investigationSessionOpen ||
        arrest.pending ||
        arrest.approved ||
        arrest.alternative ||
        arrestStage !== 'none' ||
        wanted;

    const renderInlineGate = useCallback(
        (key: ActionGateKey, onConfirm: () => void) => (
            <AnimatePresence initial={false}>
                {confirmingKey === key ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        className="absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-2xl border border-amber-500/15 bg-[#0A1122]/85 px-3 backdrop-blur-xl"
                    >
                        <button
                            type="button"
                            disabled={sendingKey === key}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (sendingKey === key) return;
                                onConfirm();
                            }}
                            className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
                        >
                            <span className="flex flex-row-reverse items-center justify-center gap-2">
                                <Send size={14} className="text-amber-200" />
                                تأكيد وإرسال للقرارات
                            </span>
                        </button>
                        <button
                            type="button"
                            disabled={sendingKey === key}
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingKey(null);
                            }}
                            className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        ),
        [confirmingKey, sendingKey]
    );

    const findLatestDecisionIdForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']): string | null => {
            if (!exId) return null;
            const normalize = (v: unknown): string => String(v ?? '').trim();
            const targetDebtorKey = normalize(activeDebtorKey);
            const primaryKey = normalize(primaryDebtorKey);
            const rows = readExecutorDecisionsArray(exId);
            const hit = rows.find((r) => {
                if (String(r.requestKind || '') !== 'personal_coercive') return false;
                if (String((r as { personalCoerciveSubtype?: string }).personalCoerciveSubtype || '') !== subtype)
                    return false;
                const rowDebtorKey = normalize((r as { personalCoerciveDebtorKey?: string }).personalCoerciveDebtorKey);
                if (targetDebtorKey) {
                    if (rowDebtorKey) return rowDebtorKey === targetDebtorKey;
                    return Boolean(primaryKey) && targetDebtorKey === primaryKey;
                }
                return true;
            });
            const id = hit ? String(hit.id || '').trim() : '';
            return id || null;
        },
        [activeDebtorKey, primaryDebtorKey, exId]
    );

    const findLatestGuarantorDecisionId = useCallback((): string | null => {
        if (!exId) return null;
        const rows = readExecutorDecisionsArray(exId);
        const hit = rows.find((r) => isGuarantorRequestDecisionRow(r as Record<string, unknown>));
        const id = hit ? String((hit as any).id || '').trim() : '';
        return id || null;
    }, [exId]);

    const submitRequest = useCallback(
        async (
            subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype'],
            title: string,
            body: string
        ): Promise<string | null> => {
            if (!exId || isHistoricalMode) return null;
            let encryptedPayloadJson: string | undefined;
            try {
                await CryptoService.initialize();
                encryptedPayloadJson = await CryptoService.encryptData(
                    JSON.stringify({
                        executionId: exId,
                        subtype,
                        title,
                        body,
                        debtorKey: activeDebtorKey,
                        createdAtIso: new Date().toISOString(),
                    })
                );
            } catch {
                encryptedPayloadJson = undefined;
            }

            const submitted = appendPersonalCoerciveExecutorRequest({
                executionId: exId,
                subtype,
                title,
                body,
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
                encryptedPayloadJson,
            });
            if (!submitted.ok) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return null;
            }
            const msgQueuedExecutor = 'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ';
            if (subtype === 'forced_bring_in') {
                persistExecutionMerge({
                    forcedAttendanceIssued: true,
                    activeNoticeState: 'forced_attendance',
                });
            }
            if (subtype === 'arrest_warrant_investigation') {
                persistExecutionMerge({
                    personal_arrest_investigation_session_open: true,
                });
            }
            if (subtype === 'executive_detention') {
                persistExecutionMerge({ executive_detention_judge_outcome: null });
            }
            const now = new Date().toISOString();
            const decisionId = submitted.decisionId;
            pushTimelineEvent({
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: `📋 ${title} — قيد البت`,
                description: body.trim() || undefined,
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: {
                    ...debtorTimelineMeta,
                    ...(decisionId
                        ? { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId }
                        : {}),
                },
            });
            showToast(msgQueuedExecutor, 'success', { decisionsLink: true, decisionId });
            return decisionId || null;
        },
        [
            exId,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
            activeDebtorKey,
            primaryDebtorKey,
            debtorTimelineMeta,
            isHistoricalMode,
        ]
    );

    const recordForcedOutcome = (v: 'brought' | 'absconded') => {
        const now = new Date().toISOString();
        const label =
            v === 'brought'
                ? '✅ تم إحضار المدين أمام المنفذ'
                : '⚠️ المدين متخفي عن الأنظار';
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: label,
            description: 'تسجيل نتيجة مسار الإحضار الجبري الشخصي بشأن المدين.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        if (v === 'brought') {
            persistExecutionMerge({
                forcedAttendanceIssued: false,
                activeNoticeState: null,
                forced_bring_in_personal_outcome: null,
                debtorAttendedVoluntarily: true,
                debtorEvaded: false,
                investigationCourtRequested: false,
                investigationMemoIssued: false,
                investigationPathDebtorPresent: false,
                personal_arrest_investigation_session_open: false,
                personal_arrest_warrant_stage: 'none',
                debtor_wanted_arrest_warrant: false,
            });
            showToast('تم التسجيل وتصفير دورة الإحضار الجبري لإتاحة طلب جديد عند الحاجة.', 'success');
        } else {
            persistExecutionMerge({ forced_bring_in_personal_outcome: v, debtorEvaded: true });
            showToast('تم تسجيل النتيجة في محضر المتابعة.', 'success');
        }
    };

    const recordInvestigationDebtorAttended = () => {
        persistExecutionMerge({
            forcedAttendanceIssued: false,
            activeNoticeState: null,
            forced_bring_in_personal_outcome: null,
            debtorAttendedVoluntarily: true,
            debtorEvaded: false,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: true,
            personal_arrest_investigation_session_open: false,
            personal_arrest_warrant_stage: 'none',
        });
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '✅ تم حضور المدين (مفاتحة محكمة التحقيق)',
            description: 'تسجيل مثول المدين دون صدور أمر قبض — إعادة دورة مسار المفاتحة.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم التسجيل وإعادة دورة مسار المفاتحة.', 'success');
    };

    const markWarrantIssued = () => {
        persistExecutionMerge({
            personal_arrest_warrant_stage: 'issued',
            debtor_wanted_arrest_warrant: true,
            debtor_arrest_warrant_cleared_after_custody: false,
            personal_arrest_investigation_session_open: false,
        });
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '🔴 تم صدور أمر القبض',
            description: `${warrantNoteDraft.trim() || 'تأشير على صدور مذكرة القبض.'} (المدين)`,
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم تسجيل صدور أمر القبض — تظهر حالة المدين في الإضبارة.', 'success');
    };

    const recordPhysicalArrestAfterWarrant = () => {
        persistExecutionMerge({
            debtor_arrest_warrant_cleared_after_custody: true,
            debtorArrested: true,
            forcedAttendanceIssued: false,
            activeNoticeState: null,
            forced_bring_in_personal_outcome: null,
            debtorEvaded: false,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: true,
            personal_arrest_investigation_session_open: false,
            personal_arrest_warrant_stage: 'none',
            debtor_wanted_arrest_warrant: false,
        });
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '✅ تم إلقاء القبض على المدين',
            description:
                'تسجيل تنفيذ مذكرة القبض فعلياً — تُزال شارة مذكرة القبض من بطاقة المدين وتبقى الإشارات الأخرى حسب المسار.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم تسجيل إلقاء القبض والسجل الزمني.', 'success');
    };

    const resetPersonalCoerciveLifecycle = () => {
        persistExecutionMerge({
            debtor_executive_detention_active: false,
            executive_detention_until: null,
            executive_detention_days_total: null,
            executive_detention_reminder_sent: false,
            executive_detention_judge_outcome: null,
            executive_detention_request_in_absentia: false,
            debtorArrested: false,
            debtor_arrest_warrant_cleared_after_custody: true,
            debtor_wanted_arrest_warrant: false,
            personal_arrest_warrant_stage: 'none',
            personal_arrest_investigation_session_open: false,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: false,
            forcedAttendanceIssued: false,
            activeNoticeState: null,
            forced_bring_in_personal_outcome: null,
            forced_bring_in_personal_followup_logged: false,
            debtorForcedToAttend: false,
            debtorEvaded: false,
            forcedPathAttendanceSecured: false,
        });
    };

    const startDetentionFourMonths = (opts?: { markCustody?: boolean }) => {
        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + 4);
        const until = formatDateToLocalYmd(end);
        const patch: Record<string, unknown> = {
            debtor_executive_detention_active: true,
            executive_detention_days_total: 120,
            executive_detention_until: until,
            executive_detention_reminder_sent: false,
            executive_detention_judge_outcome: null,
        };
        if (opts?.markCustody || !inAbsentia) {
            patch.debtor_arrest_warrant_cleared_after_custody = true;
        }
        persistExecutionMerge(patch);
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: inAbsentia ? '🔒 بدء مدة الحبس التنفيذي (4 أشهر) — غيابي' : '🔒 بدء مدة الحبس التنفيذي (4 أشهر)',
            description: `تُحتسب مدة الحبس التنفيذي تلقائياً 4 أشهر حتى ${until}.`,
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم تفعيل العداد لمدة 4 أشهر.', 'success');
    };

    const liftTravelBan = () => {
        persistExecutionMerge({ debtor_travel_ban_active: false });
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '✈️ رفع منع السفر',
            description: 'رفع إشارة منع السفر عن المدين.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('أُزيلت إشارة منع السفر من بطاقة المدين.', 'success');
    };

    const guardSummonsGate = useCallback((): boolean => {
        if (gracePeriodEndedFlag) return true;
        showToast(
            'لا يتم التفعيل إلا بعد الإخبار بمذكرة الإخبار بالتنفيذ أو حضور المدين دون تبليغ.',
            'warning',
            {
                action: {
                    label: 'مركز التبليغات',
                    onClick: () => onOpenSummonsCenter(),
                },
            }
        );
        return false;
    }, [gracePeriodEndedFlag, onOpenSummonsCenter, showToast]);

    const canSubmitTravelBan =
        !coerciveUiLocked && !travelActive && !travel.pending && !travel.alternative;

    const forcedButtonLabel = forced.pending
        ? 'الإحضار الجبري'
        : forced.alternative
          ? 'الإحضار الجبري — قرار بديل'
          : forced.rejected
            ? 'الإحضار الجبري — مرفوض'
            : forced.approved && !outcome
              ? 'الإحضار الجبري — تسجيل النتيجة'
              : outcome === 'brought'
                ? 'الإحضار الجبري — تم الإحضار'
                : outcome === 'absconded'
                  ? 'الإحضار الجبري — متخفي'
                  : 'الإحضار الجبري';
    const forcedButtonDisabled =
        isHistoricalMode ||
        coerciveUiLocked ||
        forced.alternative ||
        forced.rejected ||
        outcome === 'brought' ||
        outcome === 'absconded';

    const investigationButtonLabel = arrest.pending
        ? 'مفاتحة محكمة التحقيق'
        : arrest.alternative
          ? 'مفاتحة محكمة التحقيق — قرار بديل'
          : (arrestStage === 'issued' || wanted) && warrantCustodyRecorded
            ? 'مفاتحة محكمة التحقيق — تم القبض'
            : arrest.approved && (investigationSessionOpen || arrestStage === 'issued' || wanted)
              ? 'مفاتحة محكمة التحقيق — تسجيل النتيجة'
              : 'مفاتحة محكمة التحقيق — أمر قبض';
    const investigationButtonDisabled =
        isHistoricalMode ||
        coerciveUiLocked ||
        arrest.alternative ||
        ((arrestStage === 'issued' || wanted) && warrantCustodyRecorded);

    const travelButtonLabel = travel.pending
        ? 'منع سفر'
        : travel.alternative
          ? 'منع سفر — قرار بديل'
          : travelActive
            ? debtRemainingIqd <= 0
                ? 'رفع منع السفر'
                : 'منع سفر — مفعّل'
            : 'منع سفر';
    const travelButtonDisabled =
        isHistoricalMode ||
        coerciveUiLocked ||
        travel.alternative ||
        (travelActive && debtRemainingIqd > 0);

    return (
        <div
            className={`p-4 space-y-4${isHistoricalMode ? ' pointer-events-none select-none opacity-[0.72]' : ''}`}
        >
            {releaseConfirmOpen && typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                        style={{ zIndex: EXEC_MODAL_Z.nestedOverUnified }}
                        role="presentation"
                        onClick={(e) => {
                            if (releaseConfirmBusy) return;
                            if (e.target === e.currentTarget) setReleaseConfirmOpen(false);
                        }}
                        onKeyDown={(e) => {
                            if (releaseConfirmBusy) return;
                            if (e.key === 'Escape') setReleaseConfirmOpen(false);
                        }}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#0A0F1C] p-4 shadow-2xl text-right space-y-3"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-2 flex-row-reverse border-b border-white/10 pb-2">
                                <p className="text-sm font-bold text-rose-100">تحذير</p>
                                <button
                                    type="button"
                                    aria-label="إغلاق"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
                                    disabled={releaseConfirmBusy}
                                    onClick={() => setReleaseConfirmOpen(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-[12px] leading-relaxed text-rose-100/95">
                                تحذير: في حالة التأكيد، سيتم إخلاء سبيل المدين وإنهاء الإجراءات الحالية ولا يمكن الرجوع عن هذا الطلب.
                            </p>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                    type="button"
                                    disabled={releaseConfirmBusy}
                                    className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                                    onClick={() => setReleaseConfirmOpen(false)}
                                >
                                    تراجع
                                </button>
                                <button
                                    type="button"
                                    disabled={releaseConfirmBusy}
                                    className="rounded-xl border border-rose-500/45 bg-rose-950/40 py-2.5 text-[11px] font-black text-rose-100 hover:bg-rose-950/55 disabled:opacity-50"
                                    onClick={() => {
                                        if (releaseConfirmBusy) return;
                                        setReleaseConfirmBusy(true);
                                        resetPersonalCoerciveLifecycle();
                                        const nowIso = new Date().toISOString();
                                        pushTimelineEvent({
                                            id: nextTimelineId(),
                                            date: getLocalTodayYmd(),
                                            timestamp: nowIso,
                                            title: 'تم إخلاء سبيل المدين وإغلاق دورة التنفيذ الجبري الحالية',
                                            description:
                                                'تمت إعادة ضبط دورة التنفيذ الجبري الشخصي بعد إخلاء سبيل المدين.',
                                            type: 'coercive',
                                            source: 'محضر المتابعة',
                                            metadata: debtorTimelineMeta,
                                        });
                                        void submitRequest(
                                            'release_debtor',
                                            'طلب إخلاء سبيل المدين',
                                            'طلب إطلاق سراح المدين من الحبس التنفيذي بعد التسوية أو سداد الدين.'
                                        ).finally(() => {
                                            setReleaseConfirmBusy(false);
                                            setReleaseConfirmOpen(false);
                                            showToast('تم تثبيت إخلاء السبيل وإغلاق دورة التنفيذ الجبري.', 'success');
                                        });
                                    }}
                                >
                                    تأكيد إخلاء السبيل
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            {forcedOutcomeModalOpen && typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                        style={{ zIndex: EXEC_MODAL_Z.nestedOverUnified }}
                        role="presentation"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setForcedOutcomeModalOpen(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setForcedOutcomeModalOpen(false);
                        }}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="w-full max-w-sm rounded-2xl border border-[#E6C673]/35 bg-[#0A0F1C] p-4 shadow-2xl text-right space-y-3"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-2 flex-row-reverse border-b border-white/10 pb-2">
                                <p className="text-sm font-bold text-amber-100">تسجيل نتيجة الإحضار الجبري</p>
                                <button
                                    type="button"
                                    aria-label="إغلاق"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                                    onClick={() => setForcedOutcomeModalOpen(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    type="button"
                                    className="rounded-xl bg-emerald-800/60 py-2.5 text-xs font-bold text-white"
                                    onClick={() => {
                                        setForcedOutcomeModalOpen(false);
                                        recordForcedOutcome('brought');
                                    }}
                                >
                                    تم إحضار المدين
                                </button>
                                <button
                                    type="button"
                                    className="rounded-xl border border-rose-500/40 bg-rose-950/30 py-2.5 text-xs font-bold text-rose-100"
                                    onClick={() => {
                                        setForcedOutcomeModalOpen(false);
                                        recordForcedOutcome('absconded');
                                    }}
                                >
                                    المدين متخفي عن الأنظار
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {investigationModalOpen && typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                        style={{ zIndex: EXEC_MODAL_Z.nestedOverUnified }}
                        role="presentation"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setInvestigationModalOpen(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setInvestigationModalOpen(false);
                        }}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="w-full max-w-sm rounded-2xl border border-[#E6C673]/35 bg-[#0A0F1C] p-4 shadow-2xl text-right space-y-3"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-2 flex-row-reverse border-b border-white/10 pb-2">
                                <p className="text-sm font-bold text-amber-100">مفاتحة محكمة التحقيق — تسجيل النتيجة</p>
                                <button
                                    type="button"
                                    aria-label="إغلاق"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                                    onClick={() => setInvestigationModalOpen(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {arrestStage === 'issued' || wanted ? (
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        type="button"
                                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-800/55 py-2.5 text-xs font-bold text-white"
                                        onClick={() => {
                                            setInvestigationModalOpen(false);
                                            recordPhysicalArrestAfterWarrant();
                                        }}
                                    >
                                        تم إلقاء القبض على المدين
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full rounded-xl border border-emerald-500/25 bg-emerald-950/35 py-2.5 text-xs font-bold text-emerald-100"
                                        onClick={() => {
                                            setInvestigationModalOpen(false);
                                            recordInvestigationDebtorAttended();
                                        }}
                                    >
                                        حضور المدين أو وكيله
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-800/55 py-2.5 text-xs font-bold text-white"
                                        onClick={() => {
                                            setInvestigationModalOpen(false);
                                            recordInvestigationDebtorAttended();
                                        }}
                                    >
                                        تم حضور المدين
                                    </button>
                                    <textarea
                                        value={warrantNoteDraft}
                                        onChange={(e) => setWarrantNoteDraft(e.target.value)}
                                        placeholder="ملاحظات أو مرجع المذكرة (اختياري)"
                                        rows={2}
                                        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5 text-[11px] text-white"
                                    />
                                    <button
                                        type="button"
                                        className="w-full rounded-xl bg-rose-800/55 py-2.5 text-xs font-bold text-white"
                                        onClick={() => {
                                            setInvestigationModalOpen(false);
                                            markWarrantIssued();
                                        }}
                                    >
                                        تم صدور أمر القبض
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}

            {/* 1 — إحضار جبري */}
            <div
                className={`overflow-hidden rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right ${kasabCoerciveEmphasis ? 'ring-2 ring-[#E6C673]/45 border-[#E6C673]/35' : ''}`}
            >
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            if (forced.approved && !outcome) {
                                setForcedOutcomeModalOpen(true);
                                return;
                            }
                            if (forcedButtonDisabled) return;
                            if (!guardSummonsGate()) return;
                            if (forced.pending || forced.rejected) return;
                            setConfirmingKey('forced_bring_in');
                        }}
                        disabled={forcedButtonDisabled && !(forced.approved && !outcome)}
						className={`w-full ${BTN_BASE} bg-gradient-to-l from-violet-500/12 to-transparent hover:from-violet-500/18 ${forcedButtonDisabled && !(forced.approved && !outcome) ? BTN_DISABLED : ''}`}
                    >
                        <div className="flex flex-row-reverse items-center gap-3">
							<span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
								<Gavel className="w-6 h-6 text-white/70" />
							</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-sm">{forcedButtonLabel}</p>
                            </div>
                        </div>
                    </button>
                    {renderInlineGate('forced_bring_in', () => {
                        setSendingKey('forced_bring_in');
                        void submitRequest(
                            'forced_bring_in',
                            'طلب إحضار جبري للمدين',
                            'طلب إحضار بالقوة لمثول المدين أمام دائرة التنفيذ بعد انتهاء المهلة دون حضور طوعي.'
                        ).then((decisionId) => {
                            setSendingKey(null);
                            setConfirmingKey(null);
                            if (!decisionId) return;
                            showToast('تم توجيه الطلب للمركز.', 'success', {
                                decisionsLink: true,
                                decisionId: decisionId ?? undefined,
                            });
                        });
                    })}
                    {forced.pending || forced.rejected ? (
                        <div className="px-3 pb-3">
                            {forced.rejected ? (
                                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-3">
                                    <p className="text-[11px] font-black text-rose-200 text-right">
                                        تم رفض الطلب من قبل المنفذ
                                    </p>
                                    <div className="mt-2">
                                        <ExecutionInlineExecutorDecisionActions
                                            executionId={exId}
                                            decisionId={findLatestDecisionIdForSubtype('forced_bring_in') || ''}
                                            requestKind="personal_coercive"
                                            personalCoerciveSubtype="forced_bring_in"
                                            disabled
                                            onOpenAppealCenter={() =>
                                                onOpenDecisions({
                                                    tab: 'appeals',
                                                    decisionId: findLatestDecisionIdForSubtype('forced_bring_in'),
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            ) : (
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findLatestDecisionIdForSubtype('forced_bring_in') || ''}
                                    requestKind="personal_coercive"
                                    personalCoerciveSubtype="forced_bring_in"
                                />
                            )}
                        </div>
                    ) : null}
                </div>
            </div>

            {/* 2 — مفاتحة تحقيق */}
            {showInvestigationBlock ? (
                <div className="overflow-hidden rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                if (investigationSessionOpen && arrest.approved) {
                                    setInvestigationModalOpen(true);
                                    return;
                                }
                                if (arrestStage === 'issued' || wanted) {
                                    setInvestigationModalOpen(true);
                                    return;
                                }
                                if (investigationButtonDisabled) return;
                                if (!guardSummonsGate()) return;
                                if (arrest.pending || arrest.rejected) return;
                                setConfirmingKey('arrest_warrant_investigation');
                            }}
                            disabled={investigationButtonDisabled}
							className={`w-full ${BTN_BASE} bg-gradient-to-l from-rose-500/12 to-transparent hover:from-rose-500/18 ${investigationButtonDisabled ? BTN_DISABLED : ''}`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
								<span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
									<ShieldAlert className="w-6 h-6 text-white/70" />
								</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm">{investigationButtonLabel}</p>
                                </div>
                            </div>
                        </button>
                        {renderInlineGate('arrest_warrant_investigation', () => {
                            setSendingKey('arrest_warrant_investigation');
                            persistExecutionMerge({
                                personal_arrest_warrant_stage: 'pending_court',
                                personal_arrest_investigation_session_open: true,
                            });
                            void submitRequest(
                                'arrest_warrant_investigation',
                                'طلب مفاتحة محكمة التحقيق لإصدار أمر قبض',
                                'بعد تعذّر الإحضار الجبري وتخلّف المدين عن المثول، طُلب توجيه كتاب مفاتحة لمحكمة التحقيق المختصة لإصدار أمر قبض أصولي.'
                            ).then((decisionId) => {
                                setSendingKey(null);
                                setConfirmingKey(null);
                                if (!decisionId) return;
                                showToast('تم توجيه الطلب للمركز.', 'success', {
                                    decisionsLink: true,
                                    decisionId: decisionId ?? undefined,
                                });
                            });
                        })}
                        {arrest.pending || arrest.rejected ? (
                            <div className="px-3 pb-3">
                                {arrest.rejected ? (
                                    <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-3">
                                        <p className="text-[11px] font-black text-rose-200 text-right">
                                            تم رفض الطلب من قبل المنفذ
                                        </p>
                                        <div className="mt-2">
                                            <ExecutionInlineExecutorDecisionActions
                                                executionId={exId}
                                                decisionId={findLatestDecisionIdForSubtype('arrest_warrant_investigation') || ''}
                                                requestKind="personal_coercive"
                                                personalCoerciveSubtype="arrest_warrant_investigation"
                                                disabled
                                                onOpenAppealCenter={() =>
                                                    onOpenDecisions({
                                                        tab: 'appeals',
                                                        decisionId: findLatestDecisionIdForSubtype('arrest_warrant_investigation'),
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <ExecutionInlineExecutorDecisionActions
                                        executionId={exId}
                                        decisionId={findLatestDecisionIdForSubtype('arrest_warrant_investigation') || ''}
                                        requestKind="personal_coercive"
                                        personalCoerciveSubtype="arrest_warrant_investigation"
                                    />
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {/* 3 — منع سفر */}
            <div className="overflow-hidden rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            if (travelActive && debtRemainingIqd <= 0) {
                                liftTravelBan();
                                return;
                            }
                            if (travelButtonDisabled) return;
                            if (travel.pending || travel.rejected) return;
                            if (!guardSummonsGate()) return;
                            if (!canSubmitTravelBan) return;
                            setConfirmingKey('travel_ban');
                        }}
                        disabled={travelButtonDisabled}
						className={`w-full ${BTN_BASE} bg-gradient-to-l from-sky-500/12 to-transparent hover:from-sky-500/18 ${travelButtonDisabled ? BTN_DISABLED : ''}`}
                    >
                        <div className="flex flex-row-reverse items-center gap-3">
							<span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
								<Plane className="w-6 h-6 text-white/70" />
							</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-sm">{travelButtonLabel}</p>
                            </div>
                        </div>
                    </button>
                    {renderInlineGate('travel_ban', () => {
                        setSendingKey('travel_ban');
                        if (travel.pending || travel.rejected) {
                            setSendingKey(null);
                            setConfirmingKey(null);
                            return;
                        }
                        void submitRequest(
                            'travel_ban',
                            'طلب وضع إشارة منع سفر على المدين',
                            'طلب توجيه كتاب إلى مديرية الجوازات والإقامة لمنع سفر المدين لحين البتّ في التنفيذ.'
                        ).then((decisionId) => {
                            setSendingKey(null);
                            setConfirmingKey(null);
                            if (!decisionId) return;
                            showToast('تم توجيه الطلب للمركز.', 'success', {
                                decisionsLink: true,
                                decisionId: decisionId ?? undefined,
                            });
                        });
                    })}
                    {travel.pending || travel.rejected ? (
                        <div className="px-3 pb-3">
                            {travel.rejected ? (
                                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-3">
                                    <p className="text-[11px] font-black text-rose-200 text-right">
                                        تم رفض الطلب من قبل المنفذ
                                    </p>
                                    <div className="mt-2">
                                        <ExecutionInlineExecutorDecisionActions
                                            executionId={exId}
                                            decisionId={findLatestDecisionIdForSubtype('travel_ban') || ''}
                                            requestKind="personal_coercive"
                                            personalCoerciveSubtype="travel_ban"
                                            disabled
                                            onOpenAppealCenter={() =>
                                                onOpenDecisions({
                                                    tab: 'appeals',
                                                    decisionId: findLatestDecisionIdForSubtype('travel_ban'),
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            ) : (
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findLatestDecisionIdForSubtype('travel_ban') || ''}
                                    requestKind="personal_coercive"
                                    personalCoerciveSubtype="travel_ban"
                                />
                            )}
                        </div>
                    ) : null}
                </div>
            </div>

            {/* 4 — حبس تنفيذي */}
            <details
                className={`group overflow-hidden rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right transition-all duration-300 open:border-violet-400/40 ${kasabCoerciveEmphasis ? 'ring-2 ring-[#E6C673]/45 border-[#E6C673]/35' : ''}`}
            >
				<summary className="flex cursor-pointer list-none flex-row-reverse items-center justify-between gap-2 px-3 py-3 transition-colors duration-300 hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                    <span className="flex flex-row-reverse items-center gap-2">
						<span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
							<UserX className="w-6 h-6 text-white/70" />
						</span>
                        <span className="text-xs font-bold text-orange-100">حبس تنفيذي</span>
                    </span>
                    <ChevronDown
                        size={18}
                        className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180"
                        aria-hidden
                    />
                </summary>
                <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2 transition-all duration-300">
                {detention.pending || detention.rejected ? (
                    <div className="pb-2">
                        {detention.rejected ? (
                            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-3">
                                <p className="text-[11px] font-black text-rose-200 text-right">
                                    تم رفض الطلب من قبل المنفذ
                                </p>
                                <div className="mt-2">
                                    <ExecutionInlineExecutorDecisionActions
                                        executionId={exId}
                                        decisionId={findLatestDecisionIdForSubtype('executive_detention') || ''}
                                        requestKind="personal_coercive"
                                        personalCoerciveSubtype="executive_detention"
                                        disabled
                                        onOpenAppealCenter={() =>
                                            onOpenDecisions({
                                                tab: 'appeals',
                                                decisionId: findLatestDecisionIdForSubtype('executive_detention'),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        ) : (
                            <ExecutionInlineExecutorDecisionActions
                                executionId={exId}
                                decisionId={findLatestDecisionIdForSubtype('executive_detention') || ''}
                                requestKind="personal_coercive"
                                personalCoerciveSubtype="executive_detention"
                            />
                        )}
                    </div>
                ) : null}
                {!detention.pending && !detention.approved && !detentionActive && judgeDetention === null ? (
                    <>
                        <label className="flex cursor-pointer flex-row-reverse items-center justify-end gap-2 text-[11px] text-slate-300">
                            <span>طلب حبس غيابي</span>
                            <input
                                type="checkbox"
                                checked={inAbsentia}
                                onChange={(e) =>
                                    persistExecutionMerge({
                                        executive_detention_request_in_absentia: e.target.checked,
                                    })
                                }
                                className="rounded border-slate-600"
                            />
                        </label>
                        {!inAbsentia ? null : (
                            <p className="text-[9px] text-amber-200/90 leading-relaxed">
                                وضع غيابي: يُذكر في الطلب والسجل؛ تبقى شارة مذكرة القبض إن وُجدت حتى يُلقى القبض أو يُنفّذ
                                الحبس حضورياً.
                            </p>
                        )}
                    </>
                ) : null}
                {detentionActive && detentionUntil ? (
                    <p className="text-[10px] text-orange-200">
                        🔒 موقوف تنفيذياً — حتى {detentionUntil}
                    </p>
                ) : detention.pending ? (
                    null
                ) : detention.alternative ? (
                    <p className="text-[10px] text-amber-200/90">
                        🔄 سُجّل قرار بديل للمنفذ — راجع المهام ومحضر المتابعة.
                    </p>
                ) : detention.approved && judgeDetention === null ? (
                    <div className="space-y-2">
                        <p className="text-[10px] text-emerald-200/90">
                            وافق المنفذ — سجّل قرار قاضي البداءة بشأن الحبس التنفيذي:
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                type="button"
                                className="w-full rounded-xl bg-emerald-800/55 py-2 text-[11px] font-bold text-white border border-emerald-500/35"
                                onClick={() => {
                                    persistExecutionMerge({ executive_detention_judge_outcome: 'approved' });
                                    const now = new Date().toISOString();
                                    pushTimelineEvent({
                                        id: nextTimelineId(),
                                        date: getLocalTodayYmd(),
                                        timestamp: now,
                                        title: '⚖️ وافق قاضي البداءة على حبس المدين',
                                        description: 'بعد موافقة المنفذ على طلب عرض الإضبارة لغرض الحبس التنفيذي.',
                                        type: 'coercive',
                                        source: 'محضر المتابعة',
                                        metadata: debtorTimelineMeta,
                                    });
                                    showToast('تم التسجيل — أدخل مدة الحبس أدناه.', 'success');
                                }}
                            >
                                وافق القاضي على الحبس
                            </button>
                            <button
                                type="button"
                                className="w-full rounded-xl border border-rose-500/45 bg-rose-950/35 py-2 text-[11px] font-bold text-rose-100"
                                onClick={() => {
                                    setDetentionRejectionOpen(true);
                                }}
                            >
                                رفض القاضي حبس المدين
                            </button>
                        </div>
                        {detentionRejectionOpen ? (
                            <div className="space-y-2 rounded-2xl border border-rose-500/25 bg-rose-950/15 p-3">
                                <p className="text-[10px] font-bold text-rose-200">يرجى ذكر سبب الرفض</p>
                                <textarea
                                    value={detentionRejectionReason}
                                    onChange={(e) => setDetentionRejectionReason(e.target.value)}
                                    rows={3}
                                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[11px] text-white"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        disabled={detentionRejectionSaving}
                                        className="rounded-xl border border-rose-500/40 bg-rose-900/30 py-2.5 text-[11px] font-black text-rose-100 disabled:opacity-50"
                                        onClick={() => {
                                            const reason = detentionRejectionReason.trim();
                                            if (!reason) {
                                                showToast('سبب الرفض مطلوب.', 'warning');
                                                return;
                                            }
                                            if (detentionRejectionSaving) return;
                                            setDetentionRejectionSaving(true);
                                            persistExecutionMerge({
                                                executive_detention_judge_outcome: 'rejected',
                                                executive_detention_judge_rejection_reason: reason,
                                            });
                                            const now = new Date().toISOString();
                                            pushTimelineEvent({
                                                id: nextTimelineId(),
                                                date: getLocalTodayYmd(),
                                                timestamp: now,
                                                title: '⚖️ رفض قاضي البداءة حبس المدين',
                                                description: `سبب الرفض: ${reason}`,
                                                type: 'coercive',
                                                source: 'محضر المتابعة',
                                                metadata: debtorTimelineMeta,
                                            });
                                            const decisionId = findLatestDecisionIdForSubtype('executive_detention');
                                            if (decisionId) {
                                                patchExecutorDecisionRow(exId, decisionId, {
                                                    executorOutcome: 'rejected',
                                                    resolvedAt: now,
                                                    appealRequestOrigin: 'executor_side',
                                                    appealBaseBranch: 'after_rejection',
                                                    appealMethod: 'tamyeez',
                                                    appealStatus: 'pending',
                                                });
                                            }
                                            setDetentionRejectionSaving(false);
                                            setDetentionRejectionOpen(false);
                                            setDetentionRejectionReason('');
                                            onOpenDecisions({ tab: 'appeals', decisionId });
                                            showToast('تم تحويلك إلى تبويب الطعون (تمييز) لفتح مسودة الطعن.', 'info', {
                                                decisionsLink: true,
                                                decisionsTab: 'appeals',
                                                decisionId: decisionId ?? undefined,
                                            });
                                        }}
                                    >
                                        حفظ السبب والانتقال للطعن
                                    </button>
                                    <button
                                        type="button"
                                        disabled={detentionRejectionSaving}
                                        className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                                        onClick={() => {
                                            setDetentionRejectionOpen(false);
                                            setDetentionRejectionReason('');
                                        }}
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : detention.approved && judgeDetention === 'approved' ? (
                    <div className="space-y-2">
                        <p className="text-[10px] text-emerald-200/90">
                            تُحتسب مدة الحبس التنفيذي تلقائياً لمدة 4 أشهر.
                        </p>
                        {inAbsentia ? (
                            <button
                                type="button"
                                className="w-full rounded-xl bg-orange-800/55 py-2 text-[11px] font-bold text-white"
                                onClick={() => {
                                    persistExecutionMerge({ debtorArrested: true });
                                    startDetentionFourMonths({ markCustody: true });
                                }}
                            >
                                تم إلقاء القبض على المدين — بدء المدة
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="w-full rounded-xl bg-orange-800/55 py-2 text-[11px] font-bold text-white"
                                onClick={() => startDetentionFourMonths({ markCustody: true })}
                            >
                                بدء المدة (4 أشهر)
                            </button>
                        )}
                    </div>
                    ) : detention.approved && judgeDetention === 'rejected' ? (
                    <div className="space-y-2">
                        <p className="text-[10px] text-rose-300 leading-relaxed">
                            رُفض الحبس من قبل قاضي البداءة — يمكنك تقديم طلباً جديداً بعد المراجعة.
                        </p>
                        <div className="relative">
                            <button
                                type="button"
                                disabled={coerciveUiLocked || (!inAbsentia && !debtorPresentEffective)}
                                className="w-full rounded-xl border border-orange-500/35 bg-orange-950/25 py-2.5 text-[11px] font-bold text-orange-100 disabled:opacity-40"
                                onClick={() => {
                                    if (detention.pending || detention.rejected) return;
                                    if (!guardSummonsGate()) return;
                                    setConfirmingKey('executive_detention');
                                }}
                            >
                                تقديم طلب حبس تنفيذي
                            </button>
                            {renderInlineGate('executive_detention', () => {
                                setSendingKey('executive_detention');
                                if (detention.pending) {
                                    setSendingKey(null);
                                    setConfirmingKey(null);
                                    return;
                                }
                                void submitRequest(
                                    'executive_detention',
                                    'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين',
                                    inAbsentia
                                        ? 'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين — وضع غيابي؛ امتناع عن التسديد دون مثول أمام المنفذ.'
                                        : 'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين لامتناعه عن التسديد رغم مثوله أمام المنفذ دون تسوية مقبولة.'
                                ).finally(() => {
                                    setSendingKey(null);
                                    setConfirmingKey(null);
                                });
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <button
                            type="button"
                            disabled={coerciveUiLocked || (!inAbsentia && !debtorPresentEffective)}
                            className="w-full rounded-xl border border-orange-500/35 bg-orange-950/25 py-2.5 text-[11px] font-bold text-orange-100 disabled:opacity-40"
                            onClick={() => {
                                if (detention.pending || detention.rejected) return;
                                if (!guardSummonsGate()) return;
                                setConfirmingKey('executive_detention');
                            }}
                        >
                            تقديم طلب حبس تنفيذي
                        </button>
                        {renderInlineGate('executive_detention', () => {
                            setSendingKey('executive_detention');
                            if (detention.pending) {
                                setSendingKey(null);
                                setConfirmingKey(null);
                                return;
                            }
                            void submitRequest(
                                'executive_detention',
                                'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين',
                                inAbsentia
                                    ? 'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين — وضع غيابي؛ امتناع عن التسديد دون مثول أمام المنفذ.'
                                    : 'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين لامتناعه عن التسديد رغم مثوله أمام المنفذ دون تسوية مقبولة.'
                            ).finally(() => {
                                setSendingKey(null);
                                setConfirmingKey(null);
                            });
                        })}
                    </div>
                )}
                </div>
            </details>

            {onGuarantorRequest && (
                <div className="space-y-2">
                    {guarantorDec.pending ? (
                        <p className="text-[10px] text-amber-200/90 text-center leading-relaxed">
                            طلب الكفيل قيد البت لدى المنفذ — راجع «القرارات والطعون».
                        </p>
                    ) : guarantorDec.rejected ? (
                        <p className="text-[10px] text-rose-200/90 text-center leading-relaxed">
                            رُفض طلب الكفيل — يمكنك التقديم مجدداً إن رُفع الرفض أو تغيّر الموقف.
                        </p>
                    ) : guarantorDec.alternative ? (
                        <p className="text-[10px] text-amber-200/90 text-center leading-relaxed">
                            سُجِّل قرار بديل بشأن الكفيل — راجع القرارات.
                        </p>
                    ) : guarantorAwaitingSave ? (
                        <p className="text-[10px] text-emerald-200/90 text-center leading-relaxed">
                            وافق المنفذ — أكمل وحفظ بيانات الكفيل من اسم الكفيل أسفل المدين أو من الزر أدناه.
                        </p>
                    ) : null}
                    {guarantorDec.pending || guarantorDec.rejected ? (
                        <div className="mt-2">
                            {guarantorDec.rejected ? (
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findLatestGuarantorDecisionId() || ''}
                                    requestKind="guarantor_request"
                                    disabled
                                    onOpenAppealCenter={() =>
                                        onOpenDecisions({
                                            tab: 'appeals',
                                            decisionId: findLatestGuarantorDecisionId(),
                                        })
                                    }
                                />
                            ) : (
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findLatestGuarantorDecisionId() || ''}
                                    requestKind="guarantor_request"
                                />
                            )}
                        </div>
                    ) : null}
                    {guarantorAwaitingSave && onOpenGuarantorDetails ? (
                        <button
                            type="button"
                            disabled={coerciveUiLocked}
                            onClick={() => onOpenGuarantorDetails()}
                            className="w-full rounded-xl border border-emerald-500/40 bg-emerald-950/25 py-2.5 text-[11px] font-bold text-emerald-100 disabled:opacity-40"
                        >
                            إكمال بيانات الكفيل
                        </button>
                    ) : null}
                </div>
            )}

            {detentionActive && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            if (coerciveUiLocked || isHistoricalMode) return;
                            setReleaseConfirmOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 flex-row-reverse rounded-xl border border-emerald-800 bg-emerald-900/20 py-2.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-800/30 transition-all disabled:opacity-40"
                        disabled={coerciveUiLocked || isHistoricalMode}
                    >
                        <Unlock size={16} />
                        طلب إخلاء سبيل المدين
                    </button>
                </div>
            )}
        </div>
    );
};
