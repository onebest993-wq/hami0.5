import { pickKeysFromRuntimeBag } from './pickKeysFromRuntimeBag';
import { CORE_RUNTIME_VAR_KEYS } from './executionDashboardCoreRuntimeVarKeys.generated';

export function buildExecutionDashboardCoreRuntimeVars<T extends object>(sources: T): T {
    return pickKeysFromRuntimeBag(sources, CORE_RUNTIME_VAR_KEYS);
}
