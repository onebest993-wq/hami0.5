import type { Dispatch, SetStateAction } from 'react';
import type {
    EmployeeSummonsAssignmentState,
    EvictionSubsequentSummonsMeta,
} from '@/app/types/execution';
import { parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import { validateSummonsDate } from './summonsHubHelpers';
import type { UnifiedSummonsHubProps } from './unifiedSummonsHubTypes';

type SetStr = Dispatch<SetStateAction<string>>;
type SetBool = Dispatch<SetStateAction<boolean>>;
type SetNum = Dispatch<SetStateAction<number>>;

export function validateMemoDateInput(
    inputDate: string,
    setMemoError: SetStr,
): boolean {
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
}

export type SubmitGuarantorNoticeArgs = {
    guarantorNoticeDate: string;
    guarantorNoticeReason: string;
    guarantorNotificationFeature: UnifiedSummonsHubProps['guarantorNotificationFeature'];
    setGuarantorFormError: SetStr;
};

export function submitGuarantorNotice(args: SubmitGuarantorNoticeArgs): void {
    const { guarantorNoticeDate, guarantorNoticeReason, guarantorNotificationFeature, setGuarantorFormError } =
        args;
    const d = String(guarantorNoticeDate || '').trim();
    const r = String(guarantorNoticeReason || '').trim();
    const dateCheck = validateSummonsDate(d);
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
}

export type SubmitExecutionSummonsDateArgs = {
    nextYmd: string;
    showLawyerFeesIncludeCheckbox: boolean;
    initialNoticeLawyerFeesIncluded: boolean;
    executionMemoRegisterMode: boolean;
    notificationCount: number;
    onDebtorNotification: UnifiedSummonsHubProps['onDebtorNotification'];
    setMemoDateOptimistic: SetStr;
    setMemoArchivedOptimistic: SetBool;
    setMemoDateEditing: SetBool;
    setMemoError: SetStr;
};

export function submitExecutionSummonsDate(args: SubmitExecutionSummonsDateArgs): void {
    const {
        nextYmd,
        showLawyerFeesIncludeCheckbox,
        initialNoticeLawyerFeesIncluded,
        executionMemoRegisterMode,
        notificationCount,
        onDebtorNotification,
        setMemoDateOptimistic,
        setMemoArchivedOptimistic,
        setMemoDateEditing,
        setMemoError,
    } = args;
    const ymd = String(nextYmd || '').trim();
    if (!ymd) return;
    if (!validateMemoDateInput(ymd, setMemoError)) return;
    const initialFeesFlag = showLawyerFeesIncludeCheckbox
        ? initialNoticeLawyerFeesIncluded
        : undefined;
    const forceMemo = executionMemoRegisterMode && notificationCount === 1;
    onDebtorNotification(ymd, '', false, undefined, initialFeesFlag, { forceExecutionMemo: forceMemo });
    setMemoDateOptimistic(ymd);
    setMemoArchivedOptimistic(false);
    setMemoDateEditing(false);
}

export type MarkExecutionSummonsArchivedArgs = {
    kind: 'attended' | 'expired';
    onRegisterDebtorVoluntaryAttendance: UnifiedSummonsHubProps['onRegisterDebtorVoluntaryAttendance'];
    evictionDebtorExecutionStrip: UnifiedSummonsHubProps['evictionDebtorExecutionStrip'];
    summonsEvictionSimplifiedUi: boolean;
    onEvictionVoluntaryPeriodEnd: UnifiedSummonsHubProps['onEvictionVoluntaryPeriodEnd'];
    onNoticeVoluntaryPeriodEnd: UnifiedSummonsHubProps['onNoticeVoluntaryPeriodEnd'];
    onClose: () => void;
    setMemoError: SetStr;
    setMemoArchivedOptimistic: SetBool;
};

export function markExecutionSummonsArchived(args: MarkExecutionSummonsArchivedArgs): void {
    const {
        kind,
        onRegisterDebtorVoluntaryAttendance,
        evictionDebtorExecutionStrip,
        summonsEvictionSimplifiedUi,
        onEvictionVoluntaryPeriodEnd,
        onNoticeVoluntaryPeriodEnd,
        onClose,
        setMemoError,
        setMemoArchivedOptimistic,
    } = args;
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
}

export type HandleDebtorSubmitArgs = {
    evictionEarnerCollectionBranchEligible: boolean;
    showSubsequentNoticeForm: boolean;
    summonsEvictionSimplifiedUi: boolean;
    secondNoticeForCollection: boolean;
    evictionSecondBranch: 'ordinary' | 'coercive' | '';
    debtorDate: string;
    noticeKindGoal: string;
    isHolidayExtension: boolean;
    executionMemoRegisterMode: boolean;
    notificationCount: number;
    showLawyerFeesIncludeCheckbox: boolean;
    initialNoticeLawyerFeesIncluded: boolean;
    onDebtorNotification: UnifiedSummonsHubProps['onDebtorNotification'];
    onClose: () => void;
    setDateError: SetStr;
    setDebtorDate: SetStr;
    setNoticeKindGoal: SetStr;
    setIsHolidayExtension: SetBool;
    setExecutionMemoRegisterMode: SetBool;
};

export function handleDebtorSubmit(args: HandleDebtorSubmitArgs): void {
    const {
        evictionEarnerCollectionBranchEligible,
        showSubsequentNoticeForm,
        summonsEvictionSimplifiedUi,
        secondNoticeForCollection,
        evictionSecondBranch,
        debtorDate,
        noticeKindGoal,
        isHolidayExtension,
        executionMemoRegisterMode,
        notificationCount,
        showLawyerFeesIncludeCheckbox,
        initialNoticeLawyerFeesIncluded,
        onDebtorNotification,
        onClose,
        setDateError,
        setDebtorDate,
        setNoticeKindGoal,
        setIsHolidayExtension,
        setExecutionMemoRegisterMode,
    } = args;
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
    const vr = validateSummonsDate(noticeDateTrim);
    if (!vr.ok) {
        setDateError(vr.error || 'تأكد من تاريخ التبليغ');
        return;
    }
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
    const initialFeesFlag = showLawyerFeesIncludeCheckbox
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

export type HandleTaklifConfirmArgs = {
    employeeAssignmentFeature: UnifiedSummonsHubProps['employeeAssignmentFeature'];
    taklifPurpose: string;
    taklifDate: string;
    taklifDurationDays: number;
    setTaklifFormError: SetStr;
    setDateError: SetStr;
    setTaklifPurpose: SetStr;
    setTaklifDate: SetStr;
    setTaklifDurationDays: SetNum;
    setHubMainTab: Dispatch<SetStateAction<'tabligh' | 'taklif' | 'nashr' | 'guarantor'>>;
};

export function handleTaklifConfirm(args: HandleTaklifConfirmArgs): void {
    const {
        employeeAssignmentFeature,
        taklifPurpose,
        taklifDate,
        taklifDurationDays,
        setTaklifFormError,
        setDateError,
        setTaklifPurpose,
        setTaklifDate,
        setTaklifDurationDays,
        setHubMainTab,
    } = args;
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
    const vr = validateSummonsDate(taklifDateTrim);
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
    setHubMainTab('taklif');
}

export type BuildHubTabOptionsArgs = {
    isGuarantorSummonsContext: boolean;
    memoArchivedResolved: boolean;
    showTaklifOptionInHub: boolean;
    showPublicationTab: boolean;
};

export function buildHubTabOptions(args: BuildHubTabOptionsArgs): {
    value: 'tabligh' | 'taklif' | 'nashr' | 'guarantor';
    label: string;
}[] {
    const { isGuarantorSummonsContext, memoArchivedResolved, showTaklifOptionInHub, showPublicationTab } =
        args;
    const opts: { value: 'tabligh' | 'taklif' | 'nashr' | 'guarantor'; label: string }[] = [];
    if (isGuarantorSummonsContext) {
        opts.push({ value: 'guarantor', label: 'تبليغ / تكليف الكفيل بالحضور' });
        return opts;
    }
    opts.push({ value: 'tabligh', label: memoArchivedResolved ? 'التبليغ' : 'التبليغ / الإخبار' });
    if (showTaklifOptionInHub) opts.push({ value: 'taklif', label: 'التكليف بالحضور' });
    if (showPublicationTab) opts.push({ value: 'nashr', label: 'التبليغ بالنشر' });
    return opts;
}

/** Re-export for callers that need the assignment phase type nearby. */
export type { EmployeeSummonsAssignmentState };
