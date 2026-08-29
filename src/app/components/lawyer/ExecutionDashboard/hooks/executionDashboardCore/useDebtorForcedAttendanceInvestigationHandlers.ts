/** Forced attendance + investigation-path coercive handlers */
import { useCallback } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import type { UseExecutionDashboardDebtorSummonsCoerciveHandlersParams } from './useExecutionDashboardDebtorSummonsCoerciveHandlers.types';
import { toastAfterExecutionPersist } from '../../helpers/toastAfterExecutionPersist';

type ForcedAttendanceParams = Pick<
    UseExecutionDashboardDebtorSummonsCoerciveHandlersParams,
    | 'forcedSummoningAnalysis'
    | 'activeDebtorNameResolved'
    | 'activeFollowupDebtorKey'
    | 'nextTimelineId'
    | 'persistExecutionMerge'
    | 'showToast'
    | 'setTimelineEvents'
    | 'setForcedAttendanceIssued'
    | 'setActiveNoticeState'
    | 'setForcedPathAttendanceSecured'
    | 'setDebtorForcedToAttend'
    | 'setInvestigationCourtRequested'
    | 'setInvestigationPathDebtorPresent'
    | 'setInvestigationMemoIssued'
    | 'setArrestWarrantUnlocked'
    | 'setDebtorEvaded'
>;

