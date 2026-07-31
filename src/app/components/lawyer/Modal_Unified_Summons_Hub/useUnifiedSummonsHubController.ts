import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
    EmployeeSummonsAssignmentState,
    PublicationNoticeDebtorState,
} from '@/app/types/execution';
import {
    computeTaklifDeadlineYmd,
} from '@/app/utils/employeeSummonsAssignment';


import { parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import { getExecutionSummons7DayWindow } from '@/app/utils/executionSummonsWorkflow';
import {
    buildSummonsHubActiveSnapshot,
    countActiveSummonsPaths,
    getSummonsKindLockReason,
    resolvePrimaryActiveKind,
    type SummonsHubKind,
} from './summonsHubActiveLocks';
import { isPublicationNoticeActive } from '@/app/utils/publicationNoticeDebtor';
import type { UnifiedSummonsHubProps } from './unifiedSummonsHubProps';

function todayLocalYmd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export type UnifiedSummonsHubModel = NonNullable<ReturnType<typeof useUnifiedSummonsHubController>>;

export function useUnifiedSummonsHubController(props: UnifiedSummonsHubProps) {
    const {
        isOpen,
        onClose,
        initialMainTab,
        onDebtorNotification,
        notificationCount,
        subsequentNoticeUnlocked: _subsequentNoticeUnlocked,
        noticeKindGoalStrictBinding: _noticeKindGoalStrictBinding,
        canForceSummon: _canForceSummon,
        forceSummonLockReason: _forceSummonLockReason,
        isGovernmentEmployee: _isGovernmentEmployee,
        hasSalaryCoerciveStep: _hasSalaryCoerciveStep,
        onRegisterDebtorVoluntaryAttendance,
        onOpenCoerciveModal: _onOpenCoerciveModal,
        summonsProfile: _summonsProfile,
        summoningRound: _summoningRound,
        earnerForcedActionUnlocked: _earnerForcedActionUnlocked,
        forcedAttendanceIssued: _forcedAttendanceIssued,
        onEarnerIssueForcedMemo: _onEarnerIssueForcedMemo,
        summonsEvictionSimplifiedUi,
        showEvictionVoluntaryPeriodEndButton: _showEvictionVoluntaryPeriodEndButton,
        onEvictionVoluntaryPeriodEnd,
        evictionDebtorExecutionStrip,
        debtorIsGovernmentEmployee: _debtorIsGovernmentEmployee,
        evictionSummonsPipelineCoerciveLocked: _evictionSummonsPipelineCoerciveLocked,
        evictionEarnerCollectionBranchEligible: _evictionEarnerCollectionBranchEligible,
        showInitialNoticeLawyerFeesMemoOption,
        debtorEvaded: _debtorEvaded,
        onEarnerMarkDebtorEvading: _onEarnerMarkDebtorEvading,
        showNoticeVoluntaryPeriodEndButton: _showNoticeVoluntaryPeriodEndButton,
        onNoticeVoluntaryPeriodEnd,
        tablighTask,
        onTerminateTablighTask,
        guarantorNotificationFeature,
        employeeAssignmentFeature,
        publicationNoticeFeature,
        suppressPublicationNotice,
        executionId,
        executionSummonsNoticeDateYmd,
        executionSummonsArchived,
    } = props;

    const [debtorDate, setDebtorDate] = useState<string>('');
    const [dateError, setDateError] = useState<string>('');
    const [noticeKindGoal, setNoticeKindGoal] = useState<string>('');
    /** أول إخبار بالتنفيذ — كاسب: تفعيل = الأتعاب مشمولة في المذكرة الأصلية؛ بدون تفعيل = مسار اعتيادي */
    const [initialNoticeLawyerFeesIncluded, setInitialNoticeLawyerFeesIncluded] = useState(false);
    const [memoDateOptimistic, setMemoDateOptimistic] = useState<string>('');
    const [memoError, setMemoError] = useState<string>('');
    const [memoArchivedOptimistic, setMemoArchivedOptimistic] = useState(false);
    const [memoDateEditing, setMemoDateEditing] = useState(false);
    const [executionMemoRegisterMode, setExecutionMemoRegisterMode] = useState(false);
    const [confirmAttendanceWithoutNoticeOpen, setConfirmAttendanceWithoutNoticeOpen] = useState(false);

    const [hubMainTab, setHubMainTab] = useState<SummonsHubKind>('tabligh');
    const [kindLockError, setKindLockError] = useState('');
    /** تفاؤل محلي حتى تصل مزامنة الـ overlay — يمنع «الواجهة العالقة» بعد إنهاء/حضور */
    const [empAssignOptimistic, setEmpAssignOptimistic] = useState<
        EmployeeSummonsAssignmentState | null | undefined
    >(undefined);
    const [pubNoticeOptimistic, setPubNoticeOptimistic] = useState<
        PublicationNoticeDebtorState | null | undefined
    >(undefined);
    const [taklifPurpose, setTaklifPurpose] = useState('');
    const [taklifDate, setTaklifDate] = useState('');
    const [taklifDurationDays, setTaklifDurationDays] = useState(1);
    const [taklifFormError, setTaklifFormError] = useState('');
    const [tablighTaskOptimistic, setTablighTaskOptimistic] = useState<
        { noticeDateYmd: string; purpose: string } | null | undefined
    >(undefined);
    const [nashrDate, setNashrDate] = useState('');
    const [nashrPaper1, setNashrPaper1] = useState('');
    const [nashrPaper2, setNashrPaper2] = useState('');
    const [nashrFormError, setNashrFormError] = useState('');
    const [guarantorNoticeDate, setGuarantorNoticeDate] = useState('');
    const [guarantorNoticeReason, setGuarantorNoticeReason] = useState('');
    const [guarantorFormError, setGuarantorFormError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setInitialNoticeLawyerFeesIncluded(false);
            setExecutionMemoRegisterMode(false);
            setMemoDateOptimistic('');
            setMemoError('');
            setMemoArchivedOptimistic(false);
            setMemoDateEditing(false);
            setHubMainTab('tabligh');
            setKindLockError('');
            setEmpAssignOptimistic(undefined);
            setPubNoticeOptimistic(undefined);
            setTaklifPurpose('');
            setTaklifDate('');
            setTaklifDurationDays(1);
            setTaklifFormError('');
            setTablighTaskOptimistic(undefined);
            setNashrDate('');
            setNashrPaper1('');
            setNashrPaper2('');
            setNashrFormError('');
            setGuarantorNoticeDate('');
            setGuarantorNoticeReason('');
        }
    }, [isOpen]);

    useEffect(() => {
        setTablighTaskOptimistic(undefined);
    }, [executionId]);

    useEffect(() => {
        setMemoDateOptimistic('');
        setMemoError('');
        setMemoArchivedOptimistic(false);
        setMemoDateEditing(false);
        setExecutionMemoRegisterMode(false);
    }, [executionId]);

    /**
     * إعادة ضبط التفاؤل عند تغيّر «قيمة» الحالة القادمة من الأعلى — المقارنة بالهوية
     * كانت تفشل لأن scope يبني كائن الحالة من جديد في كل render فيُمسح التفاؤل فوراً.
     */
    const empStateFingerprint = JSON.stringify(employeeAssignmentFeature?.state ?? null);
    const pubStateFingerprint = JSON.stringify(publicationNoticeFeature?.state ?? null);
    const tablighStateFingerprint = JSON.stringify(tablighTask ?? null);

    useEffect(() => {
        setEmpAssignOptimistic(undefined);
         
    }, [empStateFingerprint]);

    useEffect(() => {
        setPubNoticeOptimistic(undefined);
         
    }, [pubStateFingerprint]);

    useEffect(() => {
        setTablighTaskOptimistic(undefined);
         
    }, [tablighStateFingerprint]);

    useEffect(() => {
        if (isOpen && initialMainTab) {
            setHubMainTab(initialMainTab);
        }
    }, [isOpen, initialMainTab]);

    const empAssignResolved =
        empAssignOptimistic !== undefined
            ? empAssignOptimistic
            : employeeAssignmentFeature?.state ?? null;

    const publicationStateResolved =
        pubNoticeOptimistic !== undefined
            ? pubNoticeOptimistic
            : publicationNoticeFeature?.state && isPublicationNoticeActive(publicationNoticeFeature.state)
              ? publicationNoticeFeature.state
              : null;

    const resolvedTablighTaskEarly =
        tablighTaskOptimistic !== undefined ? tablighTaskOptimistic : tablighTask;

    const activeSnapshot = useMemo(
        () =>
            buildSummonsHubActiveSnapshot({
                tablighTask: resolvedTablighTaskEarly,
                employeeAssignment: empAssignResolved,
                publicationNotice: publicationStateResolved,
                guarantor: guarantorNotificationFeature?.state ?? null,
            }),
        [
            resolvedTablighTaskEarly,
            empAssignResolved,
            publicationStateResolved,
            guarantorNotificationFeature?.state,
        ],
    );

    const memoArchivedResolved = Boolean(executionSummonsArchived || memoArchivedOptimistic);

    const showTaklifOptionInHub = Boolean(memoArchivedResolved);
    const showPublicationTab = Boolean(
        !suppressPublicationNotice &&
            (memoArchivedResolved || (!memoArchivedResolved && notificationCount <= 1))
    );

    const isGuarantorSummonsContext = Boolean(
        guarantorNotificationFeature?.enabled &&
            (guarantorNotificationFeature.contextOnly || initialMainTab === 'guarantor')
    );

    const activePathCount = countActiveSummonsPaths(activeSnapshot);

    const hubTabOptions = useMemo(() => {
        const opts: { value: SummonsHubKind; label: string }[] = [];
        if (isGuarantorSummonsContext) {
            opts.push({ value: 'guarantor', label: 'تبليغ / تكليف الكفيل بالحضور' });
            return opts;
        }
        opts.push({
            value: 'status',
            label: activePathCount > 0 ? `الوضع الحالي (${activePathCount})` : 'الوضع الحالي',
        });
        opts.push({ value: 'tabligh', label: memoArchivedResolved ? 'التبليغ' : 'التبليغ / الإخبار' });
        if (showTaklifOptionInHub) opts.push({ value: 'taklif', label: 'التكليف بالحضور' });
        if (showPublicationTab) opts.push({ value: 'nashr', label: 'التبليغ بالنشر' });
        return opts;
    }, [
        isGuarantorSummonsContext,
        memoArchivedResolved,
        showTaklifOptionInHub,
        showPublicationTab,
        activePathCount,
    ]);

    useEffect(() => {
        if (!isOpen) return;
        if (!hubTabOptions.some((o) => o.value === hubMainTab)) {
            setHubMainTab(hubTabOptions[0]?.value ?? 'tabligh');
        }
    }, [isOpen, hubMainTab, hubTabOptions]);

    useEffect(() => {
        if (!isOpen || initialMainTab) return;
        if (activePathCount > 0 && hubMainTab !== 'status') {
            const primary = resolvePrimaryActiveKind(activeSnapshot);
            if (primary && hubTabOptions.some((o) => o.value === primary)) {
                // عند وجود مسار سارٍ نفتح تبويب الإدارة مباشرة وليس «الوضع» فقط
                setHubMainTab(primary);
            } else if (hubTabOptions.some((o) => o.value === 'status')) {
                setHubMainTab('status');
            }
        }
        // مرة عند الفتح فقط — لا نطارد تغيّر العدد أثناء الجلسة
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const trySelectHubKind = useCallback(
        (next: SummonsHubKind) => {
            setKindLockError('');
            if (next === 'status' || next === 'guarantor') {
                setHubMainTab(next);
                return;
            }
            // السماح بالانتقال إلى المسار الساري نفسه لإدارته/إنهائه
            if (next === 'tabligh' && activeSnapshot.tabligh) {
                setHubMainTab('tabligh');
                return;
            }
            if (next === 'taklif' && activeSnapshot.taklif) {
                setHubMainTab('taklif');
                return;
            }
            if (next === 'nashr' && activeSnapshot.nashr) {
                setHubMainTab('nashr');
                return;
            }
            const lock = getSummonsKindLockReason(next, activeSnapshot);
            if (lock) {
                setKindLockError(lock);
                setHubMainTab('status');
                return;
            }
            setHubMainTab(next);
        },
        [activeSnapshot],
    );

    const hasActivePublicationResolved = Boolean(publicationStateResolved);
    useEffect(() => {
        if (!hasActivePublicationResolved) {
            setNashrDate('');
            setNashrPaper1('');
            setNashrPaper2('');
        }
    }, [hasActivePublicationResolved]);

    useEffect(() => {
        if (!isOpen) return;
        const st = guarantorNotificationFeature?.state;
        if (!st) {
            setGuarantorNoticeDate('');
            setGuarantorNoticeReason('');
            setGuarantorFormError('');
            return;
        }
        setGuarantorNoticeDate(String(st.noticeDateYmd || '').trim());
        setGuarantorNoticeReason(String(st.reason || '').trim());
    }, [guarantorNotificationFeature?.state, isOpen]);

    const empAssign = empAssignResolved;
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
    const summonsTodayYmdMax = todayLocalYmd();
    /** شمول الأتعاب — مرة واحدة قبل تسجيل تاريخ أول مذكرة إخبار */
    const showLawyerFeesIncludeCheckbox =
        summonsEvictionSimplifiedUi && showInitialNoticeLawyerFeesMemoOption && !memoNoticeDateYmd;

    const resolvedTablighTask =
        tablighTaskOptimistic !== undefined ? tablighTaskOptimistic : tablighTask;

    const validateDate = (inputDate: string): { ok: boolean; error?: string } => {
        const trimmed = String(inputDate || '').trim();
        if (!trimmed) return { ok: false, error: 'أدخل تاريخ التبليغ' };
        const selectedDate = parseLocalNotificationDate(trimmed);
        if (Number.isNaN(selectedDate.getTime())) {
            return { ok: false, error: 'تاريخ التبليغ غير صالح' };
        }
        selectedDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate > today) return { ok: false, error: 'لا يمكن إدخال تاريخ تبليغ مستقبلي' };
        return { ok: true };
    };

    const submitGuarantorNotice = useCallback(() => {
        const d = String(guarantorNoticeDate || '').trim();
        const r = String(guarantorNoticeReason || '').trim();
        const dateCheck = validateDate(d);
        if (!dateCheck.ok) {
            setGuarantorFormError(dateCheck.error || 'أدخل تاريخ التبليغ');
            return;
        }
        if (!r) {
            setGuarantorFormError('أدخل سبب التبليغ / التكليف بالحضور');
            return;
        }
        setGuarantorFormError('');
        guarantorNotificationFeature?.onRegister({ noticeDateYmd: d, reason: r });
    }, [guarantorNoticeDate, guarantorNoticeReason, guarantorNotificationFeature]);

    const validateMemoDate = useCallback(
        (inputDate: string): boolean => {
            if (!inputDate) return false;
            const selectedDate = parseLocalNotificationDate(inputDate);
            if (Number.isNaN(selectedDate.getTime())) {
                setMemoError('تاريخ التبليغ غير صالح');
                return false;
            }
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

    const submitExecutionSummonsDate = useCallback(
        (nextYmd: string) => {
            const ymd = String(nextYmd || '').trim();
            if (!ymd) return;
            if (!validateMemoDate(ymd)) return;
            const initialFeesFlag = showLawyerFeesIncludeCheckbox
                ? initialNoticeLawyerFeesIncluded
                : undefined;
            const forceMemo = executionMemoRegisterMode && notificationCount === 1;
            onDebtorNotification(ymd, '', false, undefined, initialFeesFlag, { forceExecutionMemo: forceMemo });
            setMemoDateOptimistic(ymd);
            setMemoArchivedOptimistic(false);
            setMemoDateEditing(false);
        },
        [
            initialNoticeLawyerFeesIncluded,
            notificationCount,
            onDebtorNotification,
            showLawyerFeesIncludeCheckbox,
            validateMemoDate,
            executionMemoRegisterMode,
        ]
    );

    const markExecutionSummonsArchived = useCallback(
        (kind: 'attended' | 'expired') => {
            if (kind === 'attended') {
                const registerAttendance =
                    onRegisterDebtorVoluntaryAttendance ??
                    evictionDebtorExecutionStrip?.onRegisterAttendance;
                if (!registerAttendance) {
                    setMemoError('تعذر تسجيل حضور المدين — أعد فتح مركز التبليغ.');
                    return;
                }
                const registered = registerAttendance();
                if (registered === false) {
                    setMemoError('تعذر تسجيل حضور المدين. حاول مرة أخرى.');
                    return;
                }
                setMemoArchivedOptimistic(true);
                onClose();
                return;
            }
            setMemoArchivedOptimistic(true);
            if (summonsEvictionSimplifiedUi) {
                onEvictionVoluntaryPeriodEnd?.();
            } else {
                onNoticeVoluntaryPeriodEnd?.();
            }
        },
        [
            evictionDebtorExecutionStrip?.onRegisterAttendance,
            onClose,
            onEvictionVoluntaryPeriodEnd,
            onNoticeVoluntaryPeriodEnd,
            onRegisterDebtorVoluntaryAttendance,
            summonsEvictionSimplifiedUi,
        ]
    );

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
        const lock = getSummonsKindLockReason('taklif', {
            ...activeSnapshot,
            taklif: null,
        });
        if (lock) {
            setTaklifFormError(lock);
            setKindLockError(lock);
            setHubMainTab('status');
            return;
        }
        employeeAssignmentFeature.onConfirm({
            purpose: taklifPurpose.trim(),
            notifyDate: taklifDateTrim,
            durationDays: dur,
        });
        setEmpAssignOptimistic({
            phase: 'active',
            assignedDebtorKey: '',
            purpose: taklifPurpose.trim(),
            notifyDate: taklifDateTrim,
            durationDays: dur,
            deadlineDate: computeTaklifDeadlineYmd(taklifDateTrim, dur),
            confirmedAt: new Date().toISOString(),
            investigationDecisionId: null,
            investigationApproved: false,
            arrestOrderRecorded: false,
        });
        setTaklifPurpose('');
        setTaklifDate('');
        setTaklifDurationDays(1);
        setTaklifFormError('');
        setDateError('');
        // نبقى في تبويب التكليف — تفاؤل محلي يعرض حاوية «تكليف سارٍ» فوراً
    };


    if (!isOpen) return null;

    return {
        debtorDate,
        setDebtorDate,
        dateError,
        setDateError,
        noticeKindGoal,
        setNoticeKindGoal,
        initialNoticeLawyerFeesIncluded,
        setInitialNoticeLawyerFeesIncluded,
        memoDateOptimistic,
        setMemoDateOptimistic,
        memoError,
        setMemoError,
        memoArchivedOptimistic,
        setMemoArchivedOptimistic,
        memoDateEditing,
        setMemoDateEditing,
        executionMemoRegisterMode,
        setExecutionMemoRegisterMode,
        confirmAttendanceWithoutNoticeOpen,
        setConfirmAttendanceWithoutNoticeOpen,
        hubMainTab,
        setHubMainTab,
        kindLockError,
        setKindLockError,
        empAssignOptimistic,
        setEmpAssignOptimistic,
        pubNoticeOptimistic,
        setPubNoticeOptimistic,
        taklifPurpose,
        setTaklifPurpose,
        taklifDate,
        setTaklifDate,
        taklifDurationDays,
        setTaklifDurationDays,
        taklifFormError,
        setTaklifFormError,
        tablighTaskOptimistic,
        setTablighTaskOptimistic,
        nashrDate,
        setNashrDate,
        nashrPaper1,
        setNashrPaper1,
        nashrPaper2,
        setNashrPaper2,
        nashrFormError,
        setNashrFormError,
        guarantorNoticeDate,
        setGuarantorNoticeDate,
        guarantorNoticeReason,
        setGuarantorNoticeReason,
        guarantorFormError,
        setGuarantorFormError,
        empStateFingerprint,
        pubStateFingerprint,
        tablighStateFingerprint,
        empAssignResolved,
        publicationStateResolved,
        resolvedTablighTaskEarly,
        activeSnapshot,
        memoArchivedResolved,
        showTaklifOptionInHub,
        showPublicationTab,
        isGuarantorSummonsContext,
        activePathCount,
        hubTabOptions,
        trySelectHubKind,
        hasActivePublicationResolved,
        empAssign,
        empEffectiveDeadlineYmd,
        empPhase,
        memoNoticeDateYmd,
        memoWindow,
        summonsTodayYmdMax,
        showLawyerFeesIncludeCheckbox,
        resolvedTablighTask,
        validateDate,
        submitGuarantorNotice,
        validateMemoDate,
        submitExecutionSummonsDate,
        markExecutionSummonsArchived,
        handleTaklifConfirm,
        isOpen,
        onClose,
        onDebtorNotification,
        notificationCount,
        onRegisterDebtorVoluntaryAttendance,
        evictionDebtorExecutionStrip,
        onTerminateTablighTask,
        guarantorNotificationFeature,
        employeeAssignmentFeature,
        publicationNoticeFeature,
        suppressPublicationNotice,
    };
}
