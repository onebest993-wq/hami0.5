import type { HomeWidgetId } from '@/app/services/settings/homeLayout';
import type { SectionChunkId } from '@/app/runtime/sectionChunkRecency';
import { rememberOpenedSectionChunk } from '@/app/runtime/sectionChunkRecency';

export function sectionChunkIdFromDockWidget(widgetId: HomeWidgetId): SectionChunkId | null {
    switch (widgetId) {
        case 'forum':
            return 'forum';
        case 'dockRepository':
        case 'dockNotepad':
        case 'dockVault':
        case 'dockQuickNote':
            return 'repository';
        case 'dockCalendar':
            return 'schedule';
        case 'dockTasks':
            return 'fieldTasks';
        case 'hubExecution':
            return 'execution';
        case 'hubLawsuit':
            return 'lawsuit';
        case 'hubTransaction':
            return 'transaction';
        case 'alerts':
            return 'notifications';
        default:
            return null;
    }
}

export function rememberOpenedSectionChunkFromDock(widgetId: HomeWidgetId): void {
    const id = sectionChunkIdFromDockWidget(widgetId);
    if (id) rememberOpenedSectionChunk(id);
}

export function preloadSectionChunk(id: SectionChunkId): Promise<void> {
    switch (id) {
        case 'forum':
            return import('@/app/runtime/communityOverlayEntryLoader').then((m) => {
                m.prefetchCommunityOverlayEntry();
            });
        case 'execution':
            return Promise.all([
                import('@/app/runtime/executionOverlayEntryLoader').then((m) => {
                    m.prefetchExecutionOverlayEntries();
                }),
                import('@/app/components/lawyer/dashboard/overlayInstantChromeLazy').then((m) =>
                    m.LazyExecutionArchiveInstantChrome.preload(),
                ),
            ]).then(() => undefined);
        case 'lawsuit':
            return import('@/app/runtime/lawsuitsOverlayEntryLoader').then((m) => {
                m.prefetchLawsuitsOverlayEntry();
            });
        case 'transaction':
            return import('@/app/runtime/transactionsHubLoader').then((m) => {
                m.prefetchTransactionsHubModule();
            });
        case 'repository':
            return import('@/app/runtime/repositoryHubLoader').then((m) => {
                m.prefetchRepositoryHubModule();
            });
        case 'schedule':
            return import('@/app/runtime/scheduleHubLoader').then((m) => {
                m.prefetchScheduleTabHostModule();
            });
        case 'fieldTasks':
            return import('@/app/runtime/fieldTasksHubLoader').then((m) => {
                m.prefetchFieldTasksSheetModule();
            });
        case 'settings':
            return import('@/app/runtime/settingsOverlayEntryLoader').then((m) => {
                m.prefetchSettingsOverlayEntry();
            });
        case 'notifications':
            return import('@/app/runtime/notificationShellLoader').then((m) => {
                m.prefetchNotificationShellModule();
            });
        case 'search':
            return import('@/app/runtime/globalSearchLoader').then((m) => {
                m.prefetchGlobalSearchDashboardEntryChunk();
                m.prefetchGlobalSearchInstantPaintCover();
            });
        case 'profile':
            return import('@/app/runtime/profileTabHostLoader').then((m) => {
                m.prefetchProfileTabHost();
            });
        case 'criminal':
            return Promise.all([
                import('@/app/runtime/criminalOverlayEntryLoader').then((m) => {
                    m.prefetchCriminalOverlayEntry();
                }),
                import('@/app/components/lawyer/dashboard/overlayInstantChromeLazy').then((m) =>
                    m.LazyCriminalDashboardBootChrome.preload(),
                ),
            ]).then(() => undefined);
        default:
            return Promise.resolve();
    }
}
