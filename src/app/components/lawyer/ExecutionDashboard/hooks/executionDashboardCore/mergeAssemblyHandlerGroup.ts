import { isExecutionHandlerStubLeaf } from '../executionHandlerClusterStubs';

function asHandlerRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    if (isExecutionHandlerStubLeaf(value)) return undefined;
    return value as Record<string, unknown>;
}

/** دمج مجموعة معالجات من cluster + core — cluster يفضَّل عند وجوده */
export function mergeAssemblyHandlerGroup(
    clusterHandlers: Record<string, unknown>,
    coreHandlers: Record<string, unknown>,
    key: string,
): Record<string, unknown> | undefined {
    const cluster = asHandlerRecord(clusterHandlers[key]);
    const core = asHandlerRecord(coreHandlers[key]);
    if (!cluster && !core) return undefined;
    return { ...(core || {}), ...(cluster || {}) };
}
