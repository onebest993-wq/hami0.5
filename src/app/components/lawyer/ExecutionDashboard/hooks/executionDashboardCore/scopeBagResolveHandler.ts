import {
    executionHandlerNotReadyFallback,
    isExecutionHandlerStubLeaf,
} from '../executionHandlerClusterStubs';

function readHandlerCandidate(source: unknown, key: string): unknown {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
    if (!Object.prototype.hasOwnProperty.call(source, key)) return undefined;
    return (source as Record<string, unknown>)[key];
}

/** يفضّل معالج حقيقي ثم stub ثم بديل «جاري تجهيز الأدوات» — يمنع undefined في onClick */
export function resolveScopeBagHandler(
    sources: readonly unknown[],
    key: string,
    fallbackPath: string,
): (...args: unknown[]) => unknown {
    for (const source of sources) {
        const candidate = readHandlerCandidate(source, key);
        if (typeof candidate === 'function' && !isExecutionHandlerStubLeaf(candidate)) {
            return candidate as (...args: unknown[]) => unknown;
        }
    }
    for (const source of sources) {
        const candidate = readHandlerCandidate(source, key);
        if (typeof candidate === 'function') {
            return candidate as (...args: unknown[]) => unknown;
        }
    }
    return executionHandlerNotReadyFallback(fallbackPath);
}
