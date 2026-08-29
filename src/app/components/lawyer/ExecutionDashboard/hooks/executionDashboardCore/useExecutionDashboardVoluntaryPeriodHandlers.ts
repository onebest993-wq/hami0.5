/** Phase C — إعلان انتهاء مهلة الإخبار/التبليغ (إخلاء + عام) */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { isGracePeriodExpired, getLocalTodayYmd, parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import { buildDebtorNoticePatchForKey, buildDebtorSummonsMarkerPatchForKey } from '@/app/utils/noticeDebtorScope';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';

export type ActiveDebtorNoticeScope = {
    memoAnchorDate?: string | null;
    notificationDate?: string | null;
    voluntaryPeriodEndDeclared?: boolean;
};

export type UseExecutionDashboardVoluntaryPeriodHandlersParams = {
    isEvictionExecutionModule: boolean;
    evictionGraceAnchorDate: string | null | undefined;
    executionData: ExecutionFile | null | undefined;
    voluntaryEndOptimistic: boolean;
    unifiedSummonsTargetDebtorKey: string;
    primaryDebtorKeyResolved: string;
    activeDebtorNoticeScope: ActiveDebtorNoticeScope;
    debtorNotificationDate: string | null | undefined;
    noticeVoluntaryPeriodEndOptimistic: boolean;
    manualGraceCalendarExtra: boolean;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setVoluntaryEndOptimistic: Dispatch<SetStateAction<boolean>>;
    setNoticeVoluntaryPeriodEndOptimistic: Dispatch<SetStateAction<boolean>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    voluntaryAttendanceCount: number | undefined;
    summoningRound: number | undefined;
    setDebtorSummonsMarkerLocal: Dispatch<SetStateAction<Record<string, unknown> | null>>;
    setDebtorAttendedVoluntarily: Dispatch<SetStateAction<boolean>>;
    setActiveNoticeState: Dispatch<SetStateAction<string | null>>;
    setVoluntaryAttendanceCount: Dispatch<SetStateAction<number>>;
    setSummoningRound: Dispatch<SetStateAction<number>>;
    setDebtorNotificationDate: Dispatch<SetStateAction<string | null>>;
};

export function useExecutionDashboardVoluntaryPeriodHandlers({
    isEvictionExecutionModule,
    evictionGraceAnchorDate,
    executionData,
    voluntaryEndOptimistic,
    unifiedSummonsTargetDebtorKey,
    primaryDebtorKeyResolved,
    activeDebtorNoticeScope,
    debtorNotificationDate,
    noticeVoluntaryPeriodEndOptimistic,
    manualGraceCalendarExtra,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setVoluntaryEndOptimistic,
    setNoticeVoluntaryPeriodEndOptimistic,
    setTimelineEvents,
    voluntaryAttendanceCount,
    summoningRound,
    setDebtorSummonsMarkerLocal,
    setDebtorAttendedVoluntarily,
    setActiveNoticeState,
    setVoluntaryAttendanceCount,
    setSummoningRound,
    setDebtorNotificationDate,
}: UseExecutionDashboardVoluntaryPeriodHandlersParams) {
    const handleDeclareEvictionVoluntaryPeriodEnd = useCallback(() => {
        if (!isEvictionExecutionModule) return;
        if (!evictionGraceAnchorDate) {
            showToast('لا يوجد تاريخ إخبار/تبليغ مُسجَّل لاحتساب المدة', 'warning');
            return;
        }
        if (!isGracePeriodExpired(evictionGraceAnchorDate, new Date(), 0)) {
            showToast('يُتاح «انتهاء المهلة» بعد انقضاء سبعة أيام تقويمية من اليوم التالي للتبليغ.', 'warning');
            return;
        }
        if (executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic) return;
        setVoluntaryEndOptimistic(true);
        const anchor = evictionGraceAnchorDate;
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '⏱️ انتهاء مهلة الإخبار/التبليغ',
            description: `مرجع التاريخ: ${anchor}.`,
            type: 'summons',
            source: 'التبليغ',
        };
        setTimelineEvents((prev) => {
            const next = [ev, ...prev];
            persistExecutionMerge({
                eviction_voluntary_period_end_declared: true,
                debtor_absence_badge_dismissed: false,
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل انتهاء المهلة', 'success');
    }, [
        isEvictionExecutionModule,
        evictionGraceAnchorDate,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
        persistExecutionMerge,
        nextTimelineId,
        showToast,
        setVoluntaryEndOptimistic,
        setTimelineEvents,
    ]);

    const handleDeclareNoticeVoluntaryPeriodEnd = useCallback(() => {
        if (isEvictionExecutionModule) return;
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const targetIsPrimary = targetDebtorKey === primaryDebtorKeyResolved;
        const anchor =
            activeDebtorNoticeScope.memoAnchorDate ||
            activeDebtorNoticeScope.notificationDate ||
            (targetIsPrimary ? debtorNotificationDate : null) ||
            null;
        if (!anchor) {
            showToast('لا يوجد تاريخ مذكرة إخبار مُسجَّل لاحتساب المدة', 'warning');
            return;
        }
        if (!isGracePeriodExpired(anchor, new Date(), manualGraceCalendarExtra ? 1 : 0)) {
            showToast('يُتاح «انتهاء المهلة» بعد انقضاء سبعة أيام تقويمية من اليوم التالي للتبليغ.', 'warning');
            return;
        }
        if (
            activeDebtorNoticeScope.voluntaryPeriodEndDeclared ||
            (targetIsPrimary && noticeVoluntaryPeriodEndOptimistic)
        ) {
            return;
        }
        if (targetIsPrimary) setNoticeVoluntaryPeriodEndOptimistic(true);
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '⏱️ انتهاء مهلة الإخبار/التبليغ',
            description: `مرجع تاريخ المذكرة: ${anchor}.`,
            type: 'summons',
            source: 'التبليغ',
            metadata: timelineDebtorMetadata(targetDebtorKey),
        };
        setTimelineEvents((prev) => {
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorNoticePatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          {
                              voluntaryPeriodEndDeclared: true,
                              absenceBadgeDismissed: false,
                          },
                      )
                    : {
                          notice_voluntary_period_end_declared: true,
                          debtor_absence_badge_dismissed: false,
                      }),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل انتهاء المهلة', 'success');
    }, [
        isEvictionExecutionModule,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        executionData,
        activeDebtorNoticeScope.memoAnchorDate,
        activeDebtorNoticeScope.notificationDate,
        activeDebtorNoticeScope.voluntaryPeriodEndDeclared,
        debtorNotificationDate,
        noticeVoluntaryPeriodEndOptimistic,
        manualGraceCalendarExtra,
        persistExecutionMerge,
        nextTimelineId,
        showToast,
        setNoticeVoluntaryPeriodEndOptimistic,
        setTimelineEvents,
    ]);

    const registerDebtorVoluntaryAttendance = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const targetIsPrimary = targetDebtorKey === primaryDebtorKeyResolved;
        setDebtorSummonsMarkerLocal(null);
        const nd =
            activeDebtorNoticeScope.memoAnchorDate ||
            activeDebtorNoticeScope.notificationDate ||
            (targetIsPrimary ? debtorNotificationDate : null) ||
            getLocalTodayYmd();
        const needsAnchorBackfill =
            !activeDebtorNoticeScope.memoAnchorDate &&
            !activeDebtorNoticeScope.notificationDate &&
            (targetIsPrimary
                ? !debtorNotificationDate && !executionData?.debtorNotificationDate
                : true);
        if (needsAnchorBackfill && targetIsPrimary) {
            setDebtorNotificationDate(nd);
        }
        const nextVac = (voluntaryAttendanceCount ?? 0) + 1;
        const nextRound = (summoningRound ?? 1) + 1;
        if (targetIsPrimary) {
            setDebtorAttendedVoluntarily(true);
            setActiveNoticeState(null);
            setVoluntaryAttendanceCount(nextVac);
            setSummoningRound(nextRound);
        }
        const ndDisplay = parseLocalNotificationDate(String(nd)).toLocaleDateString('ar-EG');
        const attendEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: String(nd),
            timestamp: new Date().toISOString(),
            title: '🟢 تم حضور المدين',
            description: `مرجع تاريخ المذكرة/الإخبار: ${ndDisplay}.`,
            type: 'summons',
            source: 'التبليغ',
            metadata: {
                ...timelineDebtorMetadata(targetDebtorKey),
                timelineExpandedNote:
                    'يُحتسب الحضور في سياق مذكرة الإخبار بالتنفيذ (وليس تاريخ الضغط على الزر). بعده يُتاح تسجيل تبليغ لاحق دون مهلة 7 أيام.',
            },
        };
        setTimelineEvents((prev) => {
            const next = [attendEvent, ...prev];
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorNoticePatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          {
                              ...(needsAnchorBackfill
                                  ? { memoAnchorDate: nd, notificationDate: nd }
                                  : {}),
                              activeNoticeState: null,
                              voluntaryPeriodEndDeclared: true,
                          },
                      )
                    : needsAnchorBackfill
                      ? { execution_memo_anchor_date: nd, debtorNotificationDate: nd }
                      : {}),
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          null,
                      )
                    : { debtor_summons_marker: null }),
                ...(targetIsPrimary
                    ? {
                          debtorAttendedVoluntarily: true,
                          activeNoticeState: null,
                          voluntaryAttendanceCount: nextVac,
                          summoningRound: nextRound,
                      }
                    : {}),
                timelineEvents: next,
            });
            return next;
        });
        showToast('✅ تم تسجيل حضور المدين — يُتاح تبليغ لاحق وفق المسار', 'success');
    }, [
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorNoticeScope.memoAnchorDate,
        activeDebtorNoticeScope.notificationDate,
        debtorNotificationDate,
        executionData?.debtorNotificationDate,
        executionData,
        voluntaryAttendanceCount,
        summoningRound,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setDebtorSummonsMarkerLocal,
        setDebtorAttendedVoluntarily,
        setActiveNoticeState,
        setVoluntaryAttendanceCount,
        setSummoningRound,
        setDebtorNotificationDate,
        setTimelineEvents,
    ]);

    return {
        handleDeclareEvictionVoluntaryPeriodEnd,
        handleDeclareNoticeVoluntaryPeriodEnd,
        registerDebtorVoluntaryAttendance,
    };
}
