/** Equality helpers for handler-cluster delta commits */
import { isExecutionHandlerStubLeaf } from './executionHandlerClusterStubs';
import {
    isPlainComparableObject as isPlainComparableObjectFromLazySync,
} from './executionDashboardCore/executionScopeLazySyncDelta';

export const isPlainComparableObject = isPlainComparableObjectFromLazySync;

export function areHandlerClusterValuesEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a === 'function' && typeof b === 'function') {
        // stub→real أو العكس يجب أن يُحسب دلتا — وإلا تتجمّد stubs في الـ scope
        if (isExecutionHandlerStubLeaf(a) || isExecutionHandlerStubLeaf(b)) {
            return false;
        }
        return true;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let index = 0; index < a.length; index += 1) {
            if (!areHandlerClusterValuesEqual(a[index], b[index])) return false;
        }
        return true;
    }
    if (isPlainComparableObject(a) && isPlainComparableObject(b)) {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (const key of aKeys) {
            if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
            if (!areHandlerClusterValuesEqual(a[key], b[key])) return false;
        }
        return true;
    }
    return false;
}

export function hasHandlerClusterDelta(
    current: Record<string, unknown>,
    next: Record<string, unknown>,
): boolean {
    if (current === next) return false;
    // نفس نمط lazy-sync: بدون Set مزدوج؛ Object.is أولاً
    const currentKeys = Object.keys(current);
    const nextKeys = Object.keys(next);
    if (currentKeys.length !== nextKeys.length) return true;
    for (const key of nextKeys) {
        if (!Object.prototype.hasOwnProperty.call(current, key)) return true;
        const currentValue = current[key];
        const nextValue = next[key];
        if (Object.is(currentValue, nextValue)) continue;
        if (typeof currentValue === 'function' && typeof nextValue === 'function') {
            if (isExecutionHandlerStubLeaf(currentValue) || isExecutionHandlerStubLeaf(nextValue)) {
                if (currentValue !== nextValue) return true;
            }
            continue;
        }
        if (!areHandlerClusterValuesEqual(currentValue, nextValue)) {
            return true;
        }
    }
    // مفاتيح زائدة في current فقط (طول متساوٍ لكن أسماء مختلفة)
    for (const key of currentKeys) {
        if (!Object.prototype.hasOwnProperty.call(next, key)) return true;
    }
    return false;
}

export function mergeDossierFollowupHandlers(
    current: Record<string, unknown>,
    next: Record<string, unknown>,
): Record<string, unknown> | undefined {
    const currentHandlers = current.dossierFollowupHandlers as Record<string, unknown> | undefined;
    const nextHandlers = next.dossierFollowupHandlers as Record<string, unknown> | undefined;
    if (currentHandlers == null && nextHandlers == null) {
        return currentHandlers;
    }
    return {
        ...currentHandlers,
        ...nextHandlers,
    };
}
