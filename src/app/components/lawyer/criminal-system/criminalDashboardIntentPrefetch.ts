import type { CriminalDashboardTab } from './criminalDashboardTabChrome';

/**
 * Lightweight intent wrappers.
 * Keep boot-path consumers away from the heavy lazy registry so Vite does not
 * attach all request-surface dynamic imports to the initial criminal runtime chunk.
 */
function loadCriminalDashboardPrefetchers() {
    return import('./criminalDashboardLazyRegistry');
}

export function prefetchCriminalDashboardTab(tab: CriminalDashboardTab): void {
    if (typeof window === 'undefined') return;
    void loadCriminalDashboardPrefetchers()
        .then((m) => m.prefetchCriminalDashboardTab(tab))
        .catch(() => undefined);
}

export function prefetchCriminalPartiesGrid(): void {
    if (typeof window === 'undefined') return;
    void loadCriminalDashboardPrefetchers()
        .then((m) => m.prefetchCriminalPartiesGrid())
        .catch(() => undefined);
}

export function prefetchCriminalRequestsDecisionSurfaces(): void {
    if (typeof window === 'undefined') return;
    void loadCriminalDashboardPrefetchers()
        .then((m) => m.prefetchCriminalRequestsDecisionSurfaces())
        .catch(() => undefined);
}

export function prefetchCriminalJudicialDecisionsLedger(): void {
    if (typeof window === 'undefined') return;
    void loadCriminalDashboardPrefetchers()
        .then((m) => m.prefetchCriminalJudicialDecisionsLedger())
        .catch(() => undefined);
}

export function prefetchCriminalTrialsTab(): void {
    if (typeof window === 'undefined') return;
    void loadCriminalDashboardPrefetchers()
        .then((m) => m.prefetchCriminalTrialsTab())
        .catch(() => undefined);
}
