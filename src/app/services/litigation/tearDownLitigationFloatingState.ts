import { blurFocusWithin } from '@/app/utils/inertProps';
import {
    abortLitigationNetworkAllSafe,
    LITIGATION_TEARDOWN_EVENT,
    unblockAllLitigationOverlayEscape,
    type LitigationTeardownSurface,
} from '@/app/services/litigation/litigationCloseEvents';
import { clearLawsuitArchivePerfMarks } from '@/app/services/alerts/lawsuitArchivePerfMetrics';

const LAWYER_NEWCASE_SELECTORS = [
    '[data-lawyer-newcase-root]',
    '#lawyer-newcase-modal-overlay',
    '[data-newcase-form-host]',
] as const;

const ARCHIVE_PORTAL_SELECTORS = [
    '[data-lawsuit-archive-chrome]',
    '#archive-portal-lawsuit-overlay',
    '[data-archive-portal-host]',
] as const;

const CRIMINAL_DASHBOARD_SELECTORS = [
    '[data-criminal-dashboard-portal]',
    '#criminal-dashboard-overlay',
    '[data-criminal-host]',
] as const;

const SMARTFILE_MODAL_SELECTORS = [
    '[data-smartfile-modal-host]',
    '#smart-file-modal-overlay',
    '[data-smartfile-flow-host]',
] as const;

const LITIGATION_WORKSPACE_SELECTORS = [
    '[data-lawsuits-workspace-host]',
    '#lawsuits-workspace-overlay',
    '[data-workspace-host-lazy]',
] as const;

const TRANSIENT_HAMI_LIT_KEYS = [
    '__hamiLitWorkspaceWarmCacheHandles',
    '__hamiLitWorkspacePrimeHandles',
    '__hamiLitWorkspaceOverlayHandles',
    '__hamiLitWorkspaceSessionId',
    '__hamiLitEagerHydrateFilesHandle',
    '__hamiLitEagerHydrateSegmentsHandle',
    '__hamiLitEagerHydrateDurabilityHandle',
    '__hamiLitActiveSessionIdRef',
    '__hamiLitShellSessionIdRef',
    '__hamiLitPendingCreateBatch',
    '__hamiLitPendingCreateTransmitId',
    '__hamiLitJournalFlushHandle',
    '__hamiLitVaultCommitHold',
    '__hamiLitLastPerfReportId',
    '__hamiLitAbortFilesHydrate',
    '__hamiLitAbortWorkspaceWarm',
    '__hamiLitAbortCaseShareNetwork',
    '__hamiLitOverlayChromeRef',
    '__hamiLitPartyFormStateRef',
    '__hamiLitSyncBatchId',
    '__hamiLitWarmCacheSecondaryHandle',
] as const;

let lastTeardownLitActiveId = 0;

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

