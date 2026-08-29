import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import { appendSpecialFollowupRequest } from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { normalizeHeirWorkflowKey, type UpsertHeirWorkflowFn } from './heirsWorkflowUpsert';

export function useHeirsSummonsHandlers(p: {
    heirNoticeDateDrafts: Record<string, string>;
    heirsWorkflowByHeir: Record<string, { summonDate?: string | null } | undefined>;
    decisionsStorageExecutionId: string | undefined;
    nextTimelineId: () => string;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    upsertHeirWorkflow: UpsertHeirWorkflowFn;
    setHeirSummonsDatePickerOpenByHeir: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
    const issueHeirSummons = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const ymd = p.heirNoticeDateDrafts[key] || '';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
                p.showToast('حدد تاريخ التكليف لهذا الوريث أولاً.', 'warning');
                return;
            }
            p.upsertHeirWorkflow(
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
                    id: p.nextTimelineId(),
                    date: ymd,
                    timestamp: new Date().toISOString(),
                    title: `📨 تكليف بالحضور — ${heirName}`,
                    description: `تم تسجيل تكليف بالحضور للوريث ${heirName}. تاريخ التبليغ الفعلي: ${ymd}.`,
                    type: 'notification',
                    source: 'مركز تبليغ الورثة',
                },
            );
            p.setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [
            p.heirNoticeDateDrafts,
            p.nextTimelineId,
            p.showToast,
            p.upsertHeirWorkflow,
            p.setHeirSummonsDatePickerOpenByHeir,
        ],
    );

    const requestHeirInvestigationCourt = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const row = p.heirsWorkflowByHeir[key];
            const refDate = row?.summonDate || getLocalTodayYmd();
            const decisionId = appendSpecialFollowupRequest({
                executionId: p.decisionsStorageExecutionId,
                requestDate: refDate,
                content: `مفاتحة محكمة التحقيق بحق الوريث ${heirName} بعد انتهاء مدة التكليف بالحضور.`,
            });
            if (!decisionId) {
                p.showToast('تعذر تحويل طلب مفاتحة التحقيق إلى مركز القرارات.', 'warning');
                return;
            }
            p.upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonStatus: 'expired',
                    investigationRequestStatus: 'requested',
                    investigationDecisionStatus: 'pending',
                    investigationDecisionId: decisionId,
                }),
                {
                    id: p.nextTimelineId(),
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
            p.showToast('تم تحويل الطلب إلى قسم القرارات.', 'success', { decisionsLink: true });
        },
        [
            p.heirsWorkflowByHeir,
            p.decisionsStorageExecutionId,
            p.nextTimelineId,
            p.showToast,
            p.upsertHeirWorkflow,
        ],
    );

    const markHeirAttendedAfterInvestigation = useCallback(
        (heirName: string) => {
            p.upsertHeirWorkflow(
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
                    id: p.nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ حضور الوريث بعد مفاتحة التحقيق — ${heirName}`,
                    description: `سُجل حضور الوريث ${heirName} وتمت إعادة فتح دورة التكليف بالحضور له بشكل مستقل.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                },
            );
        },
        [p.nextTimelineId, p.upsertHeirWorkflow],
    );

    const issueHeirArrestWarrant = useCallback(
        (heirName: string) => {
            p.upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, arrestWarrantStatus: 'issued' }),
                {
                    id: p.nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `🚨 صدور مذكرة قبض — ${heirName}`,
                    description: `تم تسجيل صدور مذكرة قبض بحق الوريث ${heirName}.`,
                    type: 'coercive',
                    source: 'مركز تبليغ الورثة',
                },
            );
        },
        [p.nextTimelineId, p.upsertHeirWorkflow],
    );

    const markHeirSummonsAttended = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            p.upsertHeirWorkflow(
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
                    id: p.nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ حضور الوريث بعد التكليف — ${heirName}`,
                    description: `تم تسجيل حضور الوريث ${heirName} ضمن مرحلة التكليف بالحضور.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                },
            );
            p.setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [p.nextTimelineId, p.upsertHeirWorkflow, p.setHeirSummonsDatePickerOpenByHeir],
    );

    const markHeirSummonsPeriodEnded = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            p.upsertHeirWorkflow(
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
                    id: p.nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `⏱️ إنهاء مدة التكليف — ${heirName}`,
                    description: `تم إنهاء مدة التكليف بالحضور للوريث ${heirName} وإغلاق هذا التكليف.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                },
            );
            p.setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [p.nextTimelineId, p.upsertHeirWorkflow, p.setHeirSummonsDatePickerOpenByHeir],
    );

    return {
        issueHeirSummons,
        requestHeirInvestigationCourt,
        markHeirAttendedAfterInvestigation,
        issueHeirArrestWarrant,
        markHeirSummonsAttended,
        markHeirSummonsPeriodEnded,
    };
}
