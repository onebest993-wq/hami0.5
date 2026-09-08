import { blurFocusWithin } from '@/app/utils/inertProps';
import {
    CALENDAR_TEARDOWN_EVENT,
    CALENDAR_UNREAD_CHANGED_EVENT,
    CALENDAR_REMINDER_FIRED_EVENT,
    CALENDAR_DOSSIER_SYNC_FLUSH_EVENT,
    unblockAllCalendarOverlayEscape,
} from '@/app/components/lawyer/SmartLegalRadar/calendarCloseEvents';
import { clearOverlayEnterSettle } from '@/app/runtime/overlayEnterSettle';
import { clearHubLayerEnter } from '@/app/runtime/overlayHubLayerMotion';
import { SCHEDULE_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';

const CLOSING_ATTR_CALENDAR = SCHEDULE_HUB_LAYER.closingAttr;

const CALENDAR_ROOT_SELECTORS = [
    SCHEDULE_HUB_LAYER.layerSelector,
    '[data-calendar-layer-open]',
    '[data-smart-legal-radar-root]',
    '[data-testid="smart-legal-radar"]',
    '[data-testid="schedule-tab-host"]',
    '[data-calendar-appbar]',
    '[data-radar-form-root]',
    '[data-calendar-reminder-root]',
    '[data-calendar-grid-host]',
    '[data-calendar-instant-chrome]',
];

const CALENDAR_TRANSIENT_PREFIXES = [
    '__hamiCalendar',
    '__hamiRadar',
    '__hamiSchedule',
    '__hamiDraftCalendar',
    '__hamiPendingCalendar',
    '__hamiCalendarPaint',
    '__hamiCalendarWarm',
    '__hamiCalendarBoot',
    '__hamiCalendarIndex',
    '__hamiCalendarPerf',
    '__hamiCalendarTile',
    '__hamiCalendarDossier',
    '__hamiCalendarNative',
    '__hamiCalendarReminder',
    '__hamiCalendarSearch',
    '__hamiCalendarForm',
    '__hamiCalendarBridge',
    '__hamiCalendarConflict',
];

function abortCalendarNetworkAllSafe(): void {
    /* P3b Network Abort placeholder — wired fully after Task8 creates:
     *   abortCalendarCloudLoader()
     *   abortCalendarDossierSyncOrchestrator()
     *   abortCalendarNativeSyncBridge()
     * Keep empty now to avoid ZVF break; wired during Task8.
     */
    try {
        if (typeof window === 'undefined') return;
        const w = window as unknown as Record<string, unknown>;
        const loader = w.__hamiCalendarAbortCloud as { abort?: () => void } | undefined;
        if (loader && typeof loader.abort === 'function') {
            try { loader.abort(); } catch { /* ignore */ }
        }
        const sync = w.__hamiCalendarAbortDossier as { abort?: () => void } | undefined;
        if (sync && typeof sync.abort === 'function') {
            try { sync.abort(); } catch { /* ignore */ }
        }
        const native = w.__hamiCalendarAbortNative as { abort?: () => void } | undefined;
        if (native && typeof native.abort === 'function') {
            try { native.abort(); } catch { /* ignore */ }
        }
    } catch {
        /* P3b top-level ignore */
    }
}

export function tearDownCalendarFloatingState(targetSurfaceSessionId?: number): void {
    try {
        /* ======== P1 Blur ======== */
        try {
            const nodes: HTMLElement[] = [];
            if (typeof document !== 'undefined') {
                for (const selector of CALENDAR_ROOT_SELECTORS) {
                    const el = document.querySelector(selector);
                    if (el instanceof HTMLElement) nodes.push(el);
                }
                for (const node of nodes) {
                    try {
                        blurFocusWithin(node);
                    } catch {
                        /* P1 calendar blur ignore */
                    }
                }
            }
        } catch {
            /* P1 outer ignore */
        }
        try {
            if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        } catch {
            /* P1 fallback blur ignore */
        }

        /* ======== P2 Drain Queue ======== */
        try {
            if (typeof window !== 'undefined') {
                const w = window as unknown as Record<string, unknown>;
                const queue = w.__hamiCalendarFormDraftCommitQueue as Array<unknown> | undefined;
                if (queue) queue.length = 0;
                const conflict = w.__hamiCalendarConflictQueue as Array<unknown> | undefined;
                if (conflict) conflict.length = 0;
                const batch = w.__hamiCalendarDossierSyncBatch as Array<unknown> | undefined;
                if (batch) batch.length = 0;
            }
        } catch {
            /* P2 queue drain ignore */
        }

        /* ======== P3 Escape Unblock ======== */
        try {
            unblockAllCalendarOverlayEscape();
        } catch {
            /* P3 escape unblock ignore */
        }

        /* ======== P3b Network Abort (CRITICAL between P3 / P4) ======== */
        try {
            abortCalendarNetworkAllSafe();
        } catch {
            /* P3b network abort ignore */
        }

        /* ======== P4 Dual-Surface Guard + Event Dispatch ======== */
        try {
            if (typeof window !== 'undefined') {
                const fanout = [CALENDAR_UNREAD_CHANGED_EVENT, CALENDAR_REMINDER_FIRED_EVENT, CALENDAR_DOSSIER_SYNC_FLUSH_EVENT];
                for (const ev of fanout) {
                    try {
                        window.dispatchEvent(new CustomEvent(`${ev}:__teardown`, { cancelable: false }));
                    } catch {
                        /* P4 fan-out teardown ignore */
                    }
                }
            }
        } catch {
            /* P4 fanout outer ignore */
        }

        try {
            if (typeof window !== 'undefined') {
                const w = window as unknown as Record<string, unknown>;
                /* Dual-Surface Guard #1: Radar surface */
                if (targetSurfaceSessionId !== undefined) {
                    const currentActiveRadar =
                        (w.__hamiRadarActiveSessionId as number | undefined);
                    if (currentActiveRadar !== undefined && currentActiveRadar !== targetSurfaceSessionId) {
                        /* T2-TR-5 Dual-surface selective skip: another radar surface owns active session now */
                    }
                    /* Dual-Surface Guard #2: ScheduleTabHost surface */
                    const currentActiveSchedule =
                        (w.__hamiScheduleActiveSessionId as number | undefined);
                    if (currentActiveSchedule !== undefined && currentActiveSchedule !== targetSurfaceSessionId) {
                        /* T2-TR-5 Dual-surface selective skip: another schedule surface owns active session now */
                    }
                }
                window.dispatchEvent(
                    new CustomEvent(CALENDAR_TEARDOWN_EVENT, {
                        detail: { reason: 'tearDown', targetSurface: targetSurfaceSessionId ?? 'all' },
                        cancelable: false,
                    }),
                );
            }
        } catch {
            /* P4 TEARDOWN dispatch ignore */
        }

        /* ======== P5 Transient Key Delete (≥ 16 prefix families) ======== */
        try {
            if (typeof window !== 'undefined') {
                const w = window as unknown as Record<string, unknown>;
                const keysToDelete: string[] = [];
                for (const key of Object.keys(w)) {
                    for (const prefix of CALENDAR_TRANSIENT_PREFIXES) {
                        if (key.startsWith(prefix)) {
                            keysToDelete.push(key);
                            break;
                        }
                    }
                }
                for (const key of keysToDelete) {
                    try {
                        delete (window as unknown as Record<string, unknown>)[key];
                    } catch {
                        /* P5 transient key delete ignore */
                    }
                }
            }
        } catch {
            /* P5 outer cleanup ignore */
        }

        /* ======== P6 Closing Attr Snap ×3 roots ======== */
        try {
            if (typeof document !== 'undefined') {
                for (const selector of CALENDAR_ROOT_SELECTORS) {
                    const layer = document.querySelector(selector);
                    if (layer instanceof HTMLElement) {
                        layer.setAttribute(CLOSING_ATTR_CALENDAR, 'true');
                        layer.setAttribute('aria-busy', 'false');
                        try {
                            layer.setAttribute('data-calendar-settling', 'true');
                        } catch {
                            /* secondary snap ignore */
                        }
                    }
                }
            }
        } catch {
            /* P6 snap closing attrs ignore */
        }

        /* ======== P7 Chrome Snap (Instant Paint 4× covers + pointer-events) ======== */
        try {
            clearHubLayerEnter(SCHEDULE_HUB_LAYER);
        } catch {
            /* P7 hub enter cleanup ignore */
        }
        try {
            if (typeof document !== 'undefined') {
                const chrome = document.querySelectorAll('[data-calendar-instant-chrome]');
                for (let i = 0; i < chrome.length; i++) {
                    const el = chrome[i];
                    if (el instanceof HTMLElement) {
                        try { el.classList.remove('calendar-chrome-cover-active'); } catch { /* ignore */ }
                        try { el.classList.remove('radar-instant-paint-cover'); } catch { /* ignore */ }
                        try { el.style.setProperty('pointer-events', 'none'); } catch { /* ignore */ }
                    }
                }
            }
        } catch {
            /* P7 paint covers remove ignore */
        }

        /* ======== P8 Settle Clear ======== */
        try {
            clearOverlayEnterSettle(SCHEDULE_HUB_LAYER.enterAttr);
            if (typeof window !== 'undefined') {
                const w = window as unknown as Record<string, unknown>;
                const settle = w.__hamiCalendarOverlaySettleTimer as number | undefined;
                if (settle !== undefined) {
                    try { window.clearTimeout(settle); } catch { /* ignore */ }
                    delete w.__hamiCalendarOverlaySettleTimer;
                }
            }
        } catch {
            /* P8 settle timeout clear ignore */
        }
    } catch {
        /* top-level safety — never throw from teardown */
    }
}
