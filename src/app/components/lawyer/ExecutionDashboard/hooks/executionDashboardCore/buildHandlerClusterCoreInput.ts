// @ts-nocheck
/** Phase C Slice 24 — تجميع handlerClusterCore من مفاتي معروفة */
import { HANDLER_CLUSTER_CORE_KEY_NAMES } from './collectHandlerClusterContext';

export function buildHandlerClusterCoreInput(p: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const key of HANDLER_CLUSTER_CORE_KEY_NAMES) {
        if (key in p) out[key] = p[key];
    }
    return out;
}
