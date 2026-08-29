import { useCallback, useMemo, useState } from 'react';
import type { EmployeeSummonsAssignmentState } from '@/app/types/execution';
import { computeTaklifDeadlineYmd } from '@/app/utils/employeeSummonsAssignment';
import { getExecutionSummons7DayWindow } from '@/app/utils/executionSummonsWorkflow';
import {
    buildSummonsHubActiveSnapshot,
    getSummonsKindLockReason,
} from './summonsHubActiveLocks';
import {
    todayLocalYmd,
    validateSummonsDate,
} from './summonsHubHelpers';
import {
    buildHubTabOptions,
    handleDebtorSubmit as runDebtorSubmit,
    handleTaklifConfirm as runTaklifConfirm,
    markExecutionSummonsArchived as runMarkExecutionSummonsArchived,
    submitExecutionSummonsDate as runSubmitExecutionSummonsDate,
    submitGuarantorNotice as runSubmitGuarantorNotice,
    validateMemoDateInput,
} from './summonsHubSubmitHandlers';
import type { UnifiedSummonsHubProps } from './unifiedSummonsHubTypes';
import { useUnifiedSummonsHubEffects } from './useUnifiedSummonsHubEffects';

export function useUnifiedSummonsHubState({
    isOpen,
    onClose,
    initialMainTab = null,
    onDebtorNotification,
    notificationCount,
    subsequentNoticeUnlocked = false,
    noticeKindGoalStrictBinding = true,
    onRegisterDebtorVoluntaryAttendance,
    summonsEvictionSimplifiedUi = false,
    onEvictionVoluntaryPeriodEnd,
    evictionDebtorExecutionStrip,
    evictionEarnerCollectionBranchEligible = false,
    showInitialNoticeLawyerFeesMemoOption = false,
    onNoticeVoluntaryPeriodEnd,
    tablighTask = null,
    guarantorNotificationFeature,
    employeeAssignmentFeature,
    publicationNoticeFeature,
    suppressPublicationNotice = false,
    executionId,
    executionSummonsNoticeDateYmd = null,
    executionSummonsArchived = false,
    showEmployeeTaklifHubTab = false,
}: UnifiedSummonsHubProps) {
    const [debtorDate, setDebtorDate] = useState<string>('');
    const [dateError, setDateError] = useState<string>('');
    const [isHolidayExtension, setIsHolidayExtension] = useState<boolean>(false);
    const [noticeKindGoal, setNoticeKindGoal] = useState<string>('');
    const [evictionSecondBranch, setEvictionSecondBranch] = useState<'ordinary' | 'coercive' | ''>('');
    const [secondNoticeForCollection, setSecondNoticeForCollection] = useState(false);
    const [initialNoticeLawyerFeesIncluded, setInitialNoticeLawyerFeesIncluded] = useState(false);
    const [memoDateOptimistic, setMemoDateOptimistic] = useState<string>('');
    const [memoError, setMemoError] = useState<string>('');
    const [memoArchivedOptimistic, setMemoArchivedOptimistic] = useState(false);
    const [memoDateEditing, setMemoDateEditing] = useState(false);
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
    const [tablighClearedOptimistic, setTablighClearedOptimistic] = useState(false);
    const [nashrClearedOptimistic, setNashrClearedOptimistic] = useState(false);
    const [nashrDate, setNashrDate] = useState('');
    const [nashrPaper1, setNashrPaper1] = useState('');
    const [nashrPaper2, setNashrPaper2] = useState('');
    const [nashrFormError, setNashrFormError] = useState('');
    const [guarantorNoticeDate, setGuarantorNoticeDate] = useState('');
    const [guarantorNoticeReason, setGuarantorNoticeReason] = useState('');
    const [guarantorFormError, setGuarantorFormError] = useState('');

    const memoArchivedResolved = Boolean(executionSummonsArchived || memoArchivedOptimistic);

    const showTaklifOptionInHub = Boolean(
        employeeAssignmentFeature?.enabled &&
            (memoArchivedResolved || showEmployeeTaklifHubTab),
    );
    const showPublicationTab = Boolean(
        !suppressPublicationNotice &&
            (memoArchivedResolved || (!memoArchivedResolved && notificationCount <= 1))
    );

    const isGuarantorSummonsContext = Boolean(
        guarantorNotificationFeature?.enabled &&
            (guarantorNotificationFeature.contextOnly || initialMainTab === 'guarantor')
    );

    const hubTabOptions = useMemo(
        () =>
            buildHubTabOptions({
                isGuarantorSummonsContext,
                memoArchivedResolved,
                showTaklifOptionInHub,
                showPublicationTab,
            }),
        [
            isGuarantorSummonsContext,
            memoArchivedResolved,
            showTaklifOptionInHub,
            showPublicationTab,
        ],
    );

    useUnifiedSummonsHubEffects({
        isOpen,
        initialMainTab,
        executionId,
        tablighTask,
        publicationNoticeFeature,
        guarantorNotificationFeature,
        hubMainTab,
        hubTabOptions,
        memoArchivedResolved,
        setEvictionSecondBranch,
        setSecondNoticeForCollection,
        setInitialNoticeLawyerFeesIncluded,
        setExecutionMemoRegisterMode,
        setMemoDateOptimistic,
        setMemoError,
        setMemoDateEditing,
        setMemoArchivedOptimistic,
        setTablighMode,
        setHubMainTab,
        setTaklifPurpose,
        setTaklifDate,
        setTaklifDurationDays,
        setTaklifFormError,
        setTablighTaskOptimistic,
        setTablighClearedOptimistic,
        setNashrClearedOptimistic,
        setNashrDate,
        setNashrPaper1,
        setNashrPaper2,
        setNashrFormError,
        setGuarantorNoticeDate,
        setGuarantorNoticeReason,
        setGuarantorFormError,
    });

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
    const summonsTodayYmdMax = useMemo(() => todayLocalYmd(), [isOpen]);
    const showLawyerFeesIncludeCheckbox =
        summonsEvictionSimplifiedUi && showInitialNoticeLawyerFeesMemoOption && !memoNoticeDateYmd;
    const showSubsequentNoticeForm = false;

    const resolvedTablighTask = tablighClearedOptimistic
        ? null
        : tablighTaskOptimistic || tablighTask;
    const resolvedPublicationNotice = nashrClearedOptimistic
        ? null
        : publicationNoticeFeature?.state ?? null;

    const hubActiveSnapshot = useMemo(
        () =>
            buildSummonsHubActiveSnapshot({
                tablighTask: resolvedTablighTask,
                employeeAssignment: empAssign,
                publicationNotice: resolvedPublicationNotice,
                guarantor: guarantorNotificationFeature?.state,
            }),
        [
            resolvedTablighTask,
            empAssign,
            resolvedPublicationNotice,
            guarantorNotificationFeature?.state,
        ],
    );
    const nashrLockReason = getSummonsKindLockReason('nashr', hubActiveSnapshot);

    const validateDate = validateSummonsDate;

    const submitGuarantorNotice = useCallback(() => {
        runSubmitGuarantorNotice({
            guarantorNoticeDate,
            guarantorNoticeReason,
            guarantorNotificationFeature,
            setGuarantorFormError,
        });
    }, [guarantorNoticeDate, guarantorNoticeReason, guarantorNotificationFeature]);

    const validateMemoDate = useCallback(
        (inputDate: string): boolean => validateMemoDateInput(inputDate, setMemoError),
        [],
    );

    const submitExecutionSummonsDate = useCallback(
        (nextYmd: string) => {
            runSubmitExecutionSummonsDate({
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
            });
        },
        [
            initialNoticeLawyerFeesIncluded,
            notificationCount,
            onDebtorNotification,
            showLawyerFeesIncludeCheckbox,
            executionMemoRegisterMode,
        ],
    );

    const markExecutionSummonsArchived = useCallback(
        (kind: 'attended' | 'expired') => {
            runMarkExecutionSummonsArchived({
                kind,
                onRegisterDebtorVoluntaryAttendance,
                evictionDebtorExecutionStrip,
                summonsEvictionSimplifiedUi,
                onEvictionVoluntaryPeriodEnd,
                onNoticeVoluntaryPeriodEnd,
                onClose,
                setMemoError,
                setMemoArchivedOptimistic,
            });
        },
        [
            evictionDebtorExecutionStrip?.onRegisterAttendance,
            onClose,
            onEvictionVoluntaryPeriodEnd,
            onNoticeVoluntaryPeriodEnd,
            onRegisterDebtorVoluntaryAttendance,
            summonsEvictionSimplifiedUi,
        ],
    );

    const canMergeNoticeKindIntoPurpose =
        notificationCount > 0 && (!noticeKindGoalStrictBinding || subsequentNoticeUnlocked);

    const handleDebtorSubmit = () => {
        runDebtorSubmit({
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
        });
    };

    const handleTaklifConfirm = () => {
        runTaklifConfirm({
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
        });
    };

    return {
        isGuarantorSummonsContext,
        hubTabOptions,
        memoArchivedResolved,
        hubMainTab,
        setHubMainTab,
        setTaklifFormError,
        setNashrFormError,
        notificationCount,
        memoNoticeDateYmd,
        memoDateEditing,
        memoWindow,
        memoError,
        summonsTodayYmdMax,
        showLawyerFeesIncludeCheckbox,
        initialNoticeLawyerFeesIncluded,
        setInitialNoticeLawyerFeesIncluded,
        suppressPublicationNotice,
        onRegisterDebtorVoluntaryAttendance,
        evictionDebtorExecutionStrip,
        resolvedTablighTask,
        debtorDate,
        setDebtorDate,
        dateError,
        noticeKindGoal,
        setNoticeKindGoal,
        setMemoDateEditing,
        setMemoError,
        setDateError,
        setConfirmAttendanceWithoutNoticeOpen,
        setTablighTaskOptimistic,
        setTablighClearedOptimistic,
        markExecutionSummonsArchived,
        submitExecutionSummonsDate,
        onDebtorNotification,
        onClose,
        validateDate,
        publicationNoticeFeature,
        nashrLockReason,
        resolvedPublicationNotice,
        nashrDate,
        setNashrDate,
        nashrPaper1,
        setNashrPaper1,
        nashrPaper2,
        setNashrPaper2,
        nashrFormError,
        setMemoDateOptimistic,
        setNashrClearedOptimistic,
        employeeAssignmentFeature,
        empPhase,
        empAssign,
        empEffectiveDeadlineYmd,
        taklifPurpose,
        setTaklifPurpose,
        taklifDate,
        setTaklifDate,
        taklifDurationDays,
        setTaklifDurationDays,
        taklifFormError,
        handleTaklifConfirm,
        guarantorNotificationFeature,
        guarantorNoticeDate,
        setGuarantorNoticeDate,
        guarantorNoticeReason,
        setGuarantorNoticeReason,
        guarantorFormError,
        setGuarantorFormError,
        submitGuarantorNotice,
        confirmAttendanceWithoutNoticeOpen,
    };
}