export function useDebtorForcedAttendanceInvestigationHandlers({
    forcedSummoningAnalysis,
    activeDebtorNameResolved,
    activeFollowupDebtorKey,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    setForcedAttendanceIssued,
    setActiveNoticeState,
    setForcedPathAttendanceSecured,
    setDebtorForcedToAttend,
    setInvestigationCourtRequested,
    setInvestigationPathDebtorPresent,
    setInvestigationMemoIssued,
    setArrestWarrantUnlocked,
    setDebtorEvaded,
}: ForcedAttendanceParams) {
    const handleForcedAttendance = useCallback(() => {
        if (!forcedSummoningAnalysis.canForceSummon) {
            showToast(
                forcedSummoningAnalysis.lockReasonAr ||
                    'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.',
                'warning',
            );
            return;
        }
        setForcedAttendanceIssued(true);
        setActiveNoticeState('forced_attendance');
        const now = new Date().toISOString();
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '👮 مذكرة إحضار جبري للمدين',
            description: `تم إصدار مذكرة إحضار جبري للمدين ${activeDebtorNameResolved}`,
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        let persisted: boolean | void = true;
        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persisted = persistExecutionMerge({
                forcedAttendanceIssued: true,
                activeNoticeState: 'forced_attendance',
                timelineEvents: next,
            });
            return next;
        });
        toastAfterExecutionPersist(persisted, showToast, 'تم إصدار مذكرة الإحضار الجبري');
    }, [
        forcedSummoningAnalysis,
        activeDebtorNameResolved,
        activeFollowupDebtorKey,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setForcedAttendanceIssued,
        setActiveNoticeState,
        setTimelineEvents,
    ]);

    const handleEarnerSecureForcedAttendance = useCallback(() => {
        const now = new Date().toISOString();
        setForcedPathAttendanceSecured(true);
        setDebtorForcedToAttend(true);
        setActiveNoticeState(null);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '✅ تأمين إحضار المدين',
            description: `تم تأمين إحضار المدين ${activeDebtorNameResolved} تنفيذاً لمذكرة الإحضار الجبري.`,
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        let persisted: boolean | void = true;
        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persisted = persistExecutionMerge({
                forcedPathAttendanceSecured: true,
                debtorForcedToAttend: true,
                activeNoticeState: null,
                timelineEvents: next,
            });
            return next;
        });
        toastAfterExecutionPersist(persisted, showToast, 'تم تسجيل تأمين الإحضار');
    }, [
        activeDebtorNameResolved,
        activeFollowupDebtorKey,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setForcedPathAttendanceSecured,
        setDebtorForcedToAttend,
        setActiveNoticeState,
        setTimelineEvents,
    ]);

    const handleRequestInvestigationFromForced = useCallback(() => {
        const now = new Date().toISOString();
        setInvestigationCourtRequested(true);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '⚖️ طلب مفاتحة محكمة التحقيق',
            description: `طلب مفاتحة محكمة التحقيق لمتابعة إحضار المدين ${activeDebtorNameResolved}.`,
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        let persisted: boolean | void = true;
        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persisted = persistExecutionMerge({
                investigationCourtRequested: true,
                timelineEvents: next,
            });
            return next;
        });
        if (persisted === false) {
            showToast('تعذّر حفظ طلب المفاتحة — أعد المحاولة', 'error');
            return;
        }
        showToast('تم تسجيل طلب المفاتحة', 'info');
    }, [
        activeDebtorNameResolved,
        activeFollowupDebtorKey,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setInvestigationCourtRequested,
        setTimelineEvents,
    ]);

    const handleInvestigationDebtorShowed = useCallback(() => {
        const now = new Date().toISOString();
        setInvestigationPathDebtorPresent(true);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '🟢 حضور المدين — مسار التحقيق',
            description: 'تسجيل حضور المدين في إطار مفاتحة محكمة التحقيق.',
            type: 'summons',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        let persisted: boolean | void = true;
        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persisted = persistExecutionMerge({
                investigationPathDebtorPresent: true,
                timelineEvents: next,
            });
            return next;
        });
        toastAfterExecutionPersist(persisted, showToast, 'تم تسجيل حضور المدين');
    }, [
        activeFollowupDebtorKey,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setInvestigationPathDebtorPresent,
        setTimelineEvents,
    ]);

    const handleInvestigationIssueMemo = useCallback(() => {
        const now = new Date().toISOString();
        setInvestigationMemoIssued(true);
        setArrestWarrantUnlocked(true);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '📜 إصدار مذكرة قبض — مسار التحقيق',
            description: `إصدار مذكرة قبض بحق المدين ${activeDebtorNameResolved}.`,
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        let persisted: boolean | void = true;
        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persisted = persistExecutionMerge({
                investigationMemoIssued: true,
                arrestWarrantUnlocked: true,
                timelineEvents: next,
            });
            return next;
        });
        toastAfterExecutionPersist(persisted, showToast, 'تم تسجيل إصدار المذكرة');
    }, [
        activeDebtorNameResolved,
        activeFollowupDebtorKey,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setInvestigationMemoIssued,
        setArrestWarrantUnlocked,
        setTimelineEvents,
    ]);

    const handleConfirmSecuredAfterInvestigation = useCallback(() => {
        const now = new Date().toISOString();
        setForcedPathAttendanceSecured(true);
        setDebtorForcedToAttend(true);
        setActiveNoticeState(null);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '✅ تم تأمين إحضار المدين — بعد المفاتحة',
            description: 'إكمال تأمين إحضار المدين بعد مسار مفاتحة محكمة التحقيق.',
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        let persisted: boolean | void = true;
        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persisted = persistExecutionMerge({
                forcedPathAttendanceSecured: true,
                debtorForcedToAttend: true,
                activeNoticeState: null,
                timelineEvents: next,
            });
            return next;
        });
        toastAfterExecutionPersist(persisted, showToast, 'تم إكمال تأمين الإحضار');
    }, [
        activeFollowupDebtorKey,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setForcedPathAttendanceSecured,
        setDebtorForcedToAttend,
        setActiveNoticeState,
        setTimelineEvents,
    ]);

    const handleDebtorEvasion = useCallback(() => {
        setDebtorEvaded(true);
        setArrestWarrantUnlocked(true);
        persistExecutionMerge({ debtorEvaded: true });
        const now = new Date().toISOString();
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '🚫 المدين تخفى عن الأنظار',
            description: 'لم يُعثر على المدين. تم تفعيل خيار مفاتحة محكمة التحقيق (أمر قبض)',
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تفعيل خيار أمر القبض', 'warning');
    }, [
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setDebtorEvaded,
        setArrestWarrantUnlocked,
        setTimelineEvents,
    ]);

    const handleArrestWarrant = useCallback(() => {
        const now = new Date().toISOString();
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '⛓️ مفاتحة محكمة التحقيق (أمر قبض)',
            description: `تم مفاتحة محكمة التحقيق لإصدار أمر قبض بحق المدين ${activeDebtorNameResolved}`,
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
        };
        let persisted: boolean | void = true;
        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persisted = persistExecutionMerge({ timelineEvents: next });
            return next;
        });
        toastAfterExecutionPersist(persisted, showToast, 'تم تسجيل مفاتحة محكمة التحقيق');
    }, [activeDebtorNameResolved, nextTimelineId, persistExecutionMerge, showToast, setTimelineEvents]);

    return {
        handleForcedAttendance,
        handleEarnerSecureForcedAttendance,
        handleRequestInvestigationFromForced,
        handleInvestigationDebtorShowed,
        handleInvestigationIssueMemo,
        handleConfirmSecuredAfterInvestigation,
        handleDebtorEvasion,
        handleArrestWarrant,
    };
}
