import { scheduleLawyerShellPrefetch } from '@/app/runtime/deferredShellPrefetch';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { hubArchiveIdFromWidget } from '@/app/services/hub/hubShellNavigation';import type { HomeWidgetId } from '@/app/services/settings/homeLayout';

export type DockWidgetPrefetchPhase = 'hover' | 'open';

/** تحميل مسبق مؤجَّل لـ shell الرئيسي — بحث + بطاقات الواجهة */
export function prefetchLawyerDashboardCriticalShell(): void {
    onDashboardInteractive(() => scheduleLawyerShellPrefetch());
}
export type HubArchivePrefetchPhase = 'hover' | 'open';

function loadLazyComponentsIntent() {
    return import('@/app/utils/lazyComponentsIntent');
}

function loadNotepadIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/notepadIntentWarm');
}

function loadScheduleIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/scheduleIntentWarm');
}

function loadRepositoryIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/repositoryIntentWarm');
}

/** prefetch عند hover/لمس — قبل النقر */
export function prefetchHubArchiveIntent(
    archiveId: string,
    phase: HubArchivePrefetchPhase = 'hover',
    userId?: string | null,
): void {
    if (typeof window === 'undefined') return;
    switch (archiveId) {
        case 'execution': {
            void import('@/app/runtime/executionArchivePrimeHost').then((m) =>
                m.dispatchExecutionArchivePrimeHost(),
            );
            void import('@/app/runtime/executionArchiveOpenSession').then((m) =>
                m.prefetchExecutionArchiveOpen(),
            );
            void import('@/app/runtime/executionWorkspaceWarm').then((m) =>
                m.warmExecutionWorkspace({
                    includeSecondary: false,
                    secondaryDelayMs: 1_200,
                }),
            );
            break;
        }
        case 'lawsuit':
            void loadLazyComponentsIntent().then((m) =>
                m.warmLawsuitWorkspace({ includeSecondary: false }),
            );
            break;
        case 'transaction':
            void import('@/app/hooks/lawyerDashboard/transactionsIntentWarm').then((m) => {
                if (phase === 'open') m.warmTransactionsOnOpen(userId);
                else m.warmTransactionsOnHover(userId);
            });
            break;
        default:
            break;
    }
}

/**
 * خريطة prefetch للدوك والبطاقات — hover قبل النقر.
 * لا تُحمّل كل overlays دفعة واحدة؛ كل widget ي prefetch مساره فقط.
 */
export function prefetchDockWidgetIntent(
    widgetId: HomeWidgetId,
    phase: DockWidgetPrefetchPhase = 'hover',
): void {
    if (typeof window === 'undefined') return;

    switch (widgetId) {
        case 'dockRepository':
            void loadRepositoryIntentWarm().then((m) => {
                if (phase === 'open') m.warmRepositoryOnOpen();
                else m.warmRepositoryHubOnHover();
            });
            break;
        case 'dockNotepad':
            void loadRepositoryIntentWarm().then((m) => {
                if (phase === 'open') m.warmRepositoryOnOpen();
                else m.warmRepositoryHubOnHover();
            });
            break;
        case 'dockQuickNote':
            void loadNotepadIntentWarm().then((m) => m.warmNotepadOnHover());
            if (phase === 'open') {
                void loadLazyComponentsIntent().then((m) => m.prefetchVoiceRecorderModal());
            }
            break;
        case 'dockCalendar':
            void loadScheduleIntentWarm().then((m) => {
                if (phase === 'open') m.warmScheduleOnOpen();
                else m.warmScheduleOnHover();
            });
            break;
        case 'dockVault':
            void loadRepositoryIntentWarm().then((m) => {
                if (phase === 'open') m.warmRepositoryOnOpen();
                else m.warmRepositoryHubOnHover();
            });
            break;
        case 'dockTasks':
            void import('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm').then((m) => {
                if (phase === 'open') m.warmFieldTasksOnOpen();
                else m.warmFieldTasksOnHover();
            });
            break;
        case 'alerts':
            void loadLazyComponentsIntent().then((m) => {
                m.prefetchLawyerHomeHubCard();
                m.prefetchNotificationPanel();
            });
            break;
        case 'forum':
            void import('@/app/hooks/lawyerDashboard/forumIntentWarm').then((m) => {
                if (phase === 'open') m.warmForumOnOpen();
                else m.warmForumOnHover();
            });
            break;
        case 'hubExecution':
        case 'hubLawsuit':
        case 'hubTransaction': {
            const archiveId = hubArchiveIdFromWidget(widgetId);
            if (archiveId) prefetchHubArchiveIntent(archiveId);
            break;
        }
        default:
            void loadLazyComponentsIntent().then((m) => m.prefetchArchivePortal());
            break;
    }
}

/** prefetch خفيف عند دخول منطقة الإنتاجية (settings drawer…) */
export function prefetchProductivityIntent(): void {
    void loadLazyComponentsIntent().then((m) => {
        m.warmSettingsShell();
        m.warmNotepadAndProfile();
        m.warmTasksWorkspace();
    });
}
