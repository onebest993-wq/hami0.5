/**
 * Domain isolation — decision visibility / filter for decisions center.
 */
import { canPersistExecutorRequestKind } from './executionDomainIsolationGates';
import {
    isCommunicationJournalTitle,
    type ExecutionDomainContext,
    type ExecutorRequestKind,
} from './executionDomainIsolationTypes';

function isDebtorAgentCreditorMirrorRow(row: Record<string, unknown>): boolean {
    const payload = String(row.payloadJson || '').trim();
    if (payload.includes('debtor_agent_creditor_mirror')) return true;
    const blob = `${String(row.title || '')} ${String(row.body || '')}`;
    return /طرف\s*آخر\s*—\s*قيد\s*البت|تحرك\s*الطرف\s*الآخر/i.test(blob);
}

function isDecisionAppealPipelineActive(row: Record<string, unknown>): boolean {
    if (row.appealSourceDecisionId) return true;
    if (row.appealStatus === 'tadhallum_filed' || row.appealStatus === 'tamyeez_filed') return true;
    if (row.appealPhase === 'grievance' || row.appealPhase === 'cassation') return true;
    if (row.awaitingCassationEntryBy === 'lawyer' || row.awaitingCassationEntryBy === 'debtor') return true;
    return false;
}

function isDecisionAllowedForPerspective(
    ctx: ExecutionDomainContext,
    row: Record<string, unknown>,
): boolean {
    if (ctx.perspective === 'creditor_agent') return true;

    if (isDebtorAgentCreditorMirrorRow(row)) return true;
    const origin = String(row.appealRequestOrigin || '').trim();
    if (origin === 'executor_side' || row.manualExecutorLedgerEntry === true) return true;
    if (origin === 'debtor_side') return true;
    if (origin === 'creditor_side' && String(row.requestKind || '').trim()) return false;
    return true;
}

/** هل يُسمح بعرض القرار/الطلب في مركز القرارات لهذا السياق؟ */
export function isDecisionVisibleInDomainContext(
    ctx: ExecutionDomainContext,
    row: Record<string, unknown>,
): boolean {
    const requestKind = String(row.requestKind || '').trim();
    if (requestKind === 'eviction_procedure') {
        const gate = canPersistExecutorRequestKind(ctx, requestKind, {
            decisionTitle: String(row.title || ''),
            payloadJson: String(row.payloadJson || ''),
        });
        if (gate.allowed) {
            return true;
        }
    }

    const taggedNamespace = String((row as { domainNamespace?: string }).domainNamespace || '').trim();
    if (taggedNamespace) {
        return isDecisionAllowedForPerspective(ctx, row);
    }

    if (row.manualExecutorLedgerEntry === true || row.appealRequestOrigin === 'executor_side') {
        return isDecisionAllowedForPerspective(ctx, row);
    }

    if (requestKind) {
        if (requestKind === 'special_followup') {
            const title = String(row.title || '').trim();
            if (
                isCommunicationJournalTitle(title) ||
                /تحرك\s*الطرف\s*الآخر/i.test(title) ||
                String(row.appealRequestOrigin || '').trim() === 'debtor_side'
            ) {
                return isDecisionAllowedForPerspective(ctx, row);
            }
        }
        const gate = canPersistExecutorRequestKind(ctx, requestKind as ExecutorRequestKind, {
            personalCoerciveSubtype: String(row.personalCoerciveSubtype || ''),
            decisionTitle: String(row.title || ''),
            payloadJson: String(row.payloadJson || ''),
        });
        if (!gate.allowed) {
            return false;
        }
    }

    return isDecisionAllowedForPerspective(ctx, row);
}

export function filterDecisionsForDomainContext<T extends Record<string, unknown>>(
    ctx: ExecutionDomainContext,
    decisions: T[],
): T[] {
    const hubVisibleIds = new Set<string>();
    for (const row of decisions) {
        if (row.appealSourceDecisionId) continue;
        if (isDecisionVisibleInDomainContext(ctx, row)) {
            const id = String(row.id || '').trim();
            if (id) hubVisibleIds.add(id);
        }
    }

    return decisions.filter((row) => {
        const sourceId = String(row.appealSourceDecisionId || '').trim();
        if (sourceId) {
            return hubVisibleIds.has(sourceId) || isDecisionAppealPipelineActive(row);
        }
        return isDecisionVisibleInDomainContext(ctx, row);
    });
}
