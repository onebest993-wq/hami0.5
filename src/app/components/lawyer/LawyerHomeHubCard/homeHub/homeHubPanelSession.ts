import type { HomeHubPanel } from '@/app/services/alerts/homeHubCardLogic';

export const HOME_HUB_PANEL_SESSION_KEY = 'hami:home-hub-panel';

const PANELS: HomeHubPanel[] = ['alerts', 'pins'];

function normalizePersistedHomeHubPanel(value: string | null | undefined): HomeHubPanel | null {
    if (value === 'secretary') return 'alerts';
    if (value === 'alerts' || value === 'pins') return value;
    return null;
}

export function readPersistedHomeHubPanel(): HomeHubPanel | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(HOME_HUB_PANEL_SESSION_KEY);
        return normalizePersistedHomeHubPanel(raw);
    } catch {
        return null;
    }
}

export function persistHomeHubPanel(panel: HomeHubPanel): void {
    if (!PANELS.includes(panel) || typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(HOME_HUB_PANEL_SESSION_KEY, panel);
    } catch {
        /* ignore */
    }
}

export function resetHomeHubPanelSessionForTests(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(HOME_HUB_PANEL_SESSION_KEY);
    } catch {
        /* ignore */
    }
}
