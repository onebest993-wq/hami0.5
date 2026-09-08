import { blurFocusWithin } from '@/app/utils/inertProps';
import {
    abortExecutionNetworkAllSafe,
    EXECUTION_TEARDOWN_EVENT,
    unblockAllExecutionOverlayEscape,
    type ExecutionTeardownSurface,
} from '@/app/services/execution/executionCloseEvents';

const EXECUTION_SHELL_SELECTORS = [
    '[data-execution-shell]',
    '#lawyer-dashboard-execution-overlay',
    '[data-execution-host]',
    '.execution-shell-portal-host',
] as const;

const EXECUTION_CREATION_SELECTORS = [
    '[data-execution-creation]',
    '[data-execution-intake-form]',
    '.execution-creation-portal',
] as const;

const EXECUTION_DASHBOARD_SELECTORS = [
    '[data-execution-dashboard]',
    '[data-execution-dossier-host]',
    '.execution-dossier-shell',
] as const;

const EXECUTION_SEIZURE_SELECTORS = [
    '[data-execution-seizure]',
    '.seizure-requests-panel',
] as const;

const EXECUTION_FINANCIAL_SELECTORS = [
    '[data-execution-financial]',
    '.execution-financial-hub',
] as const;

const EXECUTION_SUMMONS_SELECTORS = [
    '[data-execution-summons]',
    '.unified-summons-shell',
] as const;

const EXECUTION_ARCHIVE_SELECTORS = [
    '[data-execution-archive]',
    '.execution-archive-surface',
] as const;

const EXECUTION_FOLLOWUP_SELECTORS = [
    '[data-execution-followup]',
    '[data-followup-modal]',
    '.execution-followup-portal',
] as const;

const ALL_EXECUTION_SURFACE_GROUPS = [
    EXECUTION_SHELL_SELECTORS,
    EXECUTION_CREATION_SELECTORS,
    EXECUTION_DASHBOARD_SELECTORS,
    EXECUTION_SEIZURE_SELECTORS,
    EXECUTION_FINANCIAL_SELECTORS,
    EXECUTION_SUMMONS_SELECTORS,
    EXECUTION_ARCHIVE_SELECTORS,
    EXECUTION_FOLLOWUP_SELECTORS,
] as const;

const TRANSIENT_HAMI_EXEC_KEYS = [
    '__hamiExecCreationSessionId',
    '__hamiExecDashboardSessionId',
    '__hamiExecSeizureSessionId',
    '__hamiExecFinancialSessionId',
    '__hamiExecSummonsSessionId',
    '__hamiExecArchiveSessionId',
    '__hamiExecFollowupSessionId',
    '__hamiExecWarmCacheHandlesShell',
    '__hamiExecWarmCacheHandlesDashboard',
    '__hamiExecWarmCacheHandlesSummons',
    '__hamiExecWarmCacheHandlesArchive',
    '__hamiExecDraftFormRef',
    '__hamiExecSyncAbortHandle',
    '__hamiExecDashboardHydrationId',
    '__hamiExecOrphanRemoveHandle',
    '__hamiExecWorkGateQueue',
    '__hamiExecRegistrySnapshotRef',
    '__hamiExecLastPerfReport',
    '__hamiExecSummonsBatchId',
    '__hamiExecBackPressToken',
    '__hamiExecPerfPhaseHandle',
    '__hamiExecOverlayChromeRef',
    '__hamiExecDossierBlobBatchId',
    '__hamiExecSeizurePlanStateRef',
    '__hamiExecLedgerPendingTxRef',
] as const;

const EXECUTION_TIMER_HANDLES = [
    '__hamiExecWorkspaceIdleTimer',
    '__hamiExecOverlayPrefetchTimer',
    '__hamiExecPhaseNavDebounce',
    '__hamiExecArchiveFilterDebounce',
    '__hamiExecFollowupLiveThrottle',
    '__hamiExecSummonsHubDebounce',
    '__hamiExecSeizureRefreshThrottle',
    '__hamiExecFinancialLedgerDebounce',
] as const;

const EXECUTION_DRAIN_QUEUE_KEYS = [
    '__hamiExecDossierSaveAtomicQueue',
    '__hamiExecSummonsDispatchBatches',
    '__hamiExecFinancialLedgerPending',
    '__hamiExecSeizureOutcomePending',
    '__hamiExecFollowupNoteDraftPending',
    '__hamiExecBlobWritePendingBatches',
] as const;

let lastTeardownExecutionActiveId = 0;

function queryFirst(selectors: readonly string[]): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    for (const selector of selectors) {
        try {
            const el = document.querySelector<HTMLElement>(selector);
            if (el instanceof HTMLElement) return el;
        } catch {
            /* ignore malformed selector */
        }
    }
    return null;
}

export function isExecSessionStale(targetSurfaceId?: number): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const winAny = window as unknown as Record<string, unknown>;
        const activeIdRef = winAny.__hamiExecActiveSessionIdRef as
            | { current: number }
            | undefined;
        if (!activeIdRef || typeof targetSurfaceId !== 'number') return false;
        return targetSurfaceId !== activeIdRef.current;
    } catch {
        return false;
    }
}

