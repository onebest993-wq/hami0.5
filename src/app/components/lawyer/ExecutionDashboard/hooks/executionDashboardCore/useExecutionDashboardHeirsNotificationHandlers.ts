// @ts-nocheck
/** Phase C — مركز تبليغ الورثة + مهلة التكليف */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { appendSpecialFollowupRequest } from '@/app/utils/executorSeizureDecisionQueue';
import {
    formatDateToLocalYmd,
    getLocalTodayYmd,
    parseLocalNotificationDate,
} from '@/app/utils/executionStateMachine';
import { useActiveDebtorHeirsForNotification } from '../useActiveDebtorHeirsForNotification';
import { useHeirsWorkflowByHeir } from '../useHeirsWorkflowByHeir';

export type UseExecutionDashboardHeirsNotificationHandlersParams = {
    executionData: ExecutionFile | null | undefined;
    debtorBrowserTabsMode: boolean;
    activeWorkspaceDebtorForFollowup: { d: { name?: string } } | null | undefined;
    activeDebtorIsDeceased: boolean;
    heirNoticeDateDrafts: Record<string, string>;
    decisionsStorageExecutionId: string | undefined;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setHeirNoticeDateDrafts: Dispatch<SetStateAction<Record<string, string>>>;
    setHeirSummonsDatePickerOpenByHeir: Dispatch<SetStateAction<Record<string, boolean>>>;
    setShowHeirsNotificationModal: (open: boolean) => void;
};

