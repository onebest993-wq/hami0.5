import './repositoryNetworkAbort';

export const REPOSITORY_TEARDOWN_EVENT = 'repository:teardown-floating-state';

export type RepositoryTeardownSurface =
    | 'repository-shell'
    | 'dossier-notes-vault'
    | 'vault-pdf-overlay'
    | 'repository-hub'
    | 'global';

export { unblockAllRepositoryOverlayEscape } from './repositoryEscapeStack';

export function abortRepositoryNetworkAllSafe(): void {
    if (typeof window === 'undefined') return;
    try {
        const winAny = window as unknown as Record<string, unknown>;
        const abortAll = winAny.__hamiRepoAbortNetworkAll as (() => void) | undefined;
        if (typeof abortAll === 'function') {
            abortAll();
            return;
        }
        const keys = Object.getOwnPropertyNames(winAny).filter(
            (k) => k.startsWith('__hamiRepoAbort') && k !== '__hamiRepoAbortNetworkAll',
        );
        for (const k of keys) {
            const fn = winAny[k] as (() => void) | undefined;
            if (typeof fn === 'function') fn();
        }
    } catch {
        /* P3b stub — Task8 AbortController globals attach side-effect boot will activate */
    }
}
