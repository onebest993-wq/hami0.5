// @ts-nocheck
/** Phase C Slice 17 — بناء حقائب chunk scope من fragments + rest */
import type { ExecutionDashboardCoreScopeBagInput } from './buildExecutionDashboardCoreScopeBags';
import { buildExecutionDashboardCoreScopeBags } from './buildExecutionDashboardCoreScopeBags';
import { groupExecutionDashboardCoreScopeBagInput } from './groupExecutionDashboardCoreScopeBagInput.generated';
import { mergeExecutionDashboardCoreScopeBagFragments } from './executionDashboardCoreScopeBagFragments';

export function buildExecutionDashboardCoreScopeBagsFromInput(
    input: ExecutionDashboardCoreScopeBagInput,
) {
    return buildExecutionDashboardCoreScopeBags(groupExecutionDashboardCoreScopeBagInput(input));
}

export function buildExecutionDashboardCoreScopeBagsFromFragments(
    ...fragments: Array<Partial<ExecutionDashboardCoreScopeBagInput>>
) {
    return buildExecutionDashboardCoreScopeBagsFromInput(
        mergeExecutionDashboardCoreScopeBagFragments(...fragments),
    );
}
