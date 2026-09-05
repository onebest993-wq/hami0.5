/**
 * Prefetch overlays التنفيذ — عند hover/قرب الفتح.
 * تبويبات المحضر وبوابته وoverlays الشِل تُحمَّل بـ import() حتى لا تُقيَّم مع شبكة الأدوات.
 *
 * خلفية lite/2G تُحجب. نية المستخدم (بلاطة الشبكة / فتح النافذة) تُسخَّن حتى على lite.
 */
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import {
    prefetchExecutionDashboardShell,
} from './executionDashboardLazyRegistryShell';
import { prefetchExecutionCoreHandlers } from './executionCoreHandlersPrefetch';
import { loadAndCacheFollowupModalSnapshotBuilder } from './hooks/followupModalSnapshotBuilderCache';

type OverlayPrefetchOpts = { force?: boolean };

function skipExecutionOverlayPrefetch(force?: boolean): boolean {
    return !force && isLitePerformanceActive();
}

export function prefetchExecutionDossierMetaEdit(): void {
    void loadShellOverlays()
        .then((m) => {
            m.prefetchExecutionDashboardShellOverlays();
        })
        .catch(() => {});
    void loadOverlayRegistry()
        .then((m) => {
            m.LazyDossierMetaEditSection.preload();
        })
        .catch(() => {});
}

export function prefetchExecutionDossierActionsOverlay(): void {
    if (skipExecutionOverlayPrefetch()) return;
    void import('./executionDashboardDossierActionsModalLazy')
        .then((m) => m.LazyDossierActionsModal.preload())
        .catch(() => {});
}

function loadOverlayRegistry() {
    return import('./executionDashboardLazyRegistryOverlays');
}

function loadShellOverlays() {
    return import('./executionDashboardShellOverlaysLazy');
}

export function prefetchExecutionShellIntent(opts?: OverlayPrefetchOpts): void {
    if (skipExecutionOverlayPrefetch(opts?.force)) return;
    prefetchExecutionDashboardShell();
}

export function prefetchExecutionNotesOverlay(opts?: OverlayPrefetchOpts): void {
    if (skipExecutionOverlayPrefetch(opts?.force)) return;
    void loadShellOverlays()
        .then((m) => {
            m.prefetchExecutionDashboardShellOverlays();
        })
        .catch(() => {});
    void loadOverlayRegistry()
        .then((m) => {
            m.prefetchExecutionNotesAndAppointmentModals();
        })
        .catch(() => {});
}

export function prefetchExecutionDocumentsOverlay(opts?: OverlayPrefetchOpts): void {
    if (skipExecutionOverlayPrefetch(opts?.force)) return;
    void loadShellOverlays()
        .then((m) => {
            m.prefetchExecutionDashboardShellOverlays();
        })
        .catch(() => {});
    void loadOverlayRegistry()
        .then((m) => {
            m.prefetchExecutionDocumentVault();
        })
        .catch(() => {});
}

/**
 * مسار محضر المتابعة الحرج — يعمل حتى على lite لتقليل Suspense عند أول فتح.
 * يُسخَّن البوابة + التبويب الافتراضي فقط؛ بقية التبويبات عند نية التبويب.
 */
export function prefetchExecutionFollowupOverlay(tabId?: string): void {
    void loadAndCacheFollowupModalSnapshotBuilder();
    void import('./executionFollowupOverlayPrefetchRuntime')
        .then((m) => m.runExecutionFollowupOverlayPrefetch(tabId))
        .catch(() => {});
    prefetchExecutionCoreHandlers('seizure-requests');
}

export function prefetchExecutionFinanceOverlay(opts?: OverlayPrefetchOpts): void {
    if (skipExecutionOverlayPrefetch(opts?.force)) return;
    prefetchExecutionShellIntent(opts);
    void loadOverlayRegistry()
        .then((m) => {
            m.prefetchFinancialOperationsCenter();
            m.prefetchExecutionFinancialHubPortal();
        })
        .catch(() => {});
}

/** hover/focus/pointerdown شبكة الأدوات — نية مستخدم حتى على lite */
export function prefetchExecutionActionGridTile(tileKey: string): void {
    const intent: OverlayPrefetchOpts = { force: true };
    if (tileKey === 'followup' || tileKey === 'coercive' || tileKey === 'seizure') {
        prefetchExecutionFollowupOverlay();
        if (tileKey === 'coercive') {
            prefetchExecutionCoreHandlers('coercive');
            prefetchExecutionCoreHandlers('coercive-lifecycle');
        }
        return;
    }
    switch (tileKey) {
        case 'appt':
        case 'notes':
            prefetchExecutionNotesOverlay(intent);
            break;
        case 'documents':
            prefetchExecutionDocumentsOverlay(intent);
            break;
        case 'decisions':
            void loadShellOverlays()
                .then((m) => {
                    m.prefetchExecutionDashboardShellOverlays();
                })
                .catch(() => {});
            void loadOverlayRegistry()
                .then((m) => {
                    m.prefetchExecutionDecisionsModalContainer();
                    m.prefetchDecisionsAndAppealsEngine();
                })
                .catch(() => {});
            break;
        case 'finance':
            prefetchExecutionFinanceOverlay(intent);
            break;
        case 'law':
            void loadOverlayRegistry()
                .then((m) => {
                    m.prefetchLawReferencePanel();
                })
                .catch(() => {});
            break;
        default:
            break;
    }
}
