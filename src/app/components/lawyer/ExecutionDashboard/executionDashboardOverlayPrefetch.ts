/**
 * Prefetch overlays التنفيذ — عند hover/قرب الفتح فقط (لا direct import).
 */
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import {
    prefetchDecisionsAndAppealsEngine,
    prefetchFinancialOperationsCenter,
    prefetchFollowupMemoPanels,
    prefetchLawReferencePanel,
} from './executionDashboardLazyShell';
import { prefetchExecutionFollowupDefaultTab } from './executionFollowupTabPrefetch';

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

export function prefetchExecutionFollowupOverlay(): void {
    if (skipExecutionOverlayPrefetch()) return;
    prefetchExecutionFollowupDefaultTab();
    prefetchFollowupMemoPanels();
}

export function prefetchExecutionFinanceOverlay(): void {
    if (skipExecutionOverlayPrefetch()) return;
    prefetchFinancialOperationsCenter();
}

/** hover شبكة الأدوات — prefetch حسب الزر */
export function prefetchExecutionActionGridTile(tileKey: string): void {
    if (skipExecutionOverlayPrefetch()) return;
    switch (tileKey) {
        case 'appt':
        case 'notes':
            prefetchExecutionNotesOverlay();
            break;
        case 'documents':
            prefetchExecutionDocumentsOverlay();
            break;
        case 'decisions':
            prefetchDecisionsAndAppealsEngine();
            break;
        case 'followup':
            prefetchExecutionFollowupOverlay();
            break;
        case 'finance':
            prefetchExecutionFinanceOverlay();
            break;
        case 'law':
            prefetchLawReferencePanel();
            break;
        default:
            break;
    }
}
