import type { TimelineEvent } from '@/app/types/execution';
import type { ThirdPartySeizure } from '@/app/types/execution';
import {
    creditThirdPartyFundsForExecution,
    creditThirdPartyFundsToTrustLedger,
    type ThirdPartyFundsTrustCreditResult,
} from '@/app/components/lawyer/ExecutionDashboard/utils/thirdPartySeizureFinancialUtils';
import type { UnifiedLedgerTotalParams } from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import { getExecutorDecisionRowById } from '@/app/utils/executorSeizureDecisionQueue';

export type ThirdPartyFundsReceivedPayload = {
    seizureId: string;
    thirdPartyName: string;
    amountIqd: number;
};

export function parseThirdPartyFundsReceivedPayload(row: unknown): ThirdPartyFundsReceivedPayload | null {
    const rawJson = String((row as { payloadJson?: string })?.payloadJson || '').trim();
    if (!rawJson) return null;
    try {
        const v = JSON.parse(rawJson) as Record<string, unknown>;
        const seizureId = String(v?.thirdPartySeizureId || '').trim();
        const thirdPartyName = String(v?.thirdPartyName || '').trim();
        const amountIqd = Math.max(0, Math.trunc(Number(v?.transferredAmountIqd || 0)));
        if (!seizureId || !Number.isFinite(amountIqd) || amountIqd <= 0) return null;
        return { seizureId, thirdPartyName, amountIqd };
    } catch {
        return null;
    }
}

export function resolveThirdPartyFundsReceivedPayload(
    decisionsExecutionId: string | undefined,
    decisionId: string
): ThirdPartyFundsReceivedPayload | null {
    const did = String(decisionId || '').trim();
    if (!did) return null;
    const row = getExecutorDecisionRowById(decisionsExecutionId, did);
    return parseThirdPartyFundsReceivedPayload(row);
}

export function markThirdPartySeizureFundsReceived(
    seizures: ThirdPartySeizure[],
    seizureId: string,
    amountIqd: number
): ThirdPartySeizure[] | null {
    const sid = String(seizureId || '').trim();
    if (!sid) return null;
    const hit = seizures.find((s) => String(s.id || '').trim() === sid) || null;
    if (!hit) return null;
    if (String(hit.status || '').trim() === 'funds_received') return null;
    return seizures.map((s) => {
        if (String(s.id || '').trim() !== sid) return s;
        const safeReply =
            String(s.replyStatus || '').trim() === 'pending' ? ('acknowledged' as const) : s.replyStatus;
        return {
            ...s,
            status: 'funds_received' as const,
            replyStatus: safeReply,
            transferredAmountIqd: amountIqd,
        };
    });
}

export function creditThirdPartySeizureFunds(
    executionId: string,
    input: {
        amountIqd: number;
        thirdPartySeizureId: string;
        thirdPartyName?: string;
        decisionRowId?: string;
        at?: string;
    },
    ledgerParams?: UnifiedLedgerTotalParams | null
): ThirdPartyFundsTrustCreditResult {
    const exId = String(executionId || '').trim();
    if (!exId) return { ok: false, amount: 0, created: false, updated: false };
    const at = String(input.at || new Date().toISOString());
    return ledgerParams
        ? creditThirdPartyFundsForExecution(
              exId,
              {
                  amountIqd: input.amountIqd,
                  thirdPartySeizureId: input.thirdPartySeizureId,
                  thirdPartyName: input.thirdPartyName,
                  decisionRowId: input.decisionRowId,
                  at,
              },
              ledgerParams
          )
        : creditThirdPartyFundsToTrustLedger({
              executionId: exId,
              amountIqd: input.amountIqd,
              thirdPartySeizureId: input.thirdPartySeizureId,
              thirdPartyName: input.thirdPartyName,
              decisionRowId: input.decisionRowId,
              at,
          });
}

export function buildThirdPartyFundsReceivedTimelineEvent(input: {
    decisionId: string;
    seizureId: string;
    thirdPartyName: string;
    amountIqd: number;
    trustCredit: ThirdPartyFundsTrustCreditResult;
    nowIso: string;
    nextTimelineId: () => string;
}): TimelineEvent {
    const title = '💰 استلام أموال محجوزة لدى الغير';
    const party = String(input.thirdPartyName || '').trim() || '—';
    const desc = `الجهة: ${party}\nالمبلغ الفعلي المحول: ${input.amountIqd.toLocaleString('ar-IQ')} د.ع.${
        input.trustCredit.ok
            ? `\n\nتم إيداع ${input.amountIqd.toLocaleString('ar-IQ')} د.ع في الأمانات — ويُخصم من المتبقي.`
            : ''
    }`;
    return {
        id: input.nextTimelineId(),
        date: input.nowIso.slice(0, 10),
        timestamp: input.nowIso,
        title,
        description: desc,
        type: 'payment',
        source: 'المركز المالي — حجز لدى الغير',
        metadata: {
            decisionRowId: input.decisionId,
            thirdPartySeizureId: input.seizureId,
            timelineThreadKey: `executor_decision:${input.decisionId}`,
            ...(input.trustCredit.paymentId ? { trustPaymentId: input.trustCredit.paymentId } : {}),
        },
    };
}

export type ThirdPartyFundsReceivedOutcomeDetail = {
    executionId?: string;
    requestKind?: string;
    outcome?: string;
    decisionId?: string;
};

export function shouldHandleThirdPartyFundsReceivedOutcome(
    detail: ThirdPartyFundsReceivedOutcomeDetail,
    myExecutionId: string,
    decisionsStorageExecutionId?: string
): boolean {
    const evId = String(detail.executionId ?? '');
    const myId = String(myExecutionId || '').trim();
    if (!myId) return false;
    if (evId !== myId && evId !== String(decisionsStorageExecutionId ?? '')) return false;
    if (String(detail.requestKind || '') !== 'third_party_funds_received') return false;
    if (String(detail.outcome || '') !== 'approved') return false;
    return Boolean(String(detail.decisionId || '').trim());
}
