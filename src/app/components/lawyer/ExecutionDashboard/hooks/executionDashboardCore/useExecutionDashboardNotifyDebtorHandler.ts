// @ts-nocheck
/** Phase C — تبليغ المدين (مذكرة أولى + تبليغات لاحقة) */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, EvictionSubsequentSummonsMeta, TimelineEvent } from '@/app/types/execution';
import { AR_TABLIGH_RAQM } from '../../executionDashboardLazyShellUi';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildDebtorNoticePatchForKey,
    buildDebtorNotificationCountPatchForKey,
    buildDebtorSummonsMarkerPatchForKey,
} from '@/app/utils/noticeDebtorScope';
import { buildEmployeeAssignmentPatchForDebtorKey } from '@/app/utils/employeeSummonsAssignment';
import { buildPublicationNoticePatchForDebtorKey } from '@/app/utils/publicationNoticeDebtor';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';

export type UseExecutionDashboardNotifyDebtorHandlerParams = {
    executionData: ExecutionFile | null | undefined;
    unifiedSummonsTargetDebtorKey: string;
    primaryDebtorKeyResolved: string;
    activeDebtorNoticeScope: { notificationDate?: string | null };
    debtorNotificationDate: string | null | undefined;
    notificationPurpose: string;
    notificationCount: number;
    subsequentNoticeUnlocked: boolean;
    isEvictionExecutionModule: boolean;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    setDebtorNotificationDate: Dispatch<SetStateAction<string | null | undefined>>;
    setLastActionDate: Dispatch<SetStateAction<string>>;
    setActiveNoticeState: Dispatch<SetStateAction<string | null>>;
    setNoticeVoluntaryPeriodEndOptimistic: Dispatch<SetStateAction<boolean>>;
    setVoluntaryEndOptimistic: Dispatch<SetStateAction<boolean>>;
    setNotificationCount: Dispatch<SetStateAction<number>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setDebtorSummonsMarkerLocal: Dispatch<SetStateAction<Record<string, unknown> | null>>;
    setNotificationPurpose: Dispatch<SetStateAction<string>>;
    setSummonsMarkerPopoverOpen: (open: boolean) => void;
};