export function useExecutionDashboardHeirsNotificationHandlers({
    executionData,
    debtorBrowserTabsMode,
    activeWorkspaceDebtorForFollowup,
    activeDebtorIsDeceased,
    heirNoticeDateDrafts,
    decisionsStorageExecutionId,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    setHeirNoticeDateDrafts,
    setHeirSummonsDatePickerOpenByHeir,
    setShowHeirsNotificationModal,
}: UseExecutionDashboardHeirsNotificationHandlersParams) {
    const activeDebtorHeirsForNotification = useActiveDebtorHeirsForNotification(
        executionData,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
    );

    const normalizeHeirWorkflowKey = useCallback((name: string) => {
        const raw = String(name || '').trim();
        return raw
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\p{L}\p{N}\s]/gu, '');
    }, []);

    const heirsWorkflowByHeir = useHeirsWorkflowByHeir(
        executionData,
        activeDebtorHeirsForNotification,
        normalizeHeirWorkflowKey,
    );

    const upsertHeirWorkflow = useCallback(
        (
            heirName: string,
            updater: (prev: Record<string, unknown>) => Record<string, unknown>,
            timelineEvent?: TimelineEvent,
        ) => {
            const key = normalizeHeirWorkflowKey(heirName);
            if (!key) return;
            const prevAll = executionData?.heirs_notification_workflow?.byHeir || {};
            const prevOne = prevAll[key] || {
                heirName,
                memoStatus: 'none',
                summonStatus: 'none',
                investigationRequestStatus: 'none',
                investigationDecisionStatus: 'none',
                investigationDecisionId: null,
                arrestWarrantStatus: 'none',
            };
            const updatedOne = updater(prevOne);
            const updatedAll = {
                ...prevAll,
                [key]: {
                    ...updatedOne,
                    heirName,
                    lastActionAt: new Date().toISOString(),
                },
            };
            if (timelineEvent) {
                setTimelineEvents((prevTl) => {
                    const nextTl = [timelineEvent, ...prevTl];
                    persistExecutionMerge({
                        heirs_notification_workflow: {
                            hasReceivedInitialNotice: true,
                            byHeir: updatedAll,
                        },
                        timelineEvents: nextTl,
                    });
                    return nextTl;
                });
                return;
            }
            persistExecutionMerge({
                heirs_notification_workflow: {
                    hasReceivedInitialNotice: true,
                    byHeir: updatedAll,
                },
            });
        },
        [
            executionData?.heirs_notification_workflow?.byHeir,
            normalizeHeirWorkflowKey,
            persistExecutionMerge,
            setTimelineEvents,
        ],
    );

    const computeDeadlineYmd = useCallback((fromYmd: string, daysWindow: number) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd)) return '';
        const d = parseLocalNotificationDate(fromYmd);
        if (Number.isNaN(d.getTime())) return '';
        d.setDate(d.getDate() + daysWindow);
        return formatDateToLocalYmd(d);
    }, []);

    const computeDaysRemaining = useCallback((fromYmd: string, daysWindow: number) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd)) return null;
        const notif = parseLocalNotificationDate(fromYmd);
        if (Number.isNaN(notif.getTime())) return null;
        const startFromNextDay = new Date(notif);
        startFromNextDay.setDate(startFromNextDay.getDate() + 1);
        startFromNextDay.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.floor((today.getTime() - startFromNextDay.getTime()) / 86400000);
        const elapsed = diff >= 0 ? diff + 1 : 0;
        return Math.max(daysWindow - elapsed, 0);
    }, []);

    const openHeirsNotificationCenter = useCallback(() => {
        if (!activeDebtorIsDeceased || activeDebtorHeirsForNotification.length === 0) return;
        const seeded: Record<string, string> = {};
        activeDebtorHeirsForNotification.forEach((h) => {
            const key = normalizeHeirWorkflowKey(h);
            if (!key) return;
            seeded[key] = '';
        });
        setHeirNoticeDateDrafts(seeded);
        setHeirSummonsDatePickerOpenByHeir({});
        setShowHeirsNotificationModal(true);
    }, [
        activeDebtorIsDeceased,
        activeDebtorHeirsForNotification,
        normalizeHeirWorkflowKey,
        setHeirNoticeDateDrafts,
        setHeirSummonsDatePickerOpenByHeir,
        setShowHeirsNotificationModal,
    ]);

    const issueHeirMemoNotice = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const ymd = heirNoticeDateDrafts[key] || '';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
                showToast('حدد تاريخ التبليغ لهذا الوريث أولاً.', 'warning');
                return;
            }
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    memoDate: ymd,
                    memoStatus: 'active',
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: ymd,
                    timestamp: new Date().toISOString(),
                    title: `📋 مذكرة إخبار بالتنفيذ — ${heirName}`,
                    description: `تم إصدار مذكرة الإخبار بالتنفيذ للوريث ${heirName}. تاريخ التبليغ الفعلي: ${ymd}.`,
                    type: 'notification',
                    source: 'مركز تبليغ الورثة',
                },
            );
            showToast(`تم إصدار مذكرة الإخبار للوريث ${heirName}`, 'success');
        },
        [heirNoticeDateDrafts, normalizeHeirWorkflowKey, nextTimelineId, showToast, upsertHeirWorkflow],
    );

    const markHeirMemoAttended = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, memoStatus: 'attended' }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ تم حضور الوريث — ${heirName}`,
                    description: `سُجّل حضور الوريث ${heirName} ضمن مرحلة مذكرة الإخبار.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                },
            );
        },
        [nextTimelineId, upsertHeirWorkflow],
    );

    const closeHeirMemoManually = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, memoStatus: 'closed_manual' }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `⏳ إنهاء مدة مذكرة الإخبار يدوياً — ${heirName}`,
                    description: `انتهت مدة السبعة أيام وتم إنهاء تبليغ مذكرة الإخبار للوريث ${heirName} يدوياً.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                },
            );
        },
        [nextTimelineId, upsertHeirWorkflow],
    );

    const issueHeirSummons = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const ymd = heirNoticeDateDrafts[key] || '';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
                showToast('حدد تاريخ التكليف لهذا الوريث أولاً.', 'warning');
                return;
            }
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonDate: ymd,
                    summonStatus: 'active',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: ymd,
                    timestamp: new Date().toISOString(),
                    title: `📨 تكليف بالحضور — ${heirName}`,
                    description: `تم تسجيل تكليف بالحضور للوريث ${heirName}. تاريخ التبليغ الفعلي: ${ymd}.`,
                    type: 'notification',
                    source: 'مركز تبليغ الورثة',
                },
            );
            setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [
            heirNoticeDateDrafts,
            normalizeHeirWorkflowKey,
            nextTimelineId,
            showToast,
            upsertHeirWorkflow,
            setHeirSummonsDatePickerOpenByHeir,
        ],
    );

    const requestHeirInvestigationCourt = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const row = heirsWorkflowByHeir[key];
            const refDate = row?.summonDate || getLocalTodayYmd();
            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: refDate,
                content: `مفاتحة محكمة التحقيق بحق الوريث ${heirName} بعد انتهاء مدة التكليف بالحضور.`,
            });
            if (!decisionId) {
                showToast('تعذر تحويل طلب مفاتحة التحقيق إلى مركز القرارات.', 'warning');
                return;
            }
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonStatus: 'expired',
                    investigationRequestStatus: 'requested',
                    investigationDecisionStatus: 'pending',
                    investigationDecisionId: decisionId,
                }),
                {
                    id: nextTimelineId(),
                    date: refDate,
                    timestamp: new Date().toISOString(),
                    title: `⚖️ مفاتحة محكمة التحقيق — ${heirName}`,
                    description: `تم تحويل طلب مفاتحة محكمة التحقيق بحق الوريث ${heirName} إلى مركز القرارات.`,
                    type: 'coercive',
                    source: 'مركز تبليغ الورثة',
                    metadata: {
                        timelineThreadKey: `executor_decision:${decisionId}`,
                        decisionRowId: decisionId,
                    },
                },
            );
            showToast('تم تحويل الطلب إلى قسم القرارات.', 'success', { decisionsLink: true });
        },
        [
            heirsWorkflowByHeir,
            decisionsStorageExecutionId,
            normalizeHeirWorkflowKey,
            nextTimelineId,
            showToast,
            upsertHeirWorkflow,
        ],
    );

    const markHeirAttendedAfterInvestigation = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    memoDate: null,
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                    memoStatus: 'closed_manual',
                }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ حضور الوريث بعد مفاتحة التحقيق — ${heirName}`,
                    description: `سُجل حضور الوريث ${heirName} وتمت إعادة فتح دورة التكليف بالحضور له بشكل مستقل.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                },
            );
        },
        [nextTimelineId, upsertHeirWorkflow],
    );

    const issueHeirArrestWarrant = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, arrestWarrantStatus: 'issued' }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `🚨 صدور مذكرة قبض — ${heirName}`,
                    description: `تم تسجيل صدور مذكرة قبض بحق الوريث ${heirName}.`,
                    type: 'coercive',
                    source: 'مركز تبليغ الورثة',
                },
            );
        },
        [nextTimelineId, upsertHeirWorkflow],
    );

    const markHeirSummonsAttended = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ حضور الوريث بعد التكليف — ${heirName}`,
                    description: `تم تسجيل حضور الوريث ${heirName} ضمن مرحلة التكليف بالحضور.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                },
            );
            setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [nextTimelineId, normalizeHeirWorkflowKey, upsertHeirWorkflow, setHeirSummonsDatePickerOpenByHeir],
    );

    const markHeirSummonsPeriodEnded = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `⏱️ إنهاء مدة التكليف — ${heirName}`,
                    description: `تم إنهاء مدة التكليف بالحضور للوريث ${heirName} وإغلاق هذا التكليف.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                },
            );
            setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [nextTimelineId, normalizeHeirWorkflowKey, upsertHeirWorkflow, setHeirSummonsDatePickerOpenByHeir],
    );

    return {
        activeDebtorHeirsForNotification,
        heirsWorkflowByHeir,
        normalizeHeirWorkflowKey,
        computeDeadlineYmd,
        computeDaysRemaining,
        openHeirsNotificationCenter,
        issueHeirMemoNotice,
        markHeirMemoAttended,
        closeHeirMemoManually,
        issueHeirSummons,
        requestHeirInvestigationCourt,
        markHeirAttendedAfterInvestigation,
        issueHeirArrestWarrant,
        markHeirSummonsAttended,
        markHeirSummonsPeriodEnded,
    };
}
