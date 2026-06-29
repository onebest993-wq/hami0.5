// @ts-nocheck
import { pickKeysFromRuntimeBag } from './pickKeysFromRuntimeBag';
import { CORE_RUNTIME_VAR_KEYS } from './executionDashboardCoreRuntimeVarKeys.generated';

export function buildExecutionDashboardCoreRuntimeVars(sources: Record<string, unknown>) {
    return pickKeysFromRuntimeBag(sources, CORE_RUNTIME_VAR_KEYS);
}
