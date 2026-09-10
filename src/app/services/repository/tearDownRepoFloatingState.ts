import { blurFocusWithin } from '@/app/utils/inertProps';
import {
    abortRepositoryNetworkAllSafe,
    REPOSITORY_TEARDOWN_EVENT,
    unblockAllRepositoryOverlayEscape,
    type RepositoryTeardownSurface,
} from '@/app/services/repository/repositoryCloseEvents';
import { concealRepositoryWarmShellChrome } from '@/app/runtime/repositoryInstantPaint';
import { clearRepositoryPerfMarks } from '@/app/services/repository/repositoryPerfMetrics';

const REPOSITORY_SHELL_SELECTORS = [
    '[data-repository-shell]',
    '#lawyer-dashboard-repository-overlay',
    '[data-repository-host]',
] as const;

const DOSSIER_NOTES_VAULT_SELECTORS = [
    '[data-dossier-notes-vault]',
    '[data-vault-documents-host]',
    '.dossier-notes-vault-host',
] as const;

const VAULT_PDF_OVERLAY_SELECTORS = [
    '[data-vault-pdf-overlay]',
    '[data-vault-pdf-viewer]',
    '.vault-pdf-overlay',
] as const;

const TRANSIENT_HAMI_REPO_KEYS = [
    '__hamiRepoWarmCacheHandlesFeed',
    '__hamiRepoWarmCacheHandlesRooms',
    '__hamiRepoWarmCacheHandlesDossier',
    '__hamiRepoWarmCacheHandlesVault',
    '__hamiRepoExtractionSessionId',
    '__hamiRepoNoteDraftRef',
    '__hamiRepoSyncAbortHandle',
    '__hamiRepoHubHydrationId',
    '__hamiRepoOrphanRemoveHandle',
    '__hamiRepoWorkGateQueue',
    '__hamiRepoRegistrySnapshotRef',
    '__hamiRepoLastPerfReport',
    '__hamiRepoPreviewUrlSessionId',
    '__hamiRepoVaultPdfActiveId',
    '__hamiRepoNoteTabStateRef',
    '__hamiRepoRelocateTransactId',
    '__hamiRepoSyncBatchId',
    '__hamiRepoBackPressToken',
    '__hamiRepoPerfPhaseHandle',
    '__hamiRepoScannerLiveRef',
    '__hamiRepoOverlayChromeRef',
] as const;

let lastTeardownRepoActiveId = 0;

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

