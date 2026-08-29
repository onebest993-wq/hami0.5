/** Phase C Slice 27 — مفاتيح coreRuntimeVars (مُولَّد) */
import { CORE_RUNTIME_VAR_KEYS_HEAD } from './executionDashboardCoreRuntimeVarKeys.head';
import { CORE_RUNTIME_VAR_KEYS_TAIL } from './executionDashboardCoreRuntimeVarKeys.tail';

export const CORE_RUNTIME_VAR_KEYS = [
    ...CORE_RUNTIME_VAR_KEYS_HEAD,
    ...CORE_RUNTIME_VAR_KEYS_TAIL,
] as const;
