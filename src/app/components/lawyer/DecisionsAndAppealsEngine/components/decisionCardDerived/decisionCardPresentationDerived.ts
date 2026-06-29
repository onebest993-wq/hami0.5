// @ts-nocheck
import {
    formatCreditorPartyDeathSummaryAr,
    parseCreditorPartyDeathPayload,
} from '@/app/utils/creditorPartyDeathPersistence';
import {
    countActiveDebtorsInFile,
    resolveDebtorDisplayNameForKey,
} from '@/app/utils/coerciveDebtorScope';
import {
    cleanTitle,
    formatDateNumeric,
    EXECUTOR_QUEUE_REQUEST_KINDS,
    shouldShowDecisionHubBody,
    stripRedundantLeadingLinesFromHubBody,
} from '../../utils';
import type { Decision } from '../../types';
import type { DecisionsDispatcherHubProps } from '../../engine/decisionsEngineTypes';

export function deriveDecisionCardTitleClean(decision: Decision): string {
    const t = cleanTitle(decision.title);
    const idx = t.search(/[\u2014\-—]/);
    const base = idx > 4 ? t.slice(0, idx).trim() : t;
    return base.replace(/^طلب\s+/, '');
}

function readExecutionData(dispatcherHub?: DecisionsDispatcherHubProps) {
    return (dispatcherHub as { executionData?: unknown } | undefined)?.executionData;
}

export function deriveDecisionCardDebtorContext(
    decision: Decision,
    dispatcherHub?: DecisionsDispatcherHubProps,
): { debtorsCount: number; debtorName: string | null } {
    const debtorsCount = (() => {
        try {
            return countActiveDebtorsInFile(readExecutionData(dispatcherHub));
        } catch {
            return 0;
        }
    })();

    const primaryDebtorKeyForCard = (() => {
        try {
            const execData = readExecutionData(dispatcherHub) as {
                debtors?: Array<{ id?: string }>;
            } | null;
            const d0 = execData?.debtors?.[0];
            const id = d0?.id != null && String(d0.id).trim() !== '' ? String(d0.id) : 'primary_debtor';
            return id;
        } catch {
            return 'primary_debtor';
        }
    })();

    const debtorName = (() => {
        try {
            const execData = readExecutionData(dispatcherHub) as {
                debtors?: Array<{ name?: string }>;
                debtorList?: Array<{ name?: string }>;
            } | null;
            if (!execData) return null;
            const scopedKey = String(
                (decision as { personalCoerciveDebtorKey?: string }).personalCoerciveDebtorKey ?? '',
            ).trim();
            if (scopedKey) {
                return resolveDebtorDisplayNameForKey(execData, scopedKey, primaryDebtorKeyForCard);
            }
            const debtors = execData.debtors ?? execData.debtorList ?? [];
            if (Array.isArray(debtors) && debtors.length > 0) {
                const name = debtors[0]?.name;
                if (name && typeof name === 'string' && name.trim()) return name.trim();
            }
            return null;
        } catch {
            return null;
        }
    })();

    return { debtorsCount, debtorName };
}

export function deriveDecisionCardHubBodyText(decision: Decision, titleClean: string): string {
    const requestKind = String(decision.requestKind || '').trim();
    const outcome = String(decision.executorOutcome ?? '').trim();
    if (
        requestKind &&
        (!outcome || outcome === 'pending')
    ) {
        return '';
    }

    const hubBodyResolved =
        decision.requestKind === 'creditor_party_death'
            ? (() => {
                  const json =
                      String(decision.creditorPartyDeathPayloadJson || '').trim() ||
                      String(decision.body || '');
                  const p = parseCreditorPartyDeathPayload(json);
                  return p ? formatCreditorPartyDeathSummaryAr(p) : String(decision.body ?? '');
              })()
            : String(decision.body ?? '');

    if (
        requestKind &&
        EXECUTOR_QUEUE_REQUEST_KINDS.includes(
            requestKind as (typeof EXECUTOR_QUEUE_REQUEST_KINDS)[number],
        ) &&
        requestKind !== 'creditor_party_death' &&
        outcome &&
        outcome !== 'pending'
    ) {
        return '';
    }

    const hubBodyTrimmed = stripRedundantLeadingLinesFromHubBody(titleClean, hubBodyResolved);
    const hubBodyTextFull = shouldShowDecisionHubBody(titleClean, hubBodyTrimmed) ? hubBodyTrimmed : '';
    const t = hubBodyTextFull;
    if (!t) return '';
    const withoutDate = t.replace(/^بتاريخ\s+\d{4}[\/-]\d{2}[\/-]\d{2}:\s*/, '');
    const idx = withoutDate.search(/[.—]/);
    const cleaned = idx > 10 ? withoutDate.slice(0, idx).trim() : withoutDate;
    return cleaned.replace(/^بتاريخ\s+\d{4}[\/-]\d{2}[\/-]\d{2}:\s*/, '');
}

export function deriveDecisionCardPresentation(
    decision: Decision,
    dispatcherHub?: DecisionsDispatcherHubProps,
) {
    const titleClean = deriveDecisionCardTitleClean(decision);
    const { debtorsCount, debtorName } = deriveDecisionCardDebtorContext(decision, dispatcherHub);
    const hubBodyText = deriveDecisionCardHubBodyText(decision, titleClean);
    const dateStr = formatDateNumeric(decision.date);

    return { titleClean, debtorsCount, debtorName, hubBodyText, dateStr };
}