function p1BlurAllFocusSurfaces(): void {
    if (typeof document === 'undefined') return;
    try {
        (document.activeElement as HTMLElement | null)?.blur?.();
    } catch {
        /* ignore */
    }
    for (const group of ALL_EXECUTION_SURFACE_GROUPS) {
        const root = queryFirst(group);
        if (root) {
            try {
                blurFocusWithin(root);
            } catch {
                /* ignore */
            }
        }
    }
    try {
        const inputs = Array.from(
            document.querySelectorAll<HTMLElement>('input, textarea, [contenteditable="true"], select'),
        );
        for (const input of inputs) {
            if (input.closest('[data-execution], [class*="execution"]')) {
                try {
                    input.blur();
                } catch {
                    /* ignore */
                }
            }
        }
    } catch {
        /* ignore */
    }
    try {
        const iframes = Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe'));
        for (const iframe of iframes) {
            const src = iframe.getAttribute('src') || '';
            if (src.includes('execution') || src.includes('blob:')) {
                try {
                    iframe.blur();
                } catch {
                    /* ignore cross-origin */
                }
            }
        }
    } catch {
        /* ignore */
    }
}

function p2DrainTransientQueues(): void {
    if (typeof window === 'undefined') return;
    const winAny = window as unknown as Record<string, unknown>;
    for (const key of EXECUTION_DRAIN_QUEUE_KEYS) {
        try {
            const value = winAny[key];
            if (Array.isArray(value)) {
                value.length = 0;
            } else if (value && typeof value === 'object') {
                const obj = value as Record<string, unknown>;
                for (const k of Object.keys(obj)) delete obj[k];
            }
            delete winAny[key];
        } catch {
            /* ignore non-configurable */
        }
    }
}

function p5DeleteTransientWindowKeys(): void {
    if (typeof window === 'undefined') return;
    const winAny = window as unknown as Record<string, unknown>;
    for (const key of TRANSIENT_HAMI_EXEC_KEYS) {
        try {
            delete winAny[key];
        } catch {
            /* ignore non-configurable */
        }
    }
    try {
        const allKeys = Object.getOwnPropertyNames(winAny).filter((k) => k.startsWith('__hamiExec'));
        for (const key of allKeys) {
            if (
                key.endsWith('ActiveSessionIdRef') ||
                key.endsWith('SessionIdRef') ||
                key === '__hamiExecEscapeStack'
            ) {
                continue;
            }
            try {
                delete winAny[key];
            } catch {
                /* ignore */
            }
        }
    } catch {
        /* ignore */
    }
}

function p6ClosingAttrSnap(): void {
    if (typeof document === 'undefined') return;
    for (const group of ALL_EXECUTION_SURFACE_GROUPS) {
        const root = queryFirst(group);
        if (root) {
            try {
                root.setAttribute('data-closing', 'true');
                root.setAttribute('aria-busy', 'false');
            } catch {
                /* ignore */
            }
        }
    }
    try {
        const extras = Array.from(
            document.querySelectorAll<HTMLElement>(
                '.execution-modal-container, [data-execution-notes], .execution-hotspot-surface, [class*="ExecutionOverlay"]',
            ),
        );
        for (const el of extras.slice(0, 4)) {
            try {
                el.setAttribute('data-closing', 'true');
                el.setAttribute('aria-busy', 'false');
            } catch {
                /* ignore */
            }
        }
    } catch {
        /* ignore */
    }
}

function p7ChromeSnap(): void {
    if (typeof document === 'undefined') return;
    try {
        const rootStyle = document.documentElement.style;
        rootStyle.setProperty('pointer-events', 'none');
        requestAnimationFrame(() => {
            try {
                rootStyle.removeProperty('pointer-events');
            } catch {
                /* ignore */
            }
        });
    } catch {
        /* ignore */
    }
    try {
        const creationChrome = [
            '.execution-creation-reveal-step-1',
            '.execution-creation-reveal-step-2',
            '.execution-creation-reveal-step-3',
            '.execution-creation-reveal-step-4',
            '.execution-creation-reveal-step-5',
            '.execution-creation-progressive-chrome',
        ];
        for (const selector of creationChrome) {
            const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
            for (const el of els) {
                try {
                    el.classList.add('pointer-events-none', 'opacity-0');
                    el.classList.remove('execution-creation-chrome-active');
                } catch {
                    /* ignore */
                }
            }
        }
        const dashboardChrome = [
            '.execution-dashboard-chunk-cover-1',
            '.execution-dashboard-chunk-cover-2',
            '.execution-dashboard-chunk-cover-3',
            '.execution-dashboard-chunk-cover-4',
            '.execution-dashboard-chunk-scope-cover',
        ];
        for (const selector of dashboardChrome) {
            const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
            for (const el of els) {
                try {
                    el.classList.add('pointer-events-none', 'opacity-0');
                } catch {
                    /* ignore */
                }
            }
        }
    } catch {
        /* ignore */
    }
}

