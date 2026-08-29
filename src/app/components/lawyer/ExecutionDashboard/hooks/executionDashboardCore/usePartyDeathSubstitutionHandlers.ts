import { useCallback, type MutableRefObject } from 'react';
import type { Creditor, Debtor, ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    appendCreditorPartyDeathRequest,
    appendDebtorHeirSubstitutionRequest,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isHeirSubstitutionAllowedForClaim } from '@/app/utils/partyDeathClaimPolicy';

export function usePartyDeathSubstitutionHandlers(p: {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    executionData: ExecutionFile | null | undefined;
    claimType: string | undefined;
    creditors: Creditor[] | undefined;
    debtors: Debtor[] | undefined;
    decisionsStorageExecutionId: string;
    lastHeirSubRequestAtRef: MutableRefObject<{ debtor: number; creditor: number }>;
    debtorSubstitutionRequestStatus: string | null | undefined;
    creditorSubstitutionRequestStatus: string | null | undefined;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (
        message: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean },
    ) => void;
    setTimelineEvents: (update: (prev: TimelineEvent[]) => TimelineEvent[]) => void;
}) {
    const handleRequestDebtorSubstitution = useCallback((): boolean => {
        if (!isHeirSubstitutionAllowedForClaim(p.executionData, p.claimType)) {
            p.showToast('لا يوجد مسار إحلال ورثة لهذا النوع من المطالبة.', 'info');
            return false;
        }
        if (p.debtorSubstitutionRequestStatus === 'pending') {
            p.showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const nowMs = Date.now();
        if (nowMs - p.lastHeirSubRequestAtRef.current.debtor < 1200) {
            p.showToast('تم تجاهل النقر المتكرر. انتظر لحظة ثم أعد المحاولة.', 'info');
            return false;
        }
        p.lastHeirSubRequestAtRef.current.debtor = nowMs;
        const debtorName = String(
            p.executionDataRef.current?.debtors?.[0]?.name ?? p.debtors?.[0]?.name ?? '',
        ).trim();
        const req = appendDebtorHeirSubstitutionRequest({
            executionId: p.decisionsStorageExecutionId,
            debtorNameSnapshot: debtorName,
        });
        if (!req.ok) {
            p.showToast('يوجد طلب إحلال مدين قيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const now = new Date().toISOString();
        const te: TimelineEvent = {
            id: p.nextTimelineId(),
            date: now.slice(0, 10),
            timestamp: now,
            title: 'طلب — إحلال الورثة محل المدين المتوفى',
            description: `تم إرسال الطلب إلى «القرارات والطعون» بانتظار بتّ المنفذ.\nالمدين: ${debtorName || 'المدين'}.`,
            type: 'decision',
            source: 'بطاقة الخصوم',
            metadata: req.decisionId
                ? {
                      timelineThreadKey: `executor_decision:${req.decisionId}`,
                      decisionRowId: req.decisionId,
                  }
                : undefined,
        };
        p.setTimelineEvents((prev) => {
            const next = [te, ...prev];
            p.persistExecutionMerge({ timelineEvents: next });
            return next;
        });
        p.showToast('تم إرسال طلب إحلال المدين إلى قرارات المنفذ.', 'success', { decisionsLink: true });
        return true;
    }, [
        p.claimType,
        p.debtorSubstitutionRequestStatus,
        p.debtors,
        p.decisionsStorageExecutionId,
        p.executionData,
        p.executionDataRef,
        p.lastHeirSubRequestAtRef,
        p.nextTimelineId,
        p.persistExecutionMerge,
        p.showToast,
        p.setTimelineEvents,
    ]);

    const handleRequestCreditorSubstitution = useCallback((): boolean => {
        if (!isHeirSubstitutionAllowedForClaim(p.executionData, p.claimType)) {
            p.showToast('لا يوجد مسار إحلال ورثة لهذا النوع من المطالبة.', 'info');
            return false;
        }
        if (p.creditorSubstitutionRequestStatus === 'pending') {
            p.showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const nowMs = Date.now();
        if (nowMs - p.lastHeirSubRequestAtRef.current.creditor < 1200) {
            p.showToast('تم تجاهل النقر المتكرر. انتظر لحظة ثم أعد المحاولة.', 'info');
            return false;
        }
        p.lastHeirSubRequestAtRef.current.creditor = nowMs;
        const creditorName = String(p.creditors?.[0]?.name || '').trim();
        const req = appendCreditorPartyDeathRequest({
            executionId: p.decisionsStorageExecutionId,
            action: 'heir_substitution',
            creditorNameSnapshot: creditorName,
            heirNames: [],
        });
        if (!req.ok) {
            p.showToast('يوجد طلب إحلال ورثة للدائن قيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const now = new Date().toISOString();
        const te: TimelineEvent = {
            id: p.nextTimelineId(),
            date: now.slice(0, 10),
            timestamp: now,
            title: 'طلب — إحلال الورثة محل الدائن المتوفى',
            description: `تم إرسال الطلب إلى «القرارات والطعون» بانتظار بتّ المنفذ.\nالدائن: ${creditorName || 'الدائن'}.`,
            type: 'decision',
            source: 'بطاقة الخصوم',
            metadata: req.decisionId
                ? {
                      timelineThreadKey: `executor_decision:${req.decisionId}`,
                      decisionRowId: req.decisionId,
                  }
                : undefined,
        };
        p.setTimelineEvents((prev) => {
            const next = [te, ...prev];
            p.persistExecutionMerge({ timelineEvents: next });
            return next;
        });
        p.showToast('تم إرسال طلب إحلال ورثة الدائن إلى قرارات المنفذ.', 'success', { decisionsLink: true });
        return true;
    }, [
        p.claimType,
        p.creditorSubstitutionRequestStatus,
        p.creditors,
        p.decisionsStorageExecutionId,
        p.executionData,
        p.lastHeirSubRequestAtRef,
        p.nextTimelineId,
        p.persistExecutionMerge,
        p.showToast,
        p.setTimelineEvents,
    ]);

    return { handleRequestDebtorSubstitution, handleRequestCreditorSubstitution };
}
