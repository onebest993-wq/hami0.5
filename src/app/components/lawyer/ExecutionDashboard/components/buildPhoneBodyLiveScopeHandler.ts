import type { MutableRefObject } from 'react';
import {
    executionHandlerNotReadyFallback,
    isExecutionHandlerStubLeaf,
} from '../hooks/executionHandlerClusterStubs';

/** يستدعي المعالج من scopeRef الحيّ — يمنع شارات «لا تعمل» عند snapshot قديم */
export function buildPhoneBodyLiveScopeHandler(
    scopeRef: MutableRefObject<Record<string, unknown>> | undefined,
    fallbackSource: Record<string, unknown>,
    key: string,
): (...args: unknown[]) => unknown {
    return (...args: unknown[]) => {
        const live = scopeRef?.current ?? fallbackSource;
        const fn = live[key];
        if (typeof fn === 'function' && !isExecutionHandlerStubLeaf(fn)) return fn(...args);
        return executionHandlerNotReadyFallback(key)(...args);
    };
}

export function readPhoneBodyLiveScopeValue<T>(
    scopeRef: MutableRefObject<Record<string, unknown>> | undefined,
    fallbackSource: Record<string, unknown>,
    key: string,
    fallback: T,
): T {
    const live = scopeRef?.current ?? fallbackSource;
    const value = live[key];
    return value === undefined ? fallback : (value as T);
}
