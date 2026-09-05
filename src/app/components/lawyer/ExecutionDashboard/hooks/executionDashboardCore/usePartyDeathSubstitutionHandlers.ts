import { useCallback, useRef, type MutableRefObject } from 'react';
import type { Creditor, Debtor, ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    appendCreditorPartyDeathRequest,
    appendDebtorHeirSubstitutionRequest,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isHeirSubstitutionAllowedForClaim } from '@/app/utils/partyDeathClaimPolicy';

type SubstitutionToast = (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
    opts?: { decisionsLink?: boolean },
) => void;

export type UsePartyDeathSubstitutionHandlersParams = {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined> | null | undefined;
    executionData: ExecutionFile | null | undefined;
    claimType: string | undefined;
    creditors: Creditor[] | undefined;
    debtors: Debtor[] | undefined;
    decisionsStorageExecutionId: string;
    lastHeirSubRequestAtRef:
        | MutableRefObject<{ debtor: number; creditor: number }>
        | null
        | undefined;
    debtorSubstitutionRequestStatus: string | null | undefined;
    creditorSubstitutionRequestStatus: string | null | undefined;
    nextTimelineId: (() => string) | null | undefined;
    persistExecutionMerge: ((patch: Record<string, unknown>) => boolean | void) | null | undefined;
    showToast: SubstitutionToast | null | undefined;
    setTimelineEvents:
        | ((update: (prev: TimelineEvent[]) => TimelineEvent[]) => void)
        | null
        | undefined;
};

function readLiveFile(cur: UsePartyDeathSubstitutionHandlersParams): ExecutionFile | null | undefined {
    return cur.executionDataRef?.current ?? cur.executionData ?? null;
}

function safeToast(
    cur: UsePartyDeathSubstitutionHandlersParams,
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
    opts?: { decisionsLink?: boolean },
): void {
    if (typeof cur.showToast === 'function') {
        cur.showToast(message, type, opts);
    }
}

function ensureReadyTools(cur: UsePartyDeathSubstitutionHandlersParams): boolean {
    if (typeof cur.nextTimelineId !== 'function') {
        safeToast(cur, 'تعذّر إرسال طلب الإحلال — أداة التسلسل غير جاهزة.', 'warning');
        return false;
    }
    if (typeof cur.setTimelineEvents !== 'function' || typeof cur.persistExecutionMerge !== 'function') {
        safeToast(cur, 'تعذّر إرسال طلب الإحلال — أداة الحفظ غير جاهزة.', 'warning');
        return false;
    }
    return true;
}

function touchThrottle(
    ref: UsePartyDeathSubstitutionHandlersParams['lastHeirSubRequestAtRef'],
    side: 'debtor' | 'creditor',
    nowMs: number,
): boolean {
    const bag = ref?.current;
    if (!bag || typeof bag !== 'object') return true;
    if (nowMs - Number(bag[side] || 0) < 1200) return false;
    bag[side] = nowMs;
    return true;
}

export function usePartyDeathSubstitutionHandlers(p: UsePartyDeathSubstitutionHandlersParams) {
    const liveP = useRef(p);
    liveP.current = p;

    const handleRequestDebtorSubstitution = useCallback((): boolean => {
        try {
            const cur = liveP.current;
            if (!isHeirSubstitutionAllowedForClaim(readLiveFile(cur), cur.claimType)) {
                safeToast(cur, 'لا يوجد مسار إحلال ورثة لهذا النوع من المطالبة.', 'info');
                return false;
            }
            if (cur.debtorSubstitutionRequestStatus === 'pending') {
                safeToast(cur, 'الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
                return false;
            }
            const nowMs = Date.now();
            if (!touchThrottle(cur.lastHeirSubRequestAtRef, 'debtor', nowMs)) {
                safeToast(cur, 'تم تجاهل النقر المتكرر. انتظر لحظة ثم أعد المحاولة.', 'info');
                return false;
            }
            if (!ensureReadyTools(cur)) return false;

            const live = readLiveFile(cur);
            const debtorName = String(
                live?.debtors?.[0]?.name ?? cur.debtors?.[0]?.name ?? '',
            ).trim();
            const req = appendDebtorHeirSubstitutionRequest({
                executionId: cur.decisionsStorageExecutionId,
                debtorNameSnapshot: debtorName,
            });
            if (!req.ok) {
                safeToast(cur, 'يوجد طلب إحلال مدين قيد البت لدى المنفذ.', 'warning');
                return false;
            }
            const now = new Date().toISOString();
            const te: TimelineEvent = {
                id: cur.nextTimelineId!(),
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
            cur.setTimelineEvents!((prev) => {
                const next = [te, ...prev];
                // لا تستدعِ persist داخل updater — يحدّث الأب أثناء render ويُطلق تحذير React
                queueMicrotask(() => {
                    void cur.persistExecutionMerge?.({ timelineEvents: next });
                });
                return next;
            });
            safeToast(cur, 'تم إرسال طلب إحلال المدين إلى قرارات المنفذ.', 'success', {
                decisionsLink: true,
            });
            return true;
        } catch {
            safeToast(liveP.current, 'تعذّر إرسال طلب إحلال المدين. أعد المحاولة.', 'error');
            return false;
        }
    }, []);

    const handleRequestCreditorSubstitution = useCallback((): boolean => {
        try {
            const cur = liveP.current;
            if (!isHeirSubstitutionAllowedForClaim(readLiveFile(cur), cur.claimType)) {
                safeToast(cur, 'لا يوجد مسار إحلال ورثة لهذا النوع من المطالبة.', 'info');
                return false;
            }
            if (cur.creditorSubstitutionRequestStatus === 'pending') {
                safeToast(cur, 'الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
                return false;
            }
            const nowMs = Date.now();
            if (!touchThrottle(cur.lastHeirSubRequestAtRef, 'creditor', nowMs)) {
                safeToast(cur, 'تم تجاهل النقر المتكرر. انتظر لحظة ثم أعد المحاولة.', 'info');
                return false;
            }
            if (!ensureReadyTools(cur)) return false;

            const live = readLiveFile(cur);
            const creditorName = String(
                live?.creditors?.[0]?.name ?? cur.creditors?.[0]?.name ?? '',
            ).trim();
            const req = appendCreditorPartyDeathRequest({
                executionId: cur.decisionsStorageExecutionId,
                action: 'heir_substitution',
                creditorNameSnapshot: creditorName,
                heirNames: [],
            });
            if (!req.ok) {
                safeToast(cur, 'يوجد طلب إحلال ورثة للدائن قيد البت لدى المنفذ.', 'warning');
                return false;
            }
            const now = new Date().toISOString();
            const te: TimelineEvent = {
                id: cur.nextTimelineId!(),
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
            cur.setTimelineEvents!((prev) => {
                const next = [te, ...prev];
                queueMicrotask(() => {
                    void cur.persistExecutionMerge?.({ timelineEvents: next });
                });
                return next;
            });
            safeToast(cur, 'تم إرسال طلب إحلال ورثة الدائن إلى قرارات المنفذ.', 'success', {
                decisionsLink: true,
            });
            return true;
        } catch {
            safeToast(liveP.current, 'تعذّر إرسال طلب إحلال الدائن. أعد المحاولة.', 'error');
            return false;
        }
    }, []);

    return { handleRequestDebtorSubstitution, handleRequestCreditorSubstitution };
}
