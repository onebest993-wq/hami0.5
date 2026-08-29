import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { normalizeHeirWorkflowKey, type UpsertHeirWorkflowFn } from './heirsWorkflowUpsert';

export function useHeirsMemoHandlers(p: {
    activeDebtorIsDeceased: boolean;
    activeDebtorHeirsForNotification: string[];
    heirNoticeDateDrafts: Record<string, string>;
    nextTimelineId: () => string;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    upsertHeirWorkflow: UpsertHeirWorkflowFn;
    setHeirNoticeDateDrafts: Dispatch<SetStateAction<Record<string, string>>>;
    setHeirSummonsDatePickerOpenByHeir: Dispatch<SetStateAction<Record<string, boolean>>>;
    setShowHeirsNotificationModal: (open: boolean) => void;
}) {
    const openHeirsNotificationCenter = useCallback(() => {
        if (!p.activeDebtorIsDeceased || p.activeDebtorHeirsForNotification.length === 0) return;
        const seeded: Record<string, string> = {};
        p.activeDebtorHeirsForNotification.forEach((h) => {
            const key = normalizeHeirWorkflowKey(h);
            if (!key) return;
            seeded[key] = '';
        });
        p.setHeirNoticeDateDrafts(seeded);
        p.setHeirSummonsDatePickerOpenByHeir({});
        p.setShowHeirsNotificationModal(true);
    }, [
        p.activeDebtorIsDeceased,
        p.activeDebtorHeirsForNotification,
        p.setHeirNoticeDateDrafts,
        p.setHeirSummonsDatePickerOpenByHeir,
        p.setShowHeirsNotificationModal,
    ]);

    const issueHeirMemoNotice = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const ymd = p.heirNoticeDateDrafts[key] || '';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
                p.showToast('حدد تاريخ التبليغ لهذا الوريث أولاً.', 'warning');
                return;
            }
            p.upsertHeirWorkflow(
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
                    id: p.nextTimelineId(),
                    date: ymd,
                    timestamp: new Date().toISOString(),
                    title: `📋 مذكرة إخبار بالتنفيذ — ${heirName}`,
                    description: `تم إصدار مذكرة الإخبار بالتنفيذ للوريث ${heirName}. تاريخ التبليغ الفعلي: ${ymd}.`,
                    type: 'notification',
                    source: 'مركز تبليغ الورثة',
                },
            );
            p.showToast(`تم إصدار مذكرة الإخبار للوريث ${heirName}`, 'success');
        },
        [p.heirNoticeDateDrafts, p.nextTimelineId, p.showToast, p.upsertHeirWorkflow],
    );

    const markHeirMemoAttended = useCallback(
        (heirName: string) => {
            p.upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, memoStatus: 'attended' }),
                {
                    id: p.nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ تم حضور الوريث — ${heirName}`,
                    description: `سُجّل حضور الوريث ${heirName} ضمن مرحلة مذكرة الإخبار.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                },
            );
        },
        [p.nextTimelineId, p.upsertHeirWorkflow],
    );

    const closeHeirMemoManually = useCallback(
        (heirName: string) => {
            p.upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, memoStatus: 'closed_manual' }),
                {
                    id: p.nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `⏳ إنهاء مدة مذكرة الإخبار يدوياً — ${heirName}`,
                    description: `انتهت مدة السبعة أيام وتم إنهاء تبليغ مذكرة الإخبار للوريث ${heirName} يدوياً.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                },
            );
        },
        [p.nextTimelineId, p.upsertHeirWorkflow],
    );

    return {
        openHeirsNotificationCenter,
        issueHeirMemoNotice,
        markHeirMemoAttended,
        closeHeirMemoManually,
    };
}
