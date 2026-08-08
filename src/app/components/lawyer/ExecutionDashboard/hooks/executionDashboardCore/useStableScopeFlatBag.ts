import { useRef } from 'react';
import {
    EXECUTION_LAZY_SYNC_DRAFT_CHURN_KEYS,
    hasSelectedScopeDeltaForLazySync,
} from './executionScopeLazySyncDelta';

function hasDraftChurnScopeDelta(
    current: Record<string, unknown>,
    next: Record<string, unknown>,
): boolean {
    for (const key of EXECUTION_LAZY_SYNC_DRAFT_CHURN_KEYS) {
        if (!Object.is(current[key], next[key])) return true;
    }
    return false;
}

/**
 * يثبّت مرجع كيس scope مسطّح — يمنع إعادة بناء base scope عند كل render
 * عندما يتغيّر مرجع coreRuntimeVars دون دلتا فعلية في القيم.
 * مسودات النماذج (noteTitle/body/appointment) تُقارن صراحةً — لا تُتجاهل هنا.
 */
export function useStableScopeFlatBag(next: Record<string, unknown>): Record<string, unknown> {
    const stableRef = useRef(next);
    if (
        hasSelectedScopeDeltaForLazySync(stableRef.current, next) ||
        hasDraftChurnScopeDelta(stableRef.current, next)
    ) {
        stableRef.current = next;
    }
    return stableRef.current;
}
