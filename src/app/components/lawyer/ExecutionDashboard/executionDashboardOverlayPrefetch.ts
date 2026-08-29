/**
 * Prefetch overlays التنفيذ — عند hover/قرب الفتح (ومسار حرج للمحضر حتى على lite).
 * سجل overlays / تبويبات المحضر يُحمَّلان بـ import() حتى لا يسحب أول رسم الحقيبة الثقيلة.
 */
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import {
    prefetchExecutionDashboardShell,
    prefetchFollowupMemoPanels,
    prefetchUnifiedSeizureLogHost,
} from './executionDashboardLazyRegistryShell';
import { prefetchExecutionCoreHandlers } from './executionCoreHandlersPrefetch';
import { prefetchExecutionFollowupModalPortal } from './executionFollowupModalLazy';
import { prefetchExecutionFollowupModalHost } from './executionFollowupHostLazy';
import { prefetchExecutionDashboardShellOverlays } from './executionDashboardShellOverlaysLazy';

function skipExecutionOverlayPrefetch(): boolean {
    return isLitePerformanceActive();
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

function loadFollowupTabPrefetch() {
    return import('./executionFollowupTabPrefetch');
}

export function prefetchExecutionShellIntent(): void {
    if (skipExecutionOverlayPrefetch()) return;
    prefetchExecutionDashboardShell();
}

export function prefetchExecutionNotesOverlay(): void {
    if (skipExecutionOverlayPrefetch()) return;
    prefetchExecutionDashboardShellOverlays();
    void loadOverlayRegistry()
        .then((m) => {
            m.prefetchExecutionNotesAndAppointmentModals();
        })
        .catch(() => {});
}

export function prefetchExecutionDocumentsOverlay(): void {
    if (skipExecutionOverlayPrefetch()) return;
    prefetchExecutionDashboardShellOverlays();
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
export function prefetchExecutionFollowupOverlay(): void {
    if (!skipExecutionOverlayPrefetch()) {
        prefetchExecutionShellIntent();
        prefetchFollowupMemoPanels();
    }
    prefetchExecutionFollowupModalHost();
    prefetchExecutionFollowupModalPortal();
    void loadFollowupTabPrefetch()
        .then((m) => {
            m.prefetchExecutionFollowupDefaultTab();
        })
        .catch(() => {});
    prefetchExecutionCoreHandlers('seizure-requests');
}

export function prefetchExecutionFinanceOverlay(_opts?: { force?: boolean }): void {
    if (skipExecutionOverlayPrefetch()) return;
    prefetchExecutionShellIntent();
    void loadOverlayRegistry()
        .then((m) => {
            m.prefetchFinancialOperationsCenter();
            m.prefetchExecutionFinancialHubPortal();
        })
        .catch(() => {});
}

function prefetchExecutionSeizureLogOverlay(): void {
    if (skipExecutionOverlayPrefetch()) return;
    prefetchExecutionShellIntent();
    prefetchExecutionCoreHandlers('seizure-log');
    prefetchUnifiedSeizureLogHost();
}

/** hover شبكة الأدوات — prefetch حسب الزر */
export function prefetchExecutionActionGridTile(tileKey: string): void {
    if (tileKey === 'followup' || tileKey === 'coercive' || tileKey === 'seizure') {
        prefetchExecutionFollowupOverlay();
        if (tileKey === 'coercive') {
            prefetchExecutionCoreHandlers('coercive');
            prefetchExecutionCoreHandlers('coercive-lifecycle');
        }
        return;
    }
    if (skipExecutionOverlayPrefetch()) return;
    prefetchExecutionShellIntent();
    switch (tileKey) {
        case 'appt':
        case 'notes':
            prefetchExecutionNotesOverlay();
            break;
        case 'documents':
            prefetchExecutionDocumentsOverlay();
            break;
        case 'decisions':
            prefetchExecutionDashboardShellOverlays();
            void loadOverlayRegistry()
                .then((m) => {
                    m.prefetchExecutionDecisionsModalContainer();
                    m.prefetchDecisionsAndAppealsEngine();
                })
                .catch(() => {});
            break;
        case 'finance':
            prefetchExecutionFinanceOverlay();
            break;
        case 'seizure-log':
            prefetchExecutionSeizureLogOverlay();
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
