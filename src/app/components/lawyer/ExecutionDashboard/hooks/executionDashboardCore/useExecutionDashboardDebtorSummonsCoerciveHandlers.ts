// @ts-nocheck
/** Phase C — علامة التبليغ + مسار الإحضار الجبري والتحقيق */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { buildDebtorSummonsMarkerPatchForKey } from '@/app/utils/noticeDebtorScope';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import {
    defaultEvictionEarnerFeeCollectionSM,
    reduceEvictionEarnerFeeSm,
    type EarnerFeeSmAction,
    type EvictionEarnerFeeCollectionSM,
} from '@/app/utils/evictionEarnerFeeCollectionMachine';

export type ForcedSummoningAnalysis = {
    canForceSummon: boolean;
    lockReasonAr?: string;
};

export type UseExecutionDashboardDebtorSummonsCoerciveHandlersParams = {
    executionData: ExecutionFile | null | undefined;
    unifiedSummonsTargetDebtorKey: string;
    primaryDebtorKeyResolved: string;
    debtorSummonsMarkerLocal: Record<string, unknown> | null;
    summonsPurposeDraft: string;
    forcedSummoningAnalysis: ForcedSummoningAnalysis;
    activeDebtorNameResolved: string;
    activeFollowupDebtorKey: string;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setDebtorSummonsMarkerLocal: Dispatch<SetStateAction<Record<string, unknown> | null>>;
    setSummonsMarkerPopoverOpen: (open: boolean) => void;
    setForcedAttendanceIssued: Dispatch<SetStateAction<boolean>>;
    setActiveNoticeState: Dispatch<SetStateAction<string | null>>;
    setForcedPathAttendanceSecured: Dispatch<SetStateAction<boolean>>;
    setDebtorForcedToAttend: Dispatch<SetStateAction<boolean>>;
    setInvestigationCourtRequested: Dispatch<SetStateAction<boolean>>;
    setInvestigationPathDebtorPresent: Dispatch<SetStateAction<boolean>>;
    setInvestigationMemoIssued: Dispatch<SetStateAction<boolean>>;
    setArrestWarrantUnlocked: Dispatch<SetStateAction<boolean>>;
    setDebtorEvaded: Dispatch<SetStateAction<boolean>>;
    setDebtorArrested: Dispatch<SetStateAction<boolean>>;
    setEarnerFeeCollectionSm: Dispatch<SetStateAction<EvictionEarnerFeeCollectionSM>>;
};

