import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Bell, Calendar, CheckCircle, Gavel, Newspaper, Pencil, PauseCircle } from 'lucide-react';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import type {
    EmployeeSummonsAssignmentState,
    EvictionSubsequentSummonsMeta,
    PublicationNoticeDebtorState,
} from '@/app/types/execution';
import {
    computeTaklifDeadlineYmd,
    daysRemainingUntilDeadline,
    isAssignmentDeadlinePassed,
} from '@/app/utils/employeeSummonsAssignment';
import { EmployeeAssignmentCoerciveFollowupBlock } from '@/app/components/lawyer/execution/EmployeeAssignmentCoerciveFollowupBlock';
import {
    publicationNoticeDeadlineYmd,
    PUBLICATION_NOTICE_DURATION_DAYS,
} from '@/app/utils/publicationNoticeDebtor';
import { parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import { getExecutionSummons7DayWindow } from '@/app/utils/executionSummonsWorkflow';
import { headingForSubsequentNotice } from './Modal_Unified_Summons_Hub/utils';
import ConfirmAttendanceModal from './Modal_Unified_Summons_Hub/components/ConfirmAttendanceModal';

type SummonsProfile = 'employee_monetary' | 'earner_like' | 'hybrid_fees_non_monetary';

export interface UnifiedSummonsHubProps {
    isOpen: boolean;
    onClose: () => void;
    /** عند فتح المركز من شارة (مثلاً التبليغ بالنشر) */
    initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
    onDebtorNotification: (
        date: string,
        purpose: string,
        isHolidayExtension?: boolean,
        evictionSubsequentMeta?: EvictionSubsequentSummonsMeta,
        /** أول إخبار — تخلية كاسب: شمول أتعاب المحاماة في المذكرة الأصلية (undefined إن لم يَنطبق) */
        initialNoticeLawyerFeesIncluded?: boolean,
        notifyOpts?: { forceExecutionMemo?: boolean }
    ) => void;
    notificationCount: number;
    /** بعد الإخبار الأول: يُسمح بتبليغ لاحق فقط بعد حضور/تأمين إحضار (يُمرَّر من لوحة التنفيذ) */
    subsequentNoticeUnlocked?: boolean;
    /**
     * إن true: يُعرض حقل «نوع التبليغ والغاية» ويُدمَج في الطلب فقط عندما subsequentNoticeUnlocked (مسار موظف/كاسب غير تخلية).
     * إن false (هجين/تخلية): يُتعامل مع الحقل كما بعد التبليغ الأول دون هذا القفل الإضافي.
     */
    noticeKindGoalStrictBinding?: boolean;
    canForceSummon?: boolean;
    forceSummonLockReason?: string;
    isGovernmentEmployee?: boolean;
    hasSalaryCoerciveStep?: boolean;
    onRegisterDebtorVoluntaryAttendance?: () => void;
    onOpenCoerciveModal?: () => void;
    summonsProfile?: SummonsProfile;
    summoningRound?: number;
    earnerForcedActionUnlocked?: boolean;
    forcedAttendanceIssued?: boolean;
    onEarnerIssueForcedMemo?: () => void;
    /** تخلية: واجهة مبسّطة (بدون شريط المهلة/تمديد العطلة) + زر إعلان انتهاء المدة الرضائية */
    summonsEvictionSimplifiedUi?: boolean;
    showEvictionVoluntaryPeriodEndButton?: boolean;
    onEvictionVoluntaryPeriodEnd?: () => void;
    /** تخلية: حضور المدين وفتح التنفيذ — حصراً من تبويب المدين (لا من مودال التنفيذ) */
    evictionDebtorExecutionStrip?: {
        visible: boolean;
        showAttendanceButton: boolean;
        showCoerciveButton: boolean;
        onRegisterAttendance?: () => void;
        onOpenCoercive?: () => void;
    };
    /** لصياغة عناوين التبليغ الثاني+ (موظف مقابل كاسب) */
    debtorIsGovernmentEmployee?: boolean;
    /** تخلية: إخفاء إحضار جبري واختصارات الإكراه أثناء مهلة الإخبار الأولى أو للموظف دائماً في هذا المسار */
    evictionSummonsPipelineCoerciveLocked?: boolean;
    /** تخلية + كاسب + موافقة منفذ على الاستحصال: يُسمح بإظهار خيار «التبليغ لغرض الاستحصال» ثم الفرع عادي/جبري */
    evictionEarnerCollectionBranchEligible?: boolean;
    /**
     * تخلية — أول إخبار فقط: إظهار «هل أتعاب المحاماة مشمولة في مذكرة الإخبار الأصلية؟»
     * يُعرض فقط إذا كانت الإضبارة أصلاً تتضمن مطالبة بأتعاب محكومة عند الفتح (لا يُعرض إن تنازل المحامي عنها عند الإنشاء).
     */
    showInitialNoticeLawyerFeesMemoOption?: boolean;
    debtorEvaded?: boolean;
    onEarnerMarkDebtorEvading?: () => void;
    /** غير تخلية: زر إعلان انتهاء المدة الرضائية بعد 7 أيام تقويمية */
    showNoticeVoluntaryPeriodEndButton?: boolean;
    onNoticeVoluntaryPeriodEnd?: () => void;
    tablighTask?: { noticeDateYmd: string; purpose: string } | null;
    onTerminateTablighTask?: () => void;
    guarantorNotificationFeature?: {
        enabled: boolean;
        state:
            | { noticeDateYmd: string; reason: string; endedAt?: string | null; attendedAt?: string | null }
            | null
            | undefined;
        onRegister: (p: { noticeDateYmd: string; reason: string }) => void;
        onAttend: () => void;
        onTerminate: () => void;
    };
    /** تبويب «التكليف بالحضور» — مدين موظف (غير تخلية) بعد مذكرة الإخبار */
    employeeAssignmentFeature?: {
        enabled: boolean;
        state: EmployeeSummonsAssignmentState | null | undefined;
        onConfirm: (p: { purpose: string; notifyDate: string; durationDays: number }) => void;
        onAttend: () => void;
        onDeclareAbsent: () => void;
        onTerminate: () => void;
        onRequestInvestigation: () => void;
        onRegisterArrestOrder: () => void;
        onRequestForcedBring: () => void;
        /** قرارات المنفذ — طلب إحضار جبري ضمن مسار التكليف (مرحلة أمر القبض) */
        forcedBringPending?: boolean;
        forcedBringApprovedAwaitingOutcome?: boolean;
        forcedBringRejected?: boolean;
        onWarrantDebtorBrought: () => void;
        onWarrantTerminate: () => void;
    };
    /** تبويب «التبليغ بالنشر» — بعد أول إخبار مسجّل */
    publicationNoticeFeature?: {
        state: PublicationNoticeDebtorState | null;
        onRegister: (p: {
            publicationDateYmd: string;
            newspaper1: string;
            newspaper2: string;
        }) => void;
        /** إنهاء دورة التبليغ بالنشر يدوياً */
        onTerminate: () => void;
        /** إنهاء الدورة لأن المدين حضر */
        onDebtorAttended: () => void;
    };
    /** معرّف الإضبارة لاستخدامه في مفاتيح localStorage الخاصة بسير الإخبار */
    executionId?: string;

    /** تاريخ الإخبار/التبليغ الفعلي المحفوظ (للتمثيل داخل المودال) */
    executionSummonsNoticeDateYmd?: string | null;

    /** هل انتهت دورة مذكرة الإخبار لهذه الإضبارة (حضور أو انتهاء مهلة) */
    executionSummonsArchived?: boolean;
}

export const UnifiedSummonsHub: React.FC<UnifiedSummonsHubProps> = ({
    isOpen,
    onClose,
    initialMainTab = null,
    onDebtorNotification,
    notificationCount,
    subsequentNoticeUnlocked = false,
    noticeKindGoalStrictBinding = true,
    canForceSummon = false,
    forceSummonLockReason = '',
    isGovernmentEmployee = false,
    hasSalaryCoerciveStep = false,
    onRegisterDebtorVoluntaryAttendance,
    onOpenCoerciveModal,
    summonsProfile = 'earner_like',
    summoningRound = 1,
    earnerForcedActionUnlocked = false,
    forcedAttendanceIssued = false,
    onEarnerIssueForcedMemo,
    summonsEvictionSimplifiedUi = false,
    showEvictionVoluntaryPeriodEndButton = false,
    onEvictionVoluntaryPeriodEnd,
    evictionDebtorExecutionStrip,
    debtorIsGovernmentEmployee = false,
    evictionSummonsPipelineCoerciveLocked = false,
    evictionEarnerCollectionBranchEligible = false,
    showInitialNoticeLawyerFeesMemoOption = false,
    debtorEvaded = false,
    onEarnerMarkDebtorEvading,
    showNoticeVoluntaryPeriodEndButton = false,
    onNoticeVoluntaryPeriodEnd,
    tablighTask = null,
    onTerminateTablighTask,
    guarantorNotificationFeature,
    employeeAssignmentFeature,
    publicationNoticeFeature,
    executionId,
    executionSummonsNoticeDateYmd = null,
    executionSummonsArchived = false,
}) => {
    const [debtorDate, setDebtorDate] = useState<string>('');
    
    // 🆕 V15: FUTURE DATE VALIDATION
    const [dateError, setDateError] = useState<string>('');
    
    // 🆕 V17: MANUAL HOLIDAY EXTENSION
    const [isHolidayExtension, setIsHolidayExtension] = useState<boolean>(false);
    const [noticeKindGoal, setNoticeKindGoal] = useState<string>('');
    const [evictionSecondBranch, setEvictionSecondBranch] = useState<'ordinary' | 'coercive' | ''>('');
    const [secondNoticeForCollection, setSecondNoticeForCollection] = useState(false);
    /** أول إخبار بالتنفيذ — كاسب: تفعيل = الأتعاب مشمولة في المذكرة الأصلية؛ بدون تفعيل = مسار اعتيادي */
    const [initialNoticeLawyerFeesIncluded, setInitialNoticeLawyerFeesIncluded] = useState(false);
    const [memoDateOptimistic, setMemoDateOptimistic] = useState<string>('');
    const [memoError, setMemoError] = useState<string>('');
    const [memoArchivedOptimistic, setMemoArchivedOptimistic] = useState(false);
    const memoDateInputRef = useRef<HTMLInputElement | null>(null);
    const [tablighMode, setTablighMode] = useState<'memo' | 'regular'>('memo');
    const [executionMemoRegisterMode, setExecutionMemoRegisterMode] = useState(false);
    const [confirmAttendanceWithoutNoticeOpen, setConfirmAttendanceWithoutNoticeOpen] = useState(false);

    const [hubMainTab, setHubMainTab] = useState<'tabligh' | 'taklif' | 'nashr' | 'guarantor'>('tabligh');
    const [taklifPurpose, setTaklifPurpose] = useState('');
    const [taklifDate, setTaklifDate] = useState('');
    const [taklifDurationDays, setTaklifDurationDays] = useState(1);
    const [taklifFormError, setTaklifFormError] = useState('');
    const [tablighTaskOptimistic, setTablighTaskOptimistic] = useState<
        { noticeDateYmd: string; purpose: string } | null
    >(null);
    const [nashrDate, setNashrDate] = useState('');
    const [nashrPaper1, setNashrPaper1] = useState('');
    const [nashrPaper2, setNashrPaper2] = useState('');
    const [nashrFormError, setNashrFormError] = useState('');
    const [guarantorNoticeDate, setGuarantorNoticeDate] = useState('');
    const [guarantorNoticeReason, setGuarantorNoticeReason] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setEvictionSecondBranch('');
            setSecondNoticeForCollection(false);
            setInitialNoticeLawyerFeesIncluded(false);
            setExecutionMemoRegisterMode(false);
            setMemoDateOptimistic('');
            setMemoError('');
            setTablighMode('memo');
            setHubMainTab('tabligh');
            setTaklifPurpose('');
            setTaklifDate('');
            setTaklifDurationDays(1);
            setTaklifFormError('');
            setTablighTaskOptimistic(null);
            setNashrDate('');
            setNashrPaper1('');
            setNashrPaper2('');
            setNashrFormError('');
            setGuarantorNoticeDate('');
            setGuarantorNoticeReason('');
        }
    }, [isOpen]);

    useEffect(() => {
        setTablighTaskOptimistic(null);
    }, [executionId]);

    useEffect(() => {
        setMemoDateOptimistic('');
        setMemoError('');
        setMemoArchivedOptimistic(false);
        setExecutionMemoRegisterMode(false);
    }, [executionId]);

    useEffect(() => {
        if (isOpen && initialMainTab) {
            setHubMainTab(initialMainTab);
        }
    }, [isOpen, initialMainTab]);

    const memoArchivedResolved = Boolean(executionSummonsArchived || memoArchivedOptimistic);

    const showTaklifOptionInHub = Boolean(memoArchivedResolved);
    const showPublicationTab = Boolean(
        memoArchivedResolved || (!memoArchivedResolved && notificationCount <= 1)
    );

    const hubTabOptions = useMemo(() => {
        const opts: { value: 'tabligh' | 'taklif' | 'nashr' | 'guarantor'; label: string }[] = [];
        opts.push({ value: 'tabligh', label: memoArchivedResolved ? 'التبليغ' : 'التبليغ / الإخبار' });
        if (showTaklifOptionInHub) opts.push({ value: 'taklif', label: 'التكليف بالحضور' });
        if (showPublicationTab) opts.push({ value: 'nashr', label: 'التبليغ بالنشر' });
        if (guarantorNotificationFeature?.enabled) opts.push({ value: 'guarantor', label: 'تبليغ الكفيل' });
        return opts;
    }, [guarantorNotificationFeature?.enabled, memoArchivedResolved, showTaklifOptionInHub, showPublicationTab]);

    useEffect(() => {
        if (!isOpen) return;
        if (!hubTabOptions.some((o) => o.value === hubMainTab)) {
            setHubMainTab('tabligh');
        }
    }, [isOpen, hubMainTab, hubTabOptions]);

    useEffect(() => {
        if (!publicationNoticeFeature?.state) {
            setNashrDate('');
            setNashrPaper1('');
            setNashrPaper2('');
        }
    }, [publicationNoticeFeature?.state]);

    useEffect(() => {
        if (!isOpen) return;
        const st = guarantorNotificationFeature?.state;
        if (!st) {
            setGuarantorNoticeDate('');
            setGuarantorNoticeReason('');
            return;
        }
        setGuarantorNoticeDate(String(st.noticeDateYmd || '').trim());
        setGuarantorNoticeReason(String(st.reason || '').trim());
    }, [guarantorNotificationFeature?.state, isOpen]);

    const empAssign = employeeAssignmentFeature?.state;
    const empEffectiveDeadlineYmd = useMemo(() => {
        if (!empAssign) return '';
        if (empAssign.deadlineDate) return empAssign.deadlineDate;
        if (empAssign.notifyDate)
            return computeTaklifDeadlineYmd(empAssign.notifyDate, empAssign.durationDays ?? 1);
        return '';
    }, [empAssign]);

    const empPhase: EmployeeSummonsAssignmentState['phase'] =
        empAssign?.phase && empAssign.phase !== 'none' ? empAssign.phase : 'none';

    const memoNoticeDateYmd = String(memoDateOptimistic || executionSummonsNoticeDateYmd || '').trim();
    const memoWindow = memoNoticeDateYmd ? getExecutionSummons7DayWindow(memoNoticeDateYmd) : null;
    const showSubsequentNoticeForm = false;

    const resolvedTablighTask = tablighTaskOptimistic || tablighTask;

    useEffect(() => {
        if (!isOpen) return;
        setTablighMode(memoArchivedResolved ? 'regular' : 'memo');
    }, [isOpen, memoArchivedResolved]);
    
    const validateDate = (inputDate: string): { ok: boolean; error?: string } => {
        const trimmed = String(inputDate || '').trim();
        if (!trimmed) return { ok: false, error: 'أدخل تاريخ التبليغ' };
        const selectedDate = parseLocalNotificationDate(trimmed);
        selectedDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate > today) return { ok: false, error: 'لا يمكن إدخال تاريخ تبليغ مستقبلي' };
        return { ok: true };
    };

    const validateMemoDate = useCallback(
        (inputDate: string): boolean => {
            if (!inputDate) return false;
            const selectedDate = parseLocalNotificationDate(inputDate);
            selectedDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate > today) {
                setMemoError('لا يمكن إدخال تاريخ تبليغ مستقبلي');
                return false;
            }
            setMemoError('');
            return true;
        },
        []
    );

    const openMemoDatePicker = useCallback(() => {
        const el = memoDateInputRef.current;
        if (!el) return;
        try {
            (el as any).showPicker?.();
        } catch {
            /* ignore */
        }
        try {
            el.focus();
            el.click();
        } catch {
            /* ignore */
        }
    }, []);

    const submitExecutionSummonsDate = useCallback(
        (nextYmd: string) => {
            const ymd = String(nextYmd || '').trim();
            if (!ymd) return;
            if (!validateMemoDate(ymd)) return;
            const forceMemo = executionMemoRegisterMode && notificationCount === 1;
            const initialFeesFlag =
                summonsEvictionSimplifiedUi &&
                showInitialNoticeLawyerFeesMemoOption &&
                (notificationCount === 0 || forceMemo)
                    ? initialNoticeLawyerFeesIncluded
                    : undefined;
            onDebtorNotification(ymd, '', false, undefined, initialFeesFlag, { forceExecutionMemo: forceMemo });
            setMemoDateOptimistic(ymd);
            setMemoArchivedOptimistic(false);
        },
        [
            initialNoticeLawyerFeesIncluded,
            notificationCount,
            onDebtorNotification,
            showInitialNoticeLawyerFeesMemoOption,
            summonsEvictionSimplifiedUi,
            validateMemoDate,
            executionMemoRegisterMode,
        ]
    );

    const markExecutionSummonsArchived = useCallback(
        (kind: 'attended' | 'expired') => {
            setMemoArchivedOptimistic(true);
            if (kind === 'attended') {
                if (!evictionDebtorExecutionStrip?.visible) {
                    onRegisterDebtorVoluntaryAttendance?.();
                } else {
                    evictionDebtorExecutionStrip.onRegisterAttendance?.();
                }
                return;
            }
            if (summonsEvictionSimplifiedUi) {
                onEvictionVoluntaryPeriodEnd?.();
            } else {
                onNoticeVoluntaryPeriodEnd?.();
            }
        },
        [
            evictionDebtorExecutionStrip,
            onEvictionVoluntaryPeriodEnd,
            onNoticeVoluntaryPeriodEnd,
            onRegisterDebtorVoluntaryAttendance,
            summonsEvictionSimplifiedUi,
        ]
    );

    const canMergeNoticeKindIntoPurpose =
        notificationCount > 0 && (!noticeKindGoalStrictBinding || subsequentNoticeUnlocked);

    const handleDebtorSubmit = () => {
        const collectionUiActive =
            evictionEarnerCollectionBranchEligible &&
            showSubsequentNoticeForm &&
            summonsEvictionSimplifiedUi;
        if (collectionUiActive && secondNoticeForCollection && !evictionSecondBranch) {
            setDateError('اختر نوع التبليغ: عادي أو مسار إحضار جبري');
            return;
        }
        const noticeDateTrim = String(debtorDate ?? '').trim();
        if (!noticeDateTrim) {
            setDateError('أدخل تاريخ التبليغ');
            return;
        }
        const vr = validateDate(noticeDateTrim);
        if (!vr.ok) {
            setDateError(vr.error || 'تأكد من تاريخ التبليغ');
            return;
        }
        {
            let purposeOut = noticeKindGoal.trim();
            if (collectionUiActive && secondNoticeForCollection && evictionSecondBranch) {
                const branchNote =
                    evictionSecondBranch === 'coercive'
                        ? 'غاية التبليغ: استحصال مؤيد من المنفذ — مسار إحضار جبري وما يليه من تأمين إحضار / مفاتحة محكمة التحقيق / قبض وتأمين مثول عند التخفي'
                        : 'غاية التبليغ: استحصال مؤيد من المنفذ — تكليف بالحضور (تبليغ عادي دون إحضار جبري)';
                purposeOut = purposeOut ? `${purposeOut}\n— ${branchNote}` : branchNote;
            }
            let evictionMeta: EvictionSubsequentSummonsMeta | undefined;
            if (summonsEvictionSimplifiedUi && showSubsequentNoticeForm) {
                evictionMeta = {
                    forCollection: Boolean(
                        evictionEarnerCollectionBranchEligible && secondNoticeForCollection
                    ),
                    branch:
                        evictionEarnerCollectionBranchEligible && secondNoticeForCollection
                            ? evictionSecondBranch || null
                            : null,
                };
            }
            const forceMemo = executionMemoRegisterMode && notificationCount === 1;
            const initialFeesFlag =
                (notificationCount === 0 || (summonsEvictionSimplifiedUi && forceMemo)) &&
                summonsEvictionSimplifiedUi &&
                showInitialNoticeLawyerFeesMemoOption
                    ? initialNoticeLawyerFeesIncluded
                    : undefined;
            onDebtorNotification(noticeDateTrim, purposeOut, isHolidayExtension, evictionMeta, initialFeesFlag, {
                forceExecutionMemo: forceMemo,
            });
            setDebtorDate('');
            setNoticeKindGoal('');
            setIsHolidayExtension(false);
            setDateError('');
            setExecutionMemoRegisterMode(false);
            onClose();
        }
    };

    const handleTaklifConfirm = () => {
        setTaklifFormError('');
        if (!employeeAssignmentFeature) return;
        if (!taklifPurpose.trim()) {
            setTaklifFormError('يرجى إدخال الغاية من التكليف');
            return;
        }
        const taklifDateTrim = String(taklifDate ?? '').trim();
        if (!taklifDateTrim) {
            setTaklifFormError('أدخل تاريخ التكليف (تاريخ التبليغ بالتكليف)');
            return;
        }
        const vr = validateDate(taklifDateTrim);
        if (!vr.ok) {
            setDateError(vr.error || 'تأكد من تاريخ التبليغ بالتكليف');
            setTaklifFormError(vr.error || 'تأكد من تاريخ التبليغ بالتكليف');
            return;
        }
        setDateError('');
        const dur = Number(taklifDurationDays);
        if (!Number.isFinite(dur) || dur < 1) {
            setTaklifFormError('أدخل مدة صحيحة بالأيام');
            return;
        }
        employeeAssignmentFeature.onConfirm({
            purpose: taklifPurpose.trim(),
            notifyDate: taklifDateTrim,
            durationDays: dur,
        });
        setTaklifPurpose('');
        setTaklifDate('');
        setTaklifDurationDays(1);
        setTaklifFormError('');
        setDateError('');
        setHubMainTab('tabligh');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification }}
            onClick={onClose}
            role="presentation"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0B1120] border-2 border-indigo-500/40 rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-b border-indigo-500/30 p-4 flex justify-between items-center">
                    <button type="button" onClick={onClose} className="p-2 hover:bg-indigo-500/20 rounded-lg transition-all">
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-indigo-400 font-bold text-lg flex items-center gap-2">
                        <Bell size={20} />
                        التبليغ
                    </h2>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-5">
                    {hubTabOptions.length > 1 && !(!memoArchivedResolved && notificationCount <= 1) && (
                        <div className="mb-4">
                            <label
                                htmlFor="unified-summons-kind"
                                className="mb-2 block text-right text-xs font-semibold text-gray-300"
                            >
                                نوع التبليغ
                            </label>
                            <select
                                id="unified-summons-kind"
                                value={hubMainTab}
                                onChange={(e) => {
                                    const v = e.target.value as 'tabligh' | 'taklif' | 'nashr';
                                    setHubMainTab(v);
                                    setTaklifFormError('');
                                    setNashrFormError('');
                                }}
                                className="w-full rounded-xl border border-indigo-500/30 bg-slate-800/50 px-4 py-2.5 text-right text-sm text-white"
                                dir="rtl"
                            >
                                {hubTabOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {hubMainTab === 'tabligh' && (
                        <motion.div
                            key="debtor"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            {!memoArchivedResolved && notificationCount <= 1 ? (
                                <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-[#0B1120]/70 via-slate-950/50 to-indigo-950/25 p-4 shadow-lg shadow-black/30 backdrop-blur-xl" dir="rtl">
                                    <input
                                        ref={memoDateInputRef}
                                        type="date"
                                        value={memoNoticeDateYmd}
                                        onChange={(e) => submitExecutionSummonsDate(e.target.value)}
                                        className="sr-only"
                                    />

                                    {memoArchivedResolved ? (
                                        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 px-3 py-3">
                                            <div className="flex flex-row-reverse items-center justify-between gap-2">
                                                <span className="text-[12px] font-black text-emerald-200">مؤرشفة</span>
                                                {memoNoticeDateYmd ? (
                                                    <span className="text-[11px] font-mono text-slate-200">
                                                        {memoNoticeDateYmd}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : memoNoticeDateYmd ? (
                                        <div className="space-y-3">
                                            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                                                <div className="flex flex-row-reverse items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-[10px] font-semibold text-slate-400">
                                                            تاريخ التبليغ
                                                        </div>
                                                        <div className="mt-0.5 text-[12px] font-mono font-bold text-white">
                                                            {memoNoticeDateYmd}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={openMemoDatePicker}
                                                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-200 hover:bg-white/[0.06]"
                                                        aria-label="تعديل التاريخ"
                                                        title="تعديل التاريخ"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                </div>
                                                {memoWindow ? (
                                                    <div className="mt-2 flex flex-row-reverse items-center justify-between gap-2">
                                                        <span className="text-[10px] text-slate-400">تنتهي</span>
                                                        <span className="text-[10px] font-mono text-slate-200">
                                                            {memoWindow.expiryDateYmd}
                                                        </span>
                                                        <span
                                                            className={`ml-auto rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                                                                memoWindow.isExpired
                                                                    ? 'border-amber-500/30 bg-amber-950/25 text-amber-200'
                                                                    : 'border-indigo-400/20 bg-indigo-950/25 text-indigo-200'
                                                            }`}
                                                        >
                                                            {memoWindow.isExpired
                                                                ? 'منتهية'
                                                                : `باقي ${memoWindow.daysRemaining} يوم`}
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </div>

                                            {summonsEvictionSimplifiedUi && showInitialNoticeLawyerFeesMemoOption ? (
                                                <label className="flex cursor-pointer flex-row-reverse items-center justify-between gap-3 rounded-xl border border-sky-500/25 bg-sky-950/15 px-3 py-2">
                                                    <span className="text-[11px] font-bold text-sky-100/90">
                                                        شمول أتعاب المحاماة
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        checked={initialNoticeLawyerFeesIncluded}
                                                        onChange={(e) => setInitialNoticeLawyerFeesIncluded(e.target.checked)}
                                                        className="h-5 w-5 cursor-pointer rounded border-sky-500/40 bg-slate-900/50 checked:bg-sky-500"
                                                    />
                                                </label>
                                            ) : null}

                                            {memoError ? (
                                                <div className="text-right text-[11px] font-bold text-rose-300">
                                                    {memoError}
                                                </div>
                                            ) : null}

                                            <button
                                                type="button"
                                                onClick={() => markExecutionSummonsArchived('attended')}
                                                className="w-full rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-900/45 to-emerald-800/40 py-3 text-[12px] font-black text-emerald-50 shadow-[0_0_22px_rgba(16,185,129,0.14)] hover:from-emerald-800/55 hover:to-emerald-700/55"
                                            >
                                                <span className="flex flex-row-reverse items-center justify-center gap-2">
                                                    <CheckCircle size={18} className="text-emerald-200" />
                                                    حضر المدين
                                                </span>
                                            </button>

                                            {memoWindow?.isExpired ? (
                                                <button
                                                    type="button"
                                                    onClick={() => markExecutionSummonsArchived('expired')}
                                                    className="w-full rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-950/55 to-orange-950/40 py-3 text-[12px] font-black text-amber-50 shadow-[0_0_22px_rgba(245,158,11,0.12)] hover:from-amber-900/60 hover:to-orange-900/55"
                                                >
                                                    <span className="flex flex-row-reverse items-center justify-center gap-2">
                                                        <Calendar size={18} className="text-amber-200" />
                                                        انتهاء مدة الإخبار
                                                    </span>
                                                </button>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {summonsEvictionSimplifiedUi && showInitialNoticeLawyerFeesMemoOption ? (
                                                <label className="flex cursor-pointer flex-row-reverse items-center justify-between gap-3 rounded-xl border border-sky-500/25 bg-sky-950/15 px-3 py-2">
                                                    <span className="text-[11px] font-bold text-sky-100/90">
                                                        شمول أتعاب المحاماة
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        checked={initialNoticeLawyerFeesIncluded}
                                                        onChange={(e) => setInitialNoticeLawyerFeesIncluded(e.target.checked)}
                                                        className="h-5 w-5 cursor-pointer rounded border-sky-500/40 bg-slate-900/50 checked:bg-sky-500"
                                                    />
                                                </label>
                                            ) : null}
                                            {memoError ? (
                                                <div className="text-right text-[11px] font-bold text-rose-300">
                                                    {memoError}
                                                </div>
                                            ) : null}
                                            <button
                                                type="button"
                                                onClick={openMemoDatePicker}
                                                className="w-full rounded-xl border border-indigo-500/35 bg-gradient-to-r from-indigo-950/55 to-purple-950/40 py-3 text-[12px] font-black text-indigo-50 shadow-[0_0_22px_rgba(99,102,241,0.14)] hover:from-indigo-900/60 hover:to-purple-900/55"
                                            >
                                                <span className="flex flex-row-reverse items-center justify-center gap-2">
                                                    <Calendar size={18} className="text-indigo-200" />
                                                    تحديد تاريخ التبليغ بمذكرة الإخبار
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setHubMainTab('nashr');
                                                    setDateError('');
                                                    setNashrFormError('');
                                                }}
                                                className="w-full rounded-xl border border-violet-500/35 bg-gradient-to-r from-violet-950/55 to-fuchsia-950/40 py-3 text-[12px] font-black text-violet-50 shadow-[0_0_22px_rgba(139,92,246,0.14)] hover:from-violet-900/60 hover:to-fuchsia-900/55"
                                            >
                                                <span className="flex flex-row-reverse items-center justify-center gap-2">
                                                    <Newspaper size={18} className="text-violet-200" />
                                                    التبليغ بالمذكرة بواسطة النشر
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setConfirmAttendanceWithoutNoticeOpen(true)}
                                                disabled={!onRegisterDebtorVoluntaryAttendance && !evictionDebtorExecutionStrip?.onRegisterAttendance}
                                                className="w-full rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-900/45 to-emerald-800/40 py-3 text-[12px] font-black text-emerald-50 shadow-[0_0_22px_rgba(16,185,129,0.14)] hover:from-emerald-800/55 hover:to-emerald-700/55 disabled:cursor-not-allowed disabled:border-emerald-500/15 disabled:bg-emerald-950/10 disabled:text-emerald-50/60 disabled:shadow-none disabled:hover:from-emerald-900/45 disabled:hover:to-emerald-800/40"
                                            >
                                                <span className="flex flex-row-reverse items-center justify-center gap-2">
                                                    <CheckCircle
                                                        size={18}
                                                        className={
                                                            onRegisterDebtorVoluntaryAttendance ||
                                                            evictionDebtorExecutionStrip?.onRegisterAttendance
                                                                ? 'text-emerald-200'
                                                                : 'text-emerald-200/60'
                                                        }
                                                    />
                                                    حضور المدين دون تبليغ
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#06131A]/60 via-slate-950/45 to-cyan-950/20 p-4 shadow-lg shadow-black/30 backdrop-blur-xl" dir="rtl">
                                    {!memoArchivedResolved ? (
                                        <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                                            <div className="text-[12px] font-black text-slate-200">غير متاح حالياً</div>
                                            <div className="mt-1 text-[10px] text-slate-500">
                                                أكمل دورة مذكرة الإخبار أولاً.
                                            </div>
                                        </div>
                                    ) : (
                                        resolvedTablighTask ? (
                                            <div className="space-y-3">
                                                <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/15 p-3 text-right">
                                                    <p className="text-cyan-100 text-xs font-black">تبليغ مسجّل</p>
                                                    <p className="mt-1 text-[11px] text-slate-200">
                                                        تاريخ التبليغ:{' '}
                                                        <span className="font-mono tabular-nums">
                                                            {resolvedTablighTask.noticeDateYmd}
                                                        </span>
                                                    </p>
                                                    <p className="mt-1 text-[10px] text-slate-400">
                                                        الغاية: {resolvedTablighTask.purpose.trim() || 'تبليغ'}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onRegisterDebtorVoluntaryAttendance?.();
                                                        setTablighTaskOptimistic(null);
                                                        onClose();
                                                    }}
                                                    className="w-full rounded-xl border border-emerald-500/25 bg-emerald-900/20 py-3 text-[12px] font-black text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.14)] hover:bg-emerald-900/30"
                                                >
                                                    <span className="flex flex-row-reverse items-center justify-center gap-2">
                                                        <CheckCircle size={18} className="text-emerald-200" />
                                                        حضور المدين
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onTerminateTablighTask?.();
                                                        setTablighTaskOptimistic(null);
                                                    }}
                                                    className="w-full rounded-xl border border-amber-500/25 bg-amber-900/15 py-3 text-[12px] font-black text-amber-100 shadow-[0_0_22px_rgba(245,158,11,0.12)] hover:bg-amber-900/25"
                                                >
                                                    <span className="flex flex-row-reverse items-center justify-center gap-2">
                                                        <PauseCircle size={18} className="text-amber-200" />
                                                        إنهاء التبليغ
                                                    </span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="mb-1 block text-right text-[10px] font-bold text-slate-400">
                                                        تاريخ التبليغ
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={debtorDate}
                                                        onChange={(e) => setDebtorDate(e.target.value)}
                                                        className="w-full rounded-xl border border-cyan-500/25 bg-slate-900/40 px-4 py-2.5 text-right text-sm text-white"
                                                    />
                                                    {dateError ? (
                                                        <div className="mt-1 text-right text-[11px] font-bold text-rose-300">
                                                            {dateError}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-right text-[10px] font-bold text-slate-400">
                                                        الغاية (اختياري)
                                                    </label>
                                                    <textarea
                                                        value={noticeKindGoal}
                                                        onChange={(e) => setNoticeKindGoal(e.target.value)}
                                                        rows={3}
                                                        className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/35 px-4 py-2.5 text-right text-sm text-white"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const ymd = String(debtorDate || '').trim();
                                                        if (!ymd) {
                                                            setDateError('أدخل تاريخ التبليغ');
                                                            return;
                                                        }
                                                        const vr = validateDate(ymd);
                                                        if (!vr.ok) {
                                                            setDateError(vr.error || 'تأكد من تاريخ التبليغ');
                                                            return;
                                                        }
                                                        setDateError('');
                                                        const purpose = String(noticeKindGoal || '').trim();
                                                        onDebtorNotification(
                                                            ymd,
                                                            purpose,
                                                            false,
                                                            undefined,
                                                            undefined,
                                                            {}
                                                        );
                                                        setTablighTaskOptimistic({
                                                            noticeDateYmd: ymd,
                                                            purpose: purpose || 'تبليغ',
                                                        });
                                                        setDebtorDate('');
                                                        setNoticeKindGoal('');
                                                        setDateError('');
                                                    }}
                                                    disabled={!debtorDate}
                                                    className={`w-full rounded-xl border border-cyan-500/30 bg-cyan-950/35 py-3 text-[12px] font-black text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.10)] transition-all ${
                                                        debtorDate
                                                            ? 'hover:bg-cyan-900/45 hover:border-cyan-400/35'
                                                            : 'opacity-50 cursor-not-allowed'
                                                    }`}
                                                >
                                                    <span className="flex flex-row-reverse items-center justify-center gap-2">
                                                        <Bell size={18} className="text-cyan-200" />
                                                        تسجيل تبليغ عادي
                                                    </span>
                                                </button>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {hubMainTab === 'nashr' &&
                        (publicationNoticeFeature ? (
                        <motion.div
                            key="nashr"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            {publicationNoticeFeature.state ? (
                                <>
                                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/25 p-3 text-right space-y-1.5">
                                        <p className="text-cyan-100 text-xs font-bold">
                                            تبليغ بالنشر سارٍ — تاريخ النشر:{' '}
                                            <span className="font-mono tabular-nums">
                                                {publicationNoticeFeature.state.publicationDateYmd}
                                            </span>
                                        </p>
                                        <p className="text-slate-300 text-[11px]">
                                            الجريدة ١: {publicationNoticeFeature.state.newspaper1}
                                        </p>
                                        <p className="text-slate-300 text-[11px]">
                                            الجريدة ٢: {publicationNoticeFeature.state.newspaper2}
                                        </p>
                                        <p className="text-slate-400 text-[10px]">
                                            آخر يوم للمدة:{' '}
                                            <span className="font-mono text-slate-200">
                                                {publicationNoticeDeadlineYmd(
                                                    publicationNoticeFeature.state.publicationDateYmd
                                                )}
                                            </span>
                                        </p>
                                        {(() => {
                                            const dl = publicationNoticeDeadlineYmd(
                                                publicationNoticeFeature.state.publicationDateYmd
                                            );
                                            const passed = isAssignmentDeadlinePassed(dl);
                                            const rem = daysRemainingUntilDeadline(dl);
                                            return (
                                                <p className="text-emerald-200/90 text-[11px] font-semibold">
                                                    {passed
                                                        ? 'انتهت المدة التقويمية للتبليغ بالنشر.'
                                                        : `متبقٍ تقويمياً: ${rem} يوماً`}
                                                </p>
                                            );
                                        })()}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            publicationNoticeFeature.onDebtorAttended();
                                            setHubMainTab('nashr');
                                            setNashrFormError('');
                                        }}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={18} />
                                        حضور المدين
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            publicationNoticeFeature.onTerminate();
                                            setHubMainTab('nashr');
                                            setNashrFormError('');
                                        }}
                                        className="w-full border border-slate-500/50 text-slate-300 font-semibold py-2.5 rounded-xl text-sm"
                                    >
                                        إنهاء التبليغ بالنشر
                                    </button>
                                </>
                            ) : (
                                <>
                            <div>
                                <label className="block text-gray-300 text-sm font-semibold mb-2 text-right">
                                            تاريخ النشر في الجريدة
                                </label>
                                <input
                                    type="date"
                                            value={nashrDate}
                                            onChange={(e) => setNashrDate(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-violet-500/30 rounded-xl px-4 py-2.5 text-white text-right"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-semibold mb-2 text-right">
                                            اسم الجريدة الأولى
                                        </label>
                                        <input
                                            type="text"
                                            value={nashrPaper1}
                                            onChange={(e) => setNashrPaper1(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-violet-500/30 rounded-xl px-4 py-2.5 text-white text-right"
                                            placeholder=""
                                            dir="rtl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-semibold mb-2 text-right">
                                            اسم الجريدة الثانية
                                        </label>
                                        <input
                                            type="text"
                                            value={nashrPaper2}
                                            onChange={(e) => setNashrPaper2(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-violet-500/30 rounded-xl px-4 py-2.5 text-white text-right"
                                            placeholder=""
                                            dir="rtl"
                                        />
                            </div>
                                    {(nashrFormError || (hubMainTab === 'nashr' && dateError)) && (
                                        <p className="text-red-400 text-xs text-right">
                                            {nashrFormError || dateError}
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNashrFormError('');
                                            const d = String(nashrDate ?? '').trim();
                                            if (!d) {
                                                setNashrFormError('أدخل تاريخ النشر في الجريدة');
                                                return;
                                            }
                                            const vr = validateDate(d);
                                            if (!vr.ok) {
                                                setDateError(vr.error || 'تأكد من تاريخ النشر');
                                                setNashrFormError(vr.error || 'تأكد من تاريخ النشر');
                                                return;
                                            }
                                            setDateError('');
                                            const p1 = nashrPaper1.trim();
                                            const p2 = nashrPaper2.trim();
                                            if (!p1 || !p2) {
                                                setNashrFormError('أدخل اسم الجريدتين');
                                                return;
                                            }
                                            if (!memoArchivedResolved && notificationCount <= 1) {
                                                // تسجيل مرساة مذكرة الإخبار عند اعتماد مسار النشر لأول مرة
                                                onDebtorNotification(
                                                    d,
                                                    'مذكرة الإخبار بالتنفيذ بالنشر',
                                                    false,
                                                    undefined,
                                                    undefined,
                                                    {}
                                                );
                                                setMemoDateOptimistic(d);
                                            }
                                            publicationNoticeFeature.onRegister({
                                                publicationDateYmd: d,
                                                newspaper1: p1,
                                                newspaper2: p2,
                                            });
                                            setNashrDate('');
                                            setNashrPaper1('');
                                            setNashrPaper2('');
                                            setDateError('');
                                        }}
                                        className="w-full bg-gradient-to-r from-violet-700 to-violet-600 hover:from-violet-600 hover:to-violet-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                                    >
                                        <Newspaper size={18} />
                                        تسجيل التبليغ بالنشر
                                    </button>
                                </>
                            )}
                        </motion.div>
                        ) : (
                        <motion.div
                            key="nashr"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-right" dir="rtl">
                                <p className="text-white text-sm font-bold">التبليغ بالنشر</p>
                                <p className="mt-1 text-[11px] text-slate-400">غير متاح لهذه الإضبارة حالياً.</p>
                            </div>
                        </motion.div>
                        ))}

                    {hubMainTab === 'taklif' &&
                        (employeeAssignmentFeature && employeeAssignmentFeature.enabled ? (
                        <motion.div
                            key="taklif"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            {empPhase === 'none' && (
                                <>
                            <div>
                                <label className="block text-gray-300 text-sm font-semibold mb-2 text-right">
                                            الغاية من التكليف
                                </label>
                                <textarea
                                            value={taklifPurpose}
                                            onChange={(e) => setTaklifPurpose(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-amber-500/25 rounded-xl px-4 py-2.5 text-white text-right resize-none"
                                    rows={3}
                                />
                            </div>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-semibold mb-2 text-right">
                                            تاريخ التبليغ بالتكليف
                                        </label>
                                        <input
                                            type="date"
                                            value={taklifDate}
                                            onChange={(e) => setTaklifDate(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-indigo-500/30 rounded-xl px-4 py-2.5 text-white text-right"
                                        />
                                    </div>
                                    <div className="rounded-xl border border-slate-600/40 bg-slate-900/40 p-3">
                                        <p className="text-slate-300 text-xs font-semibold mb-2 text-right">
                                            مدة التكليف (بالأيام)
                                        </p>
                                        <div className="flex flex-row-reverse items-center justify-center gap-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTaklifDurationDays((d) => Math.min(30, Math.max(1, d + 1)))
                                                }
                                                className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold text-lg hover:bg-slate-600"
                                            >
                                                +
                                            </button>
                                            <span className="min-w-[2.5rem] text-center text-xl font-black tabular-nums text-white">
                                                {taklifDurationDays}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTaklifDurationDays((d) => Math.max(1, d - 1))
                                                }
                                                className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold text-lg hover:bg-slate-600"
                                            >
                                                −
                                            </button>
                                        </div>
                                    </div>
                                    {(() => {
                                        const ymd = String(taklifDate || '').trim();
                                        if (!ymd) return null;
                                        if (!validateDate(ymd).ok) return null;
                                        const expiry = computeTaklifDeadlineYmd(ymd, taklifDurationDays);
                                        return (
                                            <p className="text-sky-200/90 text-[11px] font-semibold text-right">
                                                المهلة تنتهي بتاريخ: <span className="font-mono">{expiry}</span>
                                            </p>
                                        );
                                    })()}
                                    {(taklifFormError || dateError) && hubMainTab === 'taklif' ? (
                                        <p className="text-red-400 text-xs text-right">
                                            {taklifFormError || dateError}
                                        </p>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={handleTaklifConfirm}
                                        className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold py-3 rounded-xl"
                                    >
                                        تأكيد التكليف بالحضور
                                    </button>
                                </>
                            )}

                            {empPhase === 'active' && (
                                <>
                                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/25 p-3 text-right space-y-1">
                                        <p className="text-cyan-100 text-xs font-bold">
                                            تكليف سارٍ
                                            {empEffectiveDeadlineYmd ? (
                                                <>
                                                    {' '}
                                                    — حتى{' '}
                                                    <span className="font-mono tabular-nums">
                                                        {empEffectiveDeadlineYmd}
                                                    </span>
                                                </>
                                            ) : null}
                                        </p>
                                        {empEffectiveDeadlineYmd ? (
                                            !isAssignmentDeadlinePassed(empEffectiveDeadlineYmd) ? (
                                                <p className="text-cyan-200/80 text-[11px]">
                                                    متبقٍ تقويمياً:{' '}
                                                    <span className="font-mono font-bold">
                                                        {daysRemainingUntilDeadline(empEffectiveDeadlineYmd)}
                                                    </span>{' '}
                                                    يوماً
                                                </p>
                                            ) : null
                                        ) : null}
                                    </div>
                                    {empEffectiveDeadlineYmd &&
                                    !isAssignmentDeadlinePassed(empEffectiveDeadlineYmd) ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                employeeAssignmentFeature.onAttend();
                                                onClose();
                                            }}
                                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={18} />
                                            تم حضور المكلف
                                        </button>
                                    ) : empEffectiveDeadlineYmd ? (
                                        <button
                                            type="button"
                                            onClick={() => employeeAssignmentFeature.onDeclareAbsent()}
                                            className="w-full bg-gradient-to-r from-rose-700 to-rose-600 text-white font-bold py-3 rounded-xl"
                                        >
                                            انتهاء مدة التكليف
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            employeeAssignmentFeature.onTerminate();
                                            onClose();
                                        }}
                                        className="w-full border border-slate-500/50 text-slate-300 font-semibold py-2.5 rounded-xl text-sm"
                                    >
                                        إنهاء التكليف
                                    </button>
                                </>
                            )}

                            {empAssign &&
                                (empPhase === 'absent_declared' ||
                                    empPhase === 'investigation_pending' ||
                                    empPhase === 'warrant_ui') && (
                                    <>
                                        <EmployeeAssignmentCoerciveFollowupBlock
                                            assignment={empAssign}
                                            onRequestInvestigation={() =>
                                                employeeAssignmentFeature.onRequestInvestigation()
                                            }
                                            onRegisterArrestOrder={() =>
                                                employeeAssignmentFeature.onRegisterArrestOrder()
                                            }
                                            onRequestForcedBring={() =>
                                                employeeAssignmentFeature.onRequestForcedBring()
                                            }
                                            forcedBringPending={
                                                employeeAssignmentFeature.forcedBringPending ?? false
                                            }
                                            forcedBringApprovedAwaitingOutcome={
                                                employeeAssignmentFeature.forcedBringApprovedAwaitingOutcome ??
                                                false
                                            }
                                            forcedBringRejected={
                                                employeeAssignmentFeature.forcedBringRejected ?? false
                                            }
                                            onWarrantDebtorBrought={() =>
                                                employeeAssignmentFeature.onWarrantDebtorBrought()
                                            }
                                            onWarrantTerminate={() =>
                                                employeeAssignmentFeature.onWarrantTerminate()
                                            }
                                            onTerminateAssignment={() =>
                                                employeeAssignmentFeature.onTerminate()
                                            }
                                        />
                                        {empPhase === 'investigation_pending' ? (
                            <button
                                                type="button"
                                                onClick={() => {
                                                    employeeAssignmentFeature.onTerminate();
                                                    onClose();
                                                }}
                                                className="w-full border border-slate-500/50 text-slate-300 font-semibold py-2.5 rounded-xl text-sm"
                                            >
                                                إنهاء التكليف
                            </button>
                                        ) : null}
                                    </>
                                )}
                        </motion.div>
                        ) : (
                        <motion.div
                            key="taklif"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-right" dir="rtl">
                                <p className="text-white text-sm font-bold">التكليف بالحضور</p>
                                <p className="mt-1 text-[11px] text-slate-400">غير متاح لهذه الإضبارة حالياً.</p>
                            </div>
                        </motion.div>
                        ))}

                    {hubMainTab === 'guarantor' && guarantorNotificationFeature?.enabled && (
                        <motion.div
                            key="guarantor"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <div
                                className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 space-y-3"
                                dir="rtl"
                            >
                                <p className="text-amber-200 font-bold text-sm">تبليغ الكفيل</p>
                                <div>
                                    <label className="mb-2 block text-right text-xs font-semibold text-gray-300">
                                        تاريخ التبليغ
                                    </label>
                                    <input
                                        type="date"
                                        value={guarantorNoticeDate}
                                        onChange={(e) => setGuarantorNoticeDate(e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-right text-sm text-white"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-right text-xs font-semibold text-gray-300">
                                        سبب التبليغ
                                    </label>
                                    <input
                                        type="text"
                                        value={guarantorNoticeReason}
                                        onChange={(e) => setGuarantorNoticeReason(e.target.value)}
                                        placeholder="أدخل سبب التبليغ"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-right text-sm text-white"
                                    />
                                </div>

                                {guarantorNotificationFeature.state &&
                                !guarantorNotificationFeature.state.endedAt ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => guarantorNotificationFeature.onAttend()}
                                            className="w-full rounded-xl border border-emerald-500/25 bg-emerald-500/10 py-2.5 text-[12px] font-bold text-emerald-50 hover:bg-emerald-500/15"
                                        >
                                            حضور الكفيل / إنهاء التبليغ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => guarantorNotificationFeature.onTerminate()}
                                            className="w-full rounded-xl border border-rose-500/25 bg-rose-500/10 py-2.5 text-[12px] font-bold text-rose-50 hover:bg-rose-500/15"
                                        >
                                            إنهاء التبليغ
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const d = String(guarantorNoticeDate || '').trim();
                                            const r = String(guarantorNoticeReason || '').trim();
                                            if (!d) {
                                                setDateError('أدخل تاريخ التبليغ');
                                                return;
                                            }
                                            if (!r) {
                                                setDateError('أدخل سبب التبليغ');
                                                return;
                                            }
                                            setDateError('');
                                            guarantorNotificationFeature.onRegister({
                                                noticeDateYmd: d,
                                                reason: r,
                                            });
                                        }}
                                        className="w-full rounded-xl border border-amber-500/25 bg-amber-500/10 py-2.5 text-[12px] font-bold text-amber-50 hover:bg-amber-500/15"
                                    >
                                        تسجيل تبليغ الكفيل
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
                <ConfirmAttendanceModal
                    isOpen={confirmAttendanceWithoutNoticeOpen}
                    onConfirm={() => {
                        setConfirmAttendanceWithoutNoticeOpen(false);
                        markExecutionSummonsArchived('attended');
                    }}
                    onCancel={() => setConfirmAttendanceWithoutNoticeOpen(false)}
                />
            </motion.div>
        </div>
    );
};