function isLitSessionStale(targetSurfaceId?: number): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const winAny = window as unknown as Record<string, unknown>;
        const activeIdRef = winAny.__hamiLitActiveSessionIdRef as
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
        const el = document.activeElement as HTMLElement | null;
        el?.blur?.();
    } catch {
        /* ignore */
    }
    for (const group of [
        LAWYER_NEWCASE_SELECTORS,
        ARCHIVE_PORTAL_SELECTORS,
        CRIMINAL_DASHBOARD_SELECTORS,
        SMARTFILE_MODAL_SELECTORS,
        LITIGATION_WORKSPACE_SELECTORS,
    ]) {
        const root = queryFirst(group);
        if (root) blurFocusWithin(root);
    }
    try {
        const iframes = Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe'));
        for (const iframe of iframes) {
            const dataAttr = iframe.getAttribute('data-caseshare-iframe');
            const src = iframe.getAttribute('src') || '';
            if (dataAttr || src.includes('caseshare') || src.includes('smartfile')) {
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
    const drainKeys = [
        '__hamiLitJournalPendingFlush',
        '__hamiLitPendingCreateAtomicQueue',
        '__hamiLitSegmentPersistBatches',
        '__hamiLitDurabilityOverlayAppendBatches',
        '__hamiLitSmartFileFlowQueue',
    ];
    for (const key of drainKeys) {
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

function p5DeleteTransientPrefixes(): void {
    if (typeof window === 'undefined') return;
    const winAny = window as unknown as Record<string, unknown>;
    for (const key of TRANSIENT_HAMI_LIT_KEYS) {
        try {
            delete winAny[key];
        } catch {
            /* ignore non-configurable */
        }
    }
    try {
        const allKeys = Object.getOwnPropertyNames(winAny).filter((k) => k.startsWith('__hamiLit'));
        for (const key of allKeys) {
            if (
                key.endsWith('ActiveSessionIdRef') ||
                key.endsWith('SessionIdRef') ||
                key === '__hamiLitEscapeStack'
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
    const groups = [
        LAWYER_NEWCASE_SELECTORS,
        ARCHIVE_PORTAL_SELECTORS,
        CRIMINAL_DASHBOARD_SELECTORS,
        SMARTFILE_MODAL_SELECTORS,
        LITIGATION_WORKSPACE_SELECTORS,
    ];
    for (const group of groups) {
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
}

function p7ChromeSnap(): void {
    if (typeof document === 'undefined') return;
    try {
        const chromeSelectors = [
            '[data-newcase-progressive-reveal]',
            '.newcase-progressive-reveal-step-1',
            '.newcase-progressive-reveal-step-2',
            '.newcase-progressive-reveal-step-3',
            '.lawsuit-workspace-warm-cover',
            '[data-workspace-pending-chrome]',
        ];
        for (const selector of chromeSelectors) {
            const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
            for (const el of els) {
                try {
                    el.classList.add('pointer-events-none');
                    el.classList.remove('newcase-progressive-reveal-active');
                    el.classList.remove('workspace-warm-cover-active');
                } catch {
                    /* ignore */
                }
            }
        }
        /*
         * لا pointer-events:none على <html>. الحلقة أعلاه تُحيّد قشرة الدعاوى الراكدة
         * بعينها، وهو تمام الغرض؛ أمّا كتمُ الجذر فيُخمد التطبيق كلّه ولا يُستردّ،
         * فيموت كل تراكب لا يُعيد تفعيل pointer-events لنفسه — ومنه محضر المتابعة.
         */
    } catch {
        /* P7 no-throw — Chrome classes snap */
    }
}

function p8SettleClear(): void {
    if (typeof window === 'undefined') return;
    const winAny = window as unknown as Record<string, unknown>;
    const handles = [
        '__hamiLitWorkspaceIdle12s',
        '__hamiLitOverlayPrefetchTimer',
        '__hamiLitPhaseNavDebounce',
        '__hamiLitArchiveFilterDebounce',
        '__hamiLitPartyFormInputThrottle',
    ];
    for (const handleKey of handles) {
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

type TearDownLitigationFloatingStateOptions = {
    targetSurface?: LitigationTeardownSurface;
    targetSurfaceSessionId?: number;
    reason?: 'tearDown' | 'navigate-away' | 'idle-release' | 'reduced-motion' | 'unmount' | 'commit-failed' | 'contract-open' | 'linking-runtime-load' | 'hot-dispose';
};

export function tearDownLitigationFloatingState(options: TearDownLitigationFloatingStateOptions = {}): void {
    const { targetSurface = 'global', targetSurfaceSessionId, reason = 'tearDown' } = options;

    if (typeof targetSurfaceSessionId === 'number') {
        if (isLitSessionStale(targetSurfaceSessionId)) return;
    }

    lastTeardownLitActiveId += 1;

    /* P1 — Blur all focus surfaces (LawyerNewCase / Archive / Criminal / SmartFile / Workspace) */
    try {
        p1BlurAllFocusSurfaces();
    } catch {
        /* P1 — Never throw */
    }

    /* P2 junction staleGuard (1/3) — spec required inter-principle junction P2 typeof-guard pattern */
    if (typeof isLitSessionStale === 'function' && isLitSessionStale(targetSurfaceSessionId)) return;

    /* P2 — Drain transient queues (journal pending / create batches / persist queues / durability overlays) */
    try {
        p2DrainTransientQueues();
    } catch {
        /* P2 — Never throw */
    }

    /* P3 — Unblock Escape Stack (stub now; real Task8 re-export) */
    try {
        unblockAllLitigationOverlayEscape();
    } catch {
        /* P3 — Never throw */
    }

    /* P3b CRITICAL NETWORK ABORT — ORDERED EXACTLY BETWEEN P3 (unblock) AND P4 (event) */
    try {
        abortLitigationNetworkAllSafe();
    } catch {
        /* P3b Network Abort — Never throw */
    }

    /* P3b/P4 junction staleGuard (2/3) */
    if (typeof targetSurfaceSessionId === 'number') {
        if (isLitSessionStale(targetSurfaceSessionId)) return;
    }

    /* P4 — Dispatch CustomEvent TEARDOWN with reason + surface + epoch */
    try {
        if (typeof window !== 'undefined') {
            const detail: Record<string, unknown> = {
                reason,
                targetSurface,
                teardownEpoch: lastTeardownLitActiveId,
            };
            if (typeof targetSurfaceSessionId === 'number') {
                detail.surfaceSessionId = targetSurfaceSessionId;
            }
            window.dispatchEvent(
                new CustomEvent(LITIGATION_TEARDOWN_EVENT, { detail, bubbles: false, cancelable: false }),
            );
        }
    } catch {
        /* P4 Event Dispatch — Never throw */
    }

    /* P5 junction staleGuard (2/3 — P5 junction per spec P2/P5/P7 typeof-guard pattern) */
    if (typeof isLitSessionStale === 'function' && isLitSessionStale(targetSurfaceSessionId)) return;

    /* P5 — Delete TRANSIENT_HAMI_LIT_KEYS (≥17 keys) + all residual __hamiLit prefix except active refs */
    try {
        p5DeleteTransientPrefixes();
    } catch {
        /* P5 — Never throw */
    }

    /* P6 — Closing attribute snap (5 surfaces × data-closing=true + aria-busy=false) */
    try {
        p6ClosingAttrSnap();
    } catch {
        /* P6 — Never throw */
    }

    /* P7 junction staleGuard (3/3 — final spec required inter-principle junction P7 typeof-guard pattern) */
    if (typeof isLitSessionStale === 'function' && isLitSessionStale(targetSurfaceSessionId)) return;

    /* P7 — Chrome Snap (remove reveal classes / warm covers / pointerEvents none) */
    try {
        p7ChromeSnap();
    } catch {
        /* P7 — Never throw */
    }

    /* P8 — Settle + Clear (5 timers: idle12s / prefetchTimer / phaseNav / filterDebounce / partyThrottle) */
    try {
        p8SettleClear();
    } catch {
        /* P8 — Never throw */
    }

    /* Perf marks cleanup (lawsuit archive perf marks) */
    try {
        clearLawsuitArchivePerfMarks?.();
    } catch {
        /* Perf marks cleanup — Never throw */
    }
}

