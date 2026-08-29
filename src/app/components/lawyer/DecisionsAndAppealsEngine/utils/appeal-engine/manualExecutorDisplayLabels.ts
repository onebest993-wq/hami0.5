import type { Decision } from '../../types';
import {
    appealRelabelTimelineMessage,
    type AppealUiPerspective,
} from '../../appealUiLabels';
import { inferAppealMethodsUsed } from './appealMethodsInference';
import { isExecutorSideAwaitingAppealEntry } from './executorAppealEntryState';
import {
    isManualExecutorLedgerDecision,
    resolveExecutorDecisionStatusFlag,
} from './manualExecutorIdentity';

export function formatManualExecutorBeneficiaryLabel(
    beneficiary: Decision['manualExecutorBeneficiary'],
    perspective: AppealUiPerspective = 'creditor_agent'
): string {
    if (beneficiary === 'creditor') return 'لصالح الدائن';
    if (beneficiary === 'debtor') {
        return perspective === 'debtor_agent' ? 'لصالح موكّلنا' : 'لصالح المدين';
    }
    if (beneficiary === 'neutral') return 'غير محدد';
    return '';
}

/** أرشفة القرار — بعد اكتمال المنفذ وانتهاء مسار الطعن (أو التنازل عنه) */
export function canArchiveExecutorDecisionCard(
    hubRow: Decision,
    pipeline: Decision,
    opts: {
        hubTab: 'current' | 'previous';
        settled: boolean;
        appealLegallyFinal: boolean;
    }
): boolean {
    if (opts.hubTab !== 'previous') return false;
    if (!opts.settled) return false;
    if (hubRow.isArchived) return false;
    if (isManualExecutorLedgerDecision(hubRow)) {
        return resolveExecutorDecisionStatusFlag(hubRow) === 3;
    }
    if (isExecutorSideAwaitingAppealEntry(hubRow, pipeline)) return false;
    return (
        opts.appealLegallyFinal ||
        hubRow.noAppealChosen === true ||
        pipeline.noAppealChosen === true
    );
}

export function formatRegisteredAppealPathForDecision(
    row: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): string | null {
    const logs = Array.isArray(row.appealTimelineLogs) ? [...row.appealTimelineLogs] : [];
    logs.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const parts: string[] = [];
    for (const log of logs) {
        const raw = String(log.message || '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!raw) continue;
        const m =
            perspective === 'debtor_agent'
                ? appealRelabelTimelineMessage(raw, perspective)
                : raw;
        if (m) parts.push(m);
    }
    if (parts.length > 0) return parts.join(' ← ');
    const inf = inferAppealMethodsUsed(row);
    const fb: string[] = [];
    if (inf.tadhallum) fb.push('تظلم');
    if (inf.tamyeez) fb.push('تمييز');
    if (fb.length === 0) return null;
    return fb.join(' ← ');
}
