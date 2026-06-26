/** مزامنة قرارات الورثة + إعادة ضبط الجبر عند وفاة المدين — موجة 11 */
import type { ExecutionFile } from '@/app/types/execution';
import type { ExecutorDecisionRowLite } from './executionDashboardPersonalCoerciveDecisionSync';

export type HeirWorkflowRow = Record<string, unknown>;

export function mapExecutorOutcomeToHeirInvestigationStatus(
    outcome: string,
): 'approved' | 'rejected' | 'pending' {
    if (outcome === 'approved') return 'approved';
    if (outcome === 'rejected' || outcome === 'alternative') return 'rejected';
    return 'pending';
}

export function mergeHeirInvestigationDecisionStatuses(
    byHeir: Record<string, HeirWorkflowRow>,
    decisionRows: ExecutorDecisionRowLite[],
): Record<string, HeirWorkflowRow> | null {
    let changed = false;
    const nextByHeir: Record<string, HeirWorkflowRow> = { ...byHeir };

    for (const [k, v] of Object.entries(byHeir)) {
        const row = (v || {}) as HeirWorkflowRow;
        const decisionId = String(row.investigationDecisionId ?? '').trim();
        if (!decisionId) continue;

        const decision = decisionRows.find(
            (r) => String((r as { id?: unknown }).id ?? '') === decisionId,
        );
        const outcome = String(
            (decision as { executorOutcome?: unknown } | undefined)?.executorOutcome ?? 'pending',
        );
        const mapped = mapExecutorOutcomeToHeirInvestigationStatus(outcome);
        if (String(row.investigationDecisionStatus ?? 'none') !== mapped) {
            nextByHeir[k] = { ...row, investigationDecisionStatus: mapped };
            changed = true;
        }
    }

    return changed ? nextByHeir : null;
}

export function deceasedDebtorHasStaleCoerciveState(input: {
    activeCoerciveActionsLength: number;
    debtorArrested: boolean;
    investigationPathDebtorPresent: boolean;
    forcedBringInPersonalOutcome: unknown;
    forcedBringInPersonalFollowupLogged: boolean | undefined;
}): boolean {
    if (
        input.activeCoerciveActionsLength === 0 &&
        !input.debtorArrested &&
        !input.investigationPathDebtorPresent &&
        !input.forcedBringInPersonalOutcome &&
        !input.forcedBringInPersonalFollowupLogged
    ) {
        return false;
    }
    return true;
}

export function buildDeceasedDebtorCoerciveResetPatch(): Partial<ExecutionFile> {
    return {
        activeCoerciveActions: [],
        debtorArrested: false,
        investigationPathDebtorPresent: false,
        forced_bring_in_personal_outcome: null,
        forced_bring_in_personal_followup_logged: false,
    };
}

export function evictionLawyerFeeBackfillMarker(executionId: string): string {
    return `backfill_lawyer_fee_${executionId}`;
}

export function shouldBackfillEvictionLawyerFeeRequested(input: {
    isEvictionExecutionModule: boolean;
    executionId: string;
    alreadyRequested: boolean | undefined;
    hasApprovedPayout: boolean;
    sessionMarker: string | null;
}): boolean {
    if (!input.isEvictionExecutionModule) return false;
    if (!input.executionId || input.executionId === 'undefined') return false;
    if (input.alreadyRequested) return false;
    if (!input.hasApprovedPayout) return false;
    const marker = evictionLawyerFeeBackfillMarker(input.executionId);
    return input.sessionMarker !== marker;
}
