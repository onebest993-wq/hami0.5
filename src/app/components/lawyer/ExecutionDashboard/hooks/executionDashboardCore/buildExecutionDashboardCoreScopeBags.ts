// @ts-nocheck
/** Phase C — تجميع حقائب chunk scope في مكان واحد */
import { buildExecutionDashboardFollowupScopeBag } from './buildExecutionDashboardFollowupScopeBag';
import { buildExecutionDashboardCoerciveScopeBag } from './buildExecutionDashboardCoerciveScopeBag';
import { buildExecutionDashboardDecisionsSeizureEvictionScopeBag } from './buildExecutionDashboardDecisionsSeizureEvictionScopeBag';
import { buildExecutionDashboardWorkspaceScopeBag } from './buildExecutionDashboardWorkspaceScopeBag';
import { buildExecutionDashboardTimelineDossierScopeBag } from './buildExecutionDashboardTimelineDossierScopeBag';
import { buildExecutionDashboardFinancialScopeBag } from './buildExecutionDashboardFinancialScopeBag';

export type ExecutionDashboardCoreScopeBagInput = Record<string, unknown>;

export type ExecutionDashboardCoreScopeBags = {
    followupScopeBag: Record<string, unknown>;
    coerciveScopeBag: Record<string, unknown>;
    decisionsSeizureEvictionScopeBag: Record<string, unknown>;
    workspaceScopeBag: Record<string, unknown>;
    timelineDossierScopeBag: Record<string, unknown>;
    financialScopeBag: Record<string, unknown>;
};

export function buildExecutionDashboardCoreScopeBags(
    input: ExecutionDashboardCoreScopeBagInput,
): ExecutionDashboardCoreScopeBags {
    return {
        followupScopeBag: buildExecutionDashboardFollowupScopeBag(input),
        coerciveScopeBag: buildExecutionDashboardCoerciveScopeBag(input),
        decisionsSeizureEvictionScopeBag: buildExecutionDashboardDecisionsSeizureEvictionScopeBag(input),
        workspaceScopeBag: buildExecutionDashboardWorkspaceScopeBag(input),
        timelineDossierScopeBag: buildExecutionDashboardTimelineDossierScopeBag(input),
        financialScopeBag: buildExecutionDashboardFinancialScopeBag(input),
    };
}