function p8SettleClearTimers(): void {
    if (typeof window === 'undefined') return;
    const winAny = window as unknown as Record<string, unknown>;
    for (const handleKey of EXECUTION_TIMER_HANDLES) {
        try {
            const h = winAny[handleKey] as number | undefined;
            if (typeof h === 'number' && Number.isFinite(h)) {
                clearTimeout(h);
                cancelAnimationFrame(h);
            }
            delete winAny[handleKey];
        } catch {
            /* ignore */
        }
    }
}

export type TearDownExecutionFloatingStateOptions = {
    targetSurface?: ExecutionTeardownSurface;
    targetSurfaceSessionId?: number;
    reason?: 'tearDown' | 'navigate-away' | 'idle-release' | 'reduced-motion' | 'unmount';
};

export function tearDownExecutionFloatingState(options: TearDownExecutionFloatingStateOptions = {}): void {
    const { targetSurface = 'global', targetSurfaceSessionId, reason = 'tearDown' } = options;

    if (typeof targetSurfaceSessionId === 'number') {
        if (typeof isExecSessionStale === 'function' && isExecSessionStale(targetSurfaceSessionId)) return;
    }

    lastTeardownExecutionActiveId += 1;

    /* ==========================================================
     * P1 BlurAllFocus (CP-01 8 surfaces focus blur)
     * ==========================================================*/
    try {
        p1BlurAllFocusSurfaces();
    } catch {
        /* P1 — Never throw */
    }

    if (typeof targetSurfaceSessionId === 'number') {
        if (typeof isExecSessionStale === 'function' && isExecSessionStale(targetSurfaceSessionId)) return;
    }

    /* ==========================================================
     * P2 DrainTransientQueues (decisions/files/blob/orchestrators)
     * ==========================================================*/
    try {
        p2DrainTransientQueues();
    } catch {
        /* P2 — Never throw */
    }

    /* ==========================================================
     * P3 UnblockEscapeStack (call unblock stub from sibling)
     * ==========================================================*/
    try {
        unblockAllExecutionOverlayEscape();
    } catch {
        /* P3 — Never throw */
    }

    /* ==========================================================
     * P3b NETWORK ABORT CRITICAL ORDERED (P3 < P3b < P4 line #)
     * ==========================================================*/
    try {
        abortExecutionNetworkAllSafe();
    } catch {
        /* P3b Network Abort — Never throw */
    }

    if (typeof targetSurfaceSessionId === 'number') {
        if (typeof isExecSessionStale === 'function' && isExecSessionStale(targetSurfaceSessionId)) return;
    }

    /* ==========================================================
     * P4 CustomEvent dispatch EXECUTION_TEARDOWN_EVENT
     * ==========================================================*/
    try {
        if (typeof window !== 'undefined') {
            const detail: Record<string, unknown> = {
                reason,
                targetSurface,
                teardownEpoch: lastTeardownExecutionActiveId,
            };
            if (typeof targetSurfaceSessionId === 'number') {
                detail.surfaceSessionId = targetSurfaceSessionId;
            }
            window.dispatchEvent(
                new CustomEvent(EXECUTION_TEARDOWN_EVENT, { detail, bubbles: false, cancelable: false }),
            );
        }
    } catch {
        /* P4 Event Dispatch — Never throw */
    }

    /* ==========================================================
     * P5 DeleteTransientWindowKeys (TRANSIENT_HAMI_EXEC_KEYS ≥17)
     * ==========================================================*/
    try {
        p5DeleteTransientWindowKeys();
    } catch {
        /* P5 — Never throw */
    }

    /* ==========================================================
     * P6 ClosingAttrSnap ≥7 surfaces data-closing + aria-busy=false
     * ==========================================================*/
    try {
        p6ClosingAttrSnap();
    } catch {
        /* P6 — Never throw */
    }

    /* ==========================================================
     * P7 ChromeSnap (remove creation/dashboard progressive classes + pointerEvents snap)
     * ==========================================================*/
    try {
        p7ChromeSnap();
    } catch {
        /* P7 — Never throw */
    }

    /* ==========================================================
     * P8 Settle/Clear timers ≥5 actual handles
     * ==========================================================*/
    try {
        p8SettleClearTimers();
    } catch {
        /* P8 — Never throw */
    }
}

export function resetLastTeardownExecutionActiveIdForTests(): void {
    lastTeardownExecutionActiveId = 0;
}

export function getExecutionTeardownTransientKeyCount(): number {
    return TRANSIENT_HAMI_EXEC_KEYS.length;
}

export function getExecutionTeardownTimerHandleCount(): number {
    return EXECUTION_TIMER_HANDLES.length;
}

export function getExecutionTeardownSurfaceGroupCount(): number {
    return ALL_EXECUTION_SURFACE_GROUPS.length;
}
