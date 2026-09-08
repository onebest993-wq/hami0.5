import './litigationAbortSingletons';

export const LITIGATION_TEARDOWN_EVENT = 'hami:litigation:teardown';

export type LitigationTeardownSurface =
    | 'litigation-shell'
    | 'smartfile-modal'
    | 'criminal-dashboard'
    | 'archive-portal'
    | 'newcase-root'
    | 'global';

export { unblockAllLitigationOverlayEscape } from './litigationEscapeStackImpl';

export function abortLitigationNetworkAllSafe(): void {
    if (typeof window === 'undefined') return;
    try {
        const winAny = window as unknown as Record<string, unknown>;
        const abortAll = winAny.__hamiLitAbortNetworkAll as (() => void) | undefined;
        if (typeof abortAll === 'function') {
            abortAll();
            return;
        }
        const keys = Object.getOwnPropertyNames(winAny).filter(
            (k) => k.startsWith('__hamiLitAbort') && k !== '__hamiLitAbortNetworkAll',
        );
        for (const k of keys) {
            const fn = winAny[k] as (() => void) | undefined;
            if (typeof fn === 'function') fn();
        }
    } catch {
        /* P3b stub — Task8 AbortController globals attach side-effect boot will activate */
    }
}