function isRepoSessionStale(targetSurfaceId?: number): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const winAny = window as unknown as Record<string, unknown>;
        const activeIdRef = winAny.__hamiRepoActiveSessionIdRef as
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
        /*
         * activeElement نوعه Element، وblur معرَّفة على HTMLOrSVGElement.
         * الفحص على الدالة لا على الصنف: `instanceof HTMLElement` كان
         * سيتخطّى عنصر SVG مركَّزاً، وهو يملك blur في المتصفّحات الحديثة.
         * السلوك وقت التشغيل مطابق للأصل حرفياً.
         */
        (document.activeElement as { blur?: () => void } | null)?.blur?.();
    } catch {
        /* ignore */
    }
    for (const group of [REPOSITORY_SHELL_SELECTORS, DOSSIER_NOTES_VAULT_SELECTORS, VAULT_PDF_OVERLAY_SELECTORS]) {
        const root = queryFirst(group);
        if (root) blurFocusWithin(root);
    }
    try {
        const iframes = Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe'));
        for (const iframe of iframes) {
            const dataAttr = iframe.getAttribute('data-vault-pdf-iframe');
            const src = iframe.getAttribute('src') || '';
            if (dataAttr || src.includes('vault') || src.includes('blob:')) {
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
        '__hamiRepoDossierNoteDraftPending',
        '__hamiRepoRoomRelocateAtomicQueue',
        '__hamiRepoDossierBackupAppendBatches',
        '__hamiRepoStorageWorkGatePending',
        '__hamiRepoNoteEditorPendingSave',
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
    for (const key of TRANSIENT_HAMI_REPO_KEYS) {
        try {
            delete winAny[key];
        } catch {
            /* ignore non-configurable */
        }
    }
    try {
        const allKeys = Object.getOwnPropertyNames(winAny).filter((k) => k.startsWith('__hamiRepo'));
        for (const key of allKeys) {
            if (
                key.endsWith('ActiveSessionIdRef') ||
                key.endsWith('SessionIdRef') ||
                key === '__hamiRepoEscapeStack'
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
    const groups = [REPOSITORY_SHELL_SELECTORS, DOSSIER_NOTES_VAULT_SELECTORS, VAULT_PDF_OVERLAY_SELECTORS];
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
    try {
        /* القشرة وحدها: الغلاف الكامل يُعيد استدعاء هذا التفكيك فتنعقد حلقةٌ لا تنتهي */
        concealRepositoryWarmShellChrome?.();
    } catch {
        /* P7 no-throw — Instant Paint chrome classes removal */
    }
    if (typeof document === 'undefined') return;
    try {
        const chromeSelectors = [
            '[data-repository-instant-chrome]',
            '.repository-instant-paint-chrome',
            '[data-repository-pending-chrome]',
        ];
        for (const selector of chromeSelectors) {
            const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
            for (const el of els) {
                try {
                    el.classList.add('pointer-events-none');
                    el.classList.remove('repository-instant-paint-active');
                } catch {
                    /* ignore */
                }
            }
        }
    } catch {
        /* ignore */
    }
}

function p8SettleClear(): void {
    if (typeof window === 'undefined') return;
    const winAny = window as unknown as Record<string, unknown>;
    const handles = [
        '__hamiRepoHubSettleHandle',
        '__hamiRepoIdleReleaseHandle',
        '__hamiRepoNoteDebounceHandle',
        '__hamiRepoVaultScanDebounceHandle',
        '__hamiRepoPrefetchRafId',
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

type TearDownRepoFloatingStateOptions = {
    targetSurface?: RepositoryTeardownSurface;
    targetSurfaceSessionId?: number;
    reason?: 'tearDown' | 'navigate-away' | 'idle-release' | 'reduced-motion' | 'unmount';
};

export function tearDownRepoFloatingState(options: TearDownRepoFloatingStateOptions = {}): void {
    const { targetSurface = 'global', targetSurfaceSessionId, reason = 'tearDown' } = options;

    if (typeof targetSurfaceSessionId === 'number') {
        if (isRepoSessionStale(targetSurfaceSessionId)) return;
    }

    lastTeardownRepoActiveId += 1;

    try {
        p1BlurAllFocusSurfaces();
    } catch {
        /* P1 — Never throw */
    }

    if (typeof targetSurfaceSessionId === 'number') {
        if (isRepoSessionStale(targetSurfaceSessionId)) return;
    }

    try {
        p2DrainTransientQueues();
    } catch {
        /* P2 — Never throw */
    }

    try {
        unblockAllRepositoryOverlayEscape();
    } catch {
        /* P3 — Never throw */
    }

    try {
        abortRepositoryNetworkAllSafe();
    } catch {
        /* P3b Network Abort — Never throw */
    }

    if (typeof targetSurfaceSessionId === 'number') {
        if (isRepoSessionStale(targetSurfaceSessionId)) return;
    }

    try {
        if (typeof window !== 'undefined') {
            const detail: Record<string, unknown> = {
                reason,
                targetSurface,
                teardownEpoch: lastTeardownRepoActiveId,
            };
            if (typeof targetSurfaceSessionId === 'number') {
                detail.surfaceSessionId = targetSurfaceSessionId;
            }
            window.dispatchEvent(
                new CustomEvent(REPOSITORY_TEARDOWN_EVENT, { detail, bubbles: false, cancelable: false }),
            );
        }
    } catch {
        /* P4 Event Dispatch — Never throw */
    }

    try {
        p5DeleteTransientPrefixes();
    } catch {
        /* P5 — Never throw */
    }

    try {
        p6ClosingAttrSnap();
    } catch {
        /* P6 — Never throw */
    }

    try {
        p7ChromeSnap();
    } catch {
        /* P7 — Never throw */
    }

    try {
        p8SettleClear();
    } catch {
        /* P8 — Never throw */
    }

    try {
        clearRepositoryPerfMarks?.();
    } catch {
        /* Perf marks cleanup — Never throw */
    }
}