export function useExecutionDashboardDebtorSummonsCoerciveHandlers({
    executionData,
    unifiedSummonsTargetDebtorKey,
    primaryDebtorKeyResolved,
    debtorSummonsMarkerLocal,
    summonsPurposeDraft,
    forcedSummoningAnalysis,
    activeDebtorNameResolved,
    activeFollowupDebtorKey,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    setDebtorSummonsMarkerLocal,
    setSummonsMarkerPopoverOpen,
    setForcedAttendanceIssued,
    setActiveNoticeState,
    setForcedPathAttendanceSecured,
    setDebtorForcedToAttend,
    setInvestigationCourtRequested,
    setInvestigationPathDebtorPresent,
    setInvestigationMemoIssued,
    setArrestWarrantUnlocked,
    setDebtorEvaded,
    setDebtorArrested,
    setEarnerFeeCollectionSm,
}: UseExecutionDashboardDebtorSummonsCoerciveHandlersParams) {
    const clearDebtorSummonsMarker = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const ts = new Date().toISOString();
        const cur = debtorSummonsMarkerLocal;
        if (!cur?.id) return;
        const nextMarker = {
            ...cur,
            badgeHiddenAt: ts,
        };
        setDebtorSummonsMarkerLocal(nextMarker);
        setTimelineEvents((prev) => {
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          nextMarker,
                      )
                    : { debtor_summons_marker: nextMarker }),
                timelineEvents: prev,
            });
            return prev;
        });
        setSummonsMarkerPopoverOpen(false);
        showToast('أُخفيت الإشارة من البطاقة', 'info');
    }, [
        debtorSummonsMarkerLocal,
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        persistExecutionMerge,
        showToast,
        setDebtorSummonsMarkerLocal,
        setSummonsMarkerPopoverOpen,
        setTimelineEvents,
    ]);

    const terminateDebtorSummonsMarker = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const marker = debtorSummonsMarkerLocal;
        if (!marker?.id) return;
        const ts = new Date().toISOString();
        const nextMarker = {
            ...marker,
            periodEndedAt: ts,
        };
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: ts.slice(0, 10),
            timestamp: ts,
            title: '⏹ إنهاء التبليغ',
            description: `تم إنهاء التبليغ المسجّل بتاريخ ${marker.date}. الغاية: ${marker.purpose || '—'}.`,
            type: 'notification',
            source: 'التبليغ',
            metadata: timelineDebtorMetadata(targetDebtorKey),
        };
        setDebtorSummonsMarkerLocal(nextMarker);
        setTimelineEvents((prev) => {
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          nextMarker,
                      )
                    : { debtor_summons_marker: nextMarker }),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إنهاء التبليغ', 'info');
    }, [
        debtorSummonsMarkerLocal,
        executionData,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
        unifiedSummonsTargetDebtorKey,
        setDebtorSummonsMarkerLocal,
        setTimelineEvents,
    ]);

    const saveSummonsMarkerPurposeEdit = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const m = debtorSummonsMarkerLocal;
        if (!m?.id) return;
        const p = summonsPurposeDraft.trim();
        const truncated = p.length > 280 ? `${p.slice(0, 280)}…` : p;
        const marker = {
            id: m.id,
            date: m.date,
            purpose: truncated || 'تبليغ',
        };
        setTimelineEvents((prev) => {
            const next = prev.map((e) => {
                if (String(e.id) !== String(m.id)) return e;
                const title = `🔔 تطلب حضوره${p ? ` — ${p}` : ''}`;
                return {
                    ...e,
                    description: `الغاية: ${p || '—'}. تاريخ التبليغ المُسجَّل: ${m.date}`,
                    title,
                };
            });
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          marker,
                      )
                    : { debtor_summons_marker: marker }),
                timelineEvents: next,
            });
            return next;
        });
        setDebtorSummonsMarkerLocal(marker);
        setSummonsMarkerPopoverOpen(false);
        showToast('تم حفظ الغاية', 'success');
    }, [
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        debtorSummonsMarkerLocal,
        summonsPurposeDraft,
        persistExecutionMerge,
        showToast,
        setDebtorSummonsMarkerLocal,
        setSummonsMarkerPopoverOpen,
        setTimelineEvents,
    ]);

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
        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persistExecutionMerge({
                forcedAttendanceIssued: true,
                activeNoticeState: 'forced_attendance',
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إصدار مذكرة الإحضار الجبري', 'success');
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
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل تأمين الإحضار', 'success');
    }, [
        activeDebtorNameResolved,
        activeFollowupDebtorKey,
        nextTimelineId,
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
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل طلب المفاتحة', 'info');
    }, [
        activeDebtorNameResolved,
        activeFollowupDebtorKey,
        nextTimelineId,
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
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل حضور المدين', 'success');
    }, [activeFollowupDebtorKey, nextTimelineId, showToast, setInvestigationPathDebtorPresent, setTimelineEvents]);

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
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل إصدار المذكرة', 'success');
    }, [
        activeDebtorNameResolved,
        activeFollowupDebtorKey,
        nextTimelineId,
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
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم إكمال تأمين الإحضار', 'success');
    }, [
        activeFollowupDebtorKey,
        nextTimelineId,
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

    const applyEarnerFeeSmAction = useCallback(
        (action: EarnerFeeSmAction) => {
            if (action.type === 'B2_FORCED_MEMO' && !forcedSummoningAnalysis.canForceSummon) {
                showToast(
                    forcedSummoningAnalysis.lockReasonAr ||
                        'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.',
                    'warning',
                );
                return;
            }
            const side = {
                force: false,
                evasion: false,
                clearEvasion: false,
                b3: false,
                b4: false,
            };
            setEarnerFeeCollectionSm((prev) => {
                if (action.type === 'B1_PERIOD_DONE' && prev.b1PeriodComplete) return prev;
                if (action.type === 'B2_FORCED_MEMO' && prev.b2ForcedMemoIssued) return prev;
                if (action.type === 'B3_REQUEST' && prev.b3InvestigationRequested) return prev;
                if (action.type === 'B3_CONFIRM_PROCESSED' && prev.b3ProcessedConfirmed) return prev;
                if (action.type === 'B4_WARRANT' && prev.b4WarrantLogged) return prev;

                const next = reduceEvictionEarnerFeeSm(prev, action);
                const merge: Record<string, unknown> = { eviction_earner_fee_collection_sm: next };
                if (action.type === 'PICK_ORDINARY') {
                    merge.eviction_last_summons_for_collection = true;
                    merge.eviction_last_collection_summons_branch = 'ordinary';
                }
                if (action.type === 'PICK_COERCIVE') {
                    merge.eviction_last_summons_for_collection = true;
                    merge.eviction_last_collection_summons_branch = 'coercive';
                }
                persistExecutionMerge(merge);

                if (action.type === 'B2_FORCED_MEMO' && !prev.b2ForcedMemoIssued) side.force = true;
                if (action.type === 'B2_EVADING' && action.value && !prev.b2DebtorEvading) side.evasion = true;
                else if (action.type === 'B2_EVADING' && !action.value && prev.b2DebtorEvading)
                    side.clearEvasion = true;
                if (action.type === 'B3_REQUEST' && !prev.b3InvestigationRequested) side.b3 = true;
                if (action.type === 'B4_WARRANT' && !prev.b4WarrantLogged) side.b4 = true;

                return next;
            });
            if (side.force) handleForcedAttendance();
            if (side.evasion) handleDebtorEvasion();
            if (side.clearEvasion) {
                setDebtorEvaded(false);
                persistExecutionMerge({ debtorEvaded: false });
            }
            if (side.b3) handleRequestInvestigationFromForced();
            if (side.b4) handleInvestigationIssueMemo();
        },
        [
            forcedSummoningAnalysis,
            persistExecutionMerge,
            showToast,
            setEarnerFeeCollectionSm,
            handleForcedAttendance,
            handleDebtorEvasion,
            handleRequestInvestigationFromForced,
            handleInvestigationIssueMemo,
            setDebtorEvaded,
        ],
    );

    const resetEarnerFeeNotificationCycle = useCallback(() => {
        const fresh = defaultEvictionEarnerFeeCollectionSM();
        setEarnerFeeCollectionSm(fresh);
        setActiveNoticeState(null);
        setForcedAttendanceIssued(false);
        setInvestigationCourtRequested(false);
        setInvestigationMemoIssued(false);
        setInvestigationPathDebtorPresent(false);
        setForcedPathAttendanceSecured(false);
        setDebtorForcedToAttend(false);
        setDebtorArrested(false);
        setArrestWarrantUnlocked(false);
        setDebtorEvaded(false);
        persistExecutionMerge({
            eviction_earner_fee_collection_sm: fresh,
            eviction_last_summons_for_collection: false,
            eviction_last_collection_summons_branch: null,
            activeNoticeState: null,
            forcedAttendanceIssued: false,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: false,
            forcedPathAttendanceSecured: false,
            debtorForcedToAttend: false,
            debtorArrested: false,
            arrestWarrantUnlocked: false,
            debtorEvaded: false,
        });
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '🔄 إعادة ضبط مسار الاستحصال والتبليغ (كاسب — تخلية)',
            description: 'قُطع مسار الإكراه المرتبط بالاستحصال وأُعيدت آلية التبليغ لحالتها الأولية.',
            type: 'summons',
            source: 'التبليغ والإحضار',
        };
        setTimelineEvents((prev) => [ev, ...prev]);
        showToast('أُعيد ضبط مسار التبليغ والاستحصال — توقفت الإجراءات الإكراهية المعلّقة', 'info');
    }, [
        persistExecutionMerge,
        nextTimelineId,
        showToast,
        setEarnerFeeCollectionSm,
        setActiveNoticeState,
        setForcedAttendanceIssued,
        setInvestigationCourtRequested,
        setInvestigationMemoIssued,
        setInvestigationPathDebtorPresent,
        setForcedPathAttendanceSecured,
        setDebtorForcedToAttend,
        setDebtorArrested,
        setArrestWarrantUnlocked,
        setDebtorEvaded,
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
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل مفاتحة محكمة التحقيق', 'success');
    }, [activeDebtorNameResolved, nextTimelineId, showToast, setTimelineEvents]);

    return {
        clearDebtorSummonsMarker,
        terminateDebtorSummonsMarker,
        saveSummonsMarkerPurposeEdit,
        handleForcedAttendance,
        handleEarnerSecureForcedAttendance,
        handleRequestInvestigationFromForced,
        handleInvestigationDebtorShowed,
        handleInvestigationIssueMemo,
        handleConfirmSecuredAfterInvestigation,
        handleDebtorEvasion,
        applyEarnerFeeSmAction,
        resetEarnerFeeNotificationCycle,
        handleArrestWarrant,
    };
}