export function useExecutionDashboardNotifyDebtorHandler(params: UseExecutionDashboardNotifyDebtorHandlerParams) {
    const {
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorNoticeScope,
        debtorNotificationDate,
        notificationPurpose,
        notificationCount,
        subsequentNoticeUnlocked,
        isEvictionExecutionModule,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setDebtorNotificationDate,
        setLastActionDate,
        setActiveNoticeState,
        setNoticeVoluntaryPeriodEndOptimistic,
        setVoluntaryEndOptimistic,
        setNotificationCount,
        setTimelineEvents,
        setDebtorSummonsMarkerLocal,
        setNotificationPurpose,
        setSummonsMarkerPopoverOpen,
    } = params;

    const handleNotifyDebtor = useCallback(
        (
            explicitNotificationDate?: string | null,
            evictionSubsequentMeta?: EvictionSubsequentSummonsMeta,
            initialNoticeLawyerFeesIncluded?: boolean,
            summonsPurposeFromModal?: string,
            notifyOpts?: { forceExecutionMemo?: boolean },
        ) => {
            const targetDebtorKey = unifiedSummonsTargetDebtorKey;
            const targetIsPrimary = targetDebtorKey === primaryDebtorKeyResolved;
            const fallbackDay = getLocalTodayYmd();
            const picked =
                typeof explicitNotificationDate === 'string' && explicitNotificationDate.trim() !== ''
                    ? explicitNotificationDate.trim()
                    : null;
            const dateToUse =
                picked ??
                activeDebtorNoticeScope.notificationDate ??
                (targetIsPrimary ? debtorNotificationDate : null) ??
                fallbackDay;

            const purposeText = String(summonsPurposeFromModal ?? notificationPurpose ?? '').trim();

            const wasInitialNotice = notificationCount === 0;
            const forceMemo = Boolean(notifyOpts?.forceExecutionMemo && notificationCount === 1);

            if (!wasInitialNotice && !subsequentNoticeUnlocked && !forceMemo) {
                showToast(
                    'سجّل حضور المدين، أو «انتهاء المهلة» بعد السبعة أيام، أو نفّذ إجراء التنفيذ المناسب قبل تسجيل تبليغ لاحق.',
                    'warning',
                );
                return;
            }

            if (targetIsPrimary) setDebtorNotificationDate(dateToUse);
            setLastActionDate(dateToUse);

            const isMemoRegistration = wasInitialNotice || forceMemo;
            const nextCount = isMemoRegistration ? 1 : notificationCount + 1;

            let eventTitle = '';
            let eventDescription = '';

            if (isMemoRegistration) {
                eventTitle = forceMemo ? '📋 إعادة تبليغ بمذكرة الإخبار بالتنفيذ' : '📋 مذكرة الإخبار بالتنفيذ';
                eventDescription = forceMemo
                    ? `إعادة مذكرة الإخبار بالتنفيذ. تاريخ التبليغ الفعلي: ${dateToUse}.`
                    : `مذكرة الإخبار بالتنفيذ. تاريخ التبليغ الفعلي: ${dateToUse}.`;
                if (typeof initialNoticeLawyerFeesIncluded === 'boolean') {
                    eventDescription += initialNoticeLawyerFeesIncluded
                        ? '\nأتعاب المحاماة مشمولة في المذكرة (تخلية — كاسب).'
                        : '\nأتعاب المحاماة: مسار اعتيادي دون شمول في المذكرة.';
                }
                setActiveNoticeState('initial_notice');
                if (targetIsPrimary) setNoticeVoluntaryPeriodEndOptimistic(false);
                setVoluntaryEndOptimistic(false);
            } else {
                const raqm = nextCount - 1;
                const raqmLabel = AR_TABLIGH_RAQM[raqm] ?? String(raqm);
                eventTitle = `🔔 تبليغ رقم ${raqmLabel}${purposeText ? ` — ${purposeText}` : ''}`;
                eventDescription = `الغاية: ${purposeText || '—'}. تاريخ التبليغ: ${dateToUse}`;
            }

            const recorded = new Date().toISOString();
            const eventId = nextTimelineId();
            const newEvent: TimelineEvent = {
                id: eventId,
                date: dateToUse,
                timestamp: recorded,
                title: eventTitle,
                description: eventDescription,
                type: 'notification',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetDebtorKey),
            };

            const markerPurpose = purposeText || 'تبليغ';
            const markerTrimmed =
                markerPurpose.length > 280 ? `${markerPurpose.slice(0, 280)}…` : markerPurpose;
            const markerPayload = isMemoRegistration
                ? null
                : {
                      id: eventId,
                      date: dateToUse,
                      purpose: markerTrimmed,
                      recordedAt: new Date().toISOString(),
                  };
            const scopedDebtorPatch = executionData?.id
                ? {
                      ...buildDebtorNoticePatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          {
                              notificationDate: dateToUse,
                              ...(isMemoRegistration
                                  ? {
                                        memoAnchorDate: dateToUse,
                                        voluntaryPeriodEndDeclared: false,
                                        absenceBadgeDismissed: false,
                                        activeNoticeState: 'initial_notice',
                                    }
                                  : {}),
                          },
                      ),
                      ...buildDebtorNotificationCountPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          nextCount,
                      ),
                      ...buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          markerPayload,
                      ),
                  }
                : { debtorNotificationDate: dateToUse };

            const persistPatch: Record<string, unknown> = {
                lastActionDate: dateToUse,
                ...(targetIsPrimary ? { notificationCount: nextCount } : {}),
                ...(targetIsPrimary ? { debtor_summons_marker: markerPayload } : {}),
                ...scopedDebtorPatch,
            };

            if (!isMemoRegistration && executionData?.id) {
                Object.assign(persistPatch, {
                    ...buildEmployeeAssignmentPatchForDebtorKey(
                        executionData,
                        targetDebtorKey,
                        null,
                        primaryDebtorKeyResolved,
                    ),
                    ...buildPublicationNoticePatchForDebtorKey(executionData, targetDebtorKey, null),
                });
            }

            if (isMemoRegistration) {
                setNotificationCount(1);
                if (isEvictionExecutionModule) {
                    Object.assign(persistPatch, {
                        eviction_first_notice_date: dateToUse,
                        eviction_voluntary_period_end_declared: false,
                        debtor_absence_badge_dismissed: false,
                    });
                    if (typeof initialNoticeLawyerFeesIncluded === 'boolean') {
                        persistPatch.eviction_initial_notice_lawyer_fees_included =
                            initialNoticeLawyerFeesIncluded;
                        persistPatch.eviction_lawyer_fee_waived_at_intake = !initialNoticeLawyerFeesIncluded;
                        if (initialNoticeLawyerFeesIncluded) {
                            persistPatch.eviction_lawyer_fee_requested = true;
                        }
                    }
                } else if (targetIsPrimary) {
                    Object.assign(persistPatch, {
                        execution_memo_anchor_date: dateToUse,
                        notice_voluntary_period_end_declared: false,
                        debtor_absence_badge_dismissed: false,
                    });
                }
            } else {
                setNotificationCount((p) => p + 1);
                if (isEvictionExecutionModule) {
                    const forCol = Boolean(evictionSubsequentMeta?.forCollection);
                    const branch = forCol ? (evictionSubsequentMeta?.branch ?? null) : null;
                    Object.assign(persistPatch, {
                        eviction_voluntary_period_end_declared: false,
                        eviction_last_summons_for_collection: forCol,
                        eviction_last_collection_summons_branch: branch,
                    });
                }
            }

            setTimelineEvents((prev) => {
                const next = [newEvent, ...prev];
                persistExecutionMerge({
                    ...persistPatch,
                    timelineEvents: next,
                });
                return next;
            });

            if (!isMemoRegistration) {
                setDebtorSummonsMarkerLocal(markerPayload);
            } else {
                setDebtorSummonsMarkerLocal(null);
            }

            setNotificationPurpose('');
            setSummonsMarkerPopoverOpen(false);

            showToast(
                forceMemo
                    ? 'تم تسجيل إعادة التبليغ بمذكرة الإخبار بالتنفيذ'
                    : wasInitialNotice
                      ? 'تم تسجيل مذكرة الإخبار بالتنفيذ'
                      : 'تم تسجيل التبليغ',
                'success',
            );
        },
        [
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            activeDebtorNoticeScope.notificationDate,
            debtorNotificationDate,
            notificationPurpose,
            notificationCount,
            subsequentNoticeUnlocked,
            isEvictionExecutionModule,
            executionData,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            setDebtorNotificationDate,
            setLastActionDate,
            setActiveNoticeState,
            setNoticeVoluntaryPeriodEndOptimistic,
            setVoluntaryEndOptimistic,
            setNotificationCount,
            setTimelineEvents,
            setDebtorSummonsMarkerLocal,
            setNotificationPurpose,
            setSummonsMarkerPopoverOpen,
        ],
    );

    return { handleNotifyDebtor };
}
