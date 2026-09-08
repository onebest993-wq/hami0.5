import './executionNetworkAbort';

export const EXECUTION_TEARDOWN_EVENT = 'hami:execution:teardown';

export type ExecutionTeardownSurface =
    | 'execution-shell'
    | 'execution-creation'
    | 'execution-dashboard'
    | 'execution-seizure'
    | 'execution-financial'
    | 'execution-summons'
    | 'execution-archive'
    | 'execution-followup'
    | 'global';

export { unblockAllExecutionOverlayEscape } from './executionEscapeStack';

export function abortExecutionNetworkAllSafe(): void {
    if (typeof window === 'undefined') return;
    try {
        const winAny = window as unknown as Record<string, unknown>;
        const abortAll = winAny.__hamiExecAbortNetworkAll as (() => void) | undefined;
        if (typeof abortAll === 'function') {
            abortAll();
            return;
        }
        const keys = Object.getOwnPropertyNames(winAny).filter(
            (k) => k.startsWith('__hamiExecAbort') && k !== '__hamiExecAbortNetworkAll',
        );
        for (const k of keys) {
            const fn = winAny[k] as (() => void) | undefined;
            if (typeof fn === 'function') fn();
        }
    } catch {
        /* P3b stub — Task8 AbortController globals attach side-effect boot will activate */
    }
}
