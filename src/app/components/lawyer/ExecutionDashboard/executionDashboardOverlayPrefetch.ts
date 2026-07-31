/**
 * Prefetch overlays التنفيذ — عند hover/قرب الفتح (ومسار حرج للمحضر حتى على lite).
 */
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import {
    prefetchDecisionsAndAppealsEngine,
    prefetchExecutionDashboardShell,
    prefetchFinancialOperationsCenter,
    prefetchFollowupMemoPanels,
    prefetchLawReferencePanel,
} from './executionDashboardLazyShell';
import {
    prefetchExecutionDecisionsModalContainer,
    prefetchExecutionFinancialHubPortal,
    prefetchUnifiedSeizureLogHost,
} from './executionDashboardLazyRegistry';
import { prefetchExecutionCoreHandlers } from './executionCoreHandlersPrefetch';
import { prefetchExecutionDashboardShellOverlays } from './executionDashboardShellOverlaysLazy';
import { prefetchExecutionFollowupModalPortal } from './executionFollowupModalLazy';
import { prefetchExecutionFollowupDefaultTab, prefetchExecutionFollowupTab } from './executionFollowupTabPrefetch';

const notesOverlayImport = () =>
    import('./components/ExecutionNotesAndAppointmentModals').then((m) => ({
        default: m.ExecutionNotesAndAppointmentModals,
    }));

const documentsOverlayImport = () =>
    import('../DocumentVault').then((m) => ({ default: m.DocumentVault }));

const dossierActionsImport = () =>
    import('./components/DossierActionsModal').then((m) => ({ default: m.DossierActionsModal }));

const fullTimelineImport = () =>
    import('./components/ExecutionFullTimelineModalContainer').then((m) => ({
        default: m.ExecutionFullTimelineModalContainer,
    }));

const unifiedSummonsImport = () =>
    import('./components/UnifiedSummonsModalContainer').then((m) => ({
        default: m.UnifiedSummonsModalContainer,
    }));

function skipExecutionOverlayPrefetch(): boolean {
    return isLitePerformanceActive();
}

export function prefetchExecutionShellIntent(): void {
    if (skipExecutionOverlayPrefetch()) return;
    prefetchExecutionDashboardShell();
}

export function prefetchExecutionNotesOverlay(): void {
    if (skipExecutionOverlayPrefetch()) return;
    void notesOverlayImport().catch(() => {});
}

export function prefetchExecutionDocumentsOverlay(): void {
    if (skipExecutionOverlayPrefetch()) return;
    void documentsOverlayImport().catch(() => {});
}

export function prefetchExecutionDossierActionsOverlay(): void {
    if (skipExecutionOverlayPrefetch()) return;
    void dossierActionsImport().catch(() => {});
}

export function prefetchExecutionFullTimelineOverlay(): void {
    if (skipExecutionOverlayPrefetch()) return;
    void fullTimelineImport().catch(() => {});
}

export function prefetchExecutionUnifiedSummonsOverlay(): void {
    if (skipExecutionOverlayPrefetch()) return;
    void unifiedSummonsImport().catch(() => {});
}

/**
 * مسار محضر المتابعة الحرج — يعمل حتى على lite لتقليل Suspense عند أول فتح.
 * ShellOverlays + Portal + تبويب الحجز الافتراضي + جسور الطلبات.
 */
export function prefetchExecutionFollowupOverlay(): void {
    if (!skipExecutionOverlayPrefetch()) {
        prefetchExecutionShellIntent();
        prefetchFollowupMemoPanels();
    }
    prefetchExecutionDashboardShellOverlays();
    prefetchExecutionFollowupModalPortal();
    prefetchExecutionFollowupDefaultTab();
    prefetchExecutionFollowupTab('other_party');
    prefetchExecutionCoreHandlers('seizure-requests');
}

export function prefetchExecutionFinanceOverlay(_opts?: { force?: boolean }): void {
    if (skipExecutionOverlayPrefetch()) return;
    prefetchExecutionShellIntent();
    prefetchFinancialOperationsCenter();
    prefetchExecutionFinancialHubPortal();
}

export function prefetchExecutionSeizureLogOverlay(): void {
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
            prefetchExecutionCoreHandlers('light');
            prefetchExecutionNotesOverlay();
            break;
        case 'documents':
            prefetchExecutionDocumentsOverlay();
            break;
        case 'decisions':
            prefetchExecutionDecisionsModalContainer();
            prefetchDecisionsAndAppealsEngine();
            break;
        case 'finance':
            prefetchExecutionFinanceOverlay();
            break;
        case 'seizure-log':
            prefetchExecutionSeizureLogOverlay();
            break;
        case 'law':
            prefetchLawReferencePanel();
            break;
        default:
            break;
    }
}
