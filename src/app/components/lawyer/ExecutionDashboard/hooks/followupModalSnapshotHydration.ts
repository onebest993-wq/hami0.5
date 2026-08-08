import type { FollowupModalSnapshot } from '../followupModalContext';
import { isExecutionHandlerStubLeaf } from './executionHandlerClusterStubs';

/** يكتشف انتقال معالج من stub إلى حي — لا يُجمّد snapshot المحضر على stubs */
export function hasFollowupModalStubHandlerUpgrade(
    prev: FollowupModalSnapshot,
    next: FollowupModalSnapshot,
): boolean {
    const prevBag = prev as Record<string, unknown>;
    const nextBag = next as Record<string, unknown>;
    const keys = new Set([...Object.keys(prevBag), ...Object.keys(nextBag)]);
    for (const key of keys) {
        const prevValue = prevBag[key];
        const nextValue = nextBag[key];
        if (
            isExecutionHandlerStubLeaf(prevValue) &&
            typeof nextValue === 'function' &&
            !isExecutionHandlerStubLeaf(nextValue)
        ) {
            return true;
        }
        if (
            typeof prevValue === 'function' &&
            typeof nextValue === 'function' &&
            prevValue !== nextValue &&
            (isExecutionHandlerStubLeaf(prevValue) || isExecutionHandlerStubLeaf(nextValue))
        ) {
            return true;
        }
    }
    return false;
}
