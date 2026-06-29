import { scheduleLawyerShellPrefetch } from '@/app/runtime/deferredShellPrefetch';
import { hubArchiveIdFromWidget } from '@/app/services/hub/hubShellNavigation';
import type { HomeWidgetId } from '@/app/services/settings/homeLayout';
import {
    prefetchArchivePortal,
    prefetchCommunityScreen,
    prefetchLawyerHomeHubCard,
    prefetchNotificationPanel,
    prefetchVoiceRecorderModal,
    warmExecutionWorkspace,
    warmLawsuitWorkspace,
    warmNotepadAndProfile,
    warmSettingsShell,
    warmTasksWorkspace,
} from '@/app/utils/lazyComponents';
import { warmForumOnHover } from '@/app/hooks/lawyerDashboard/forumIntentWarm';
import { warmHomeOnHover } from '@/app/hooks/lawyerDashboard/homeIntentWarm';
import { warmNotepadOnHover } from '@/app/hooks/lawyerDashboard/notepadIntentWarm';
import { warmFieldTasksOnHover } from '@/app/hooks/lawyerDashboard/fieldTasksIntentWarm';
import { warmScheduleOnHover } from '@/app/hooks/lawyerDashboard/scheduleIntentWarm';
import { warmTransactionsOnHover, warmTransactionsOnOpen } from '@/app/hooks/lawyerDashboard/transactionsIntentWarm';
import { warmVaultOnHover } from '@/app/hooks/lawyerDashboard/vaultIntentWarm';
import {
    warmRepositoryHubOnHover,
    warmRepositoryOnOpen,
} from '@/app/hooks/lawyerDashboard/repositoryIntentWarm';

export type DockWidgetPrefetchPhase = 'hover' | 'open';

/** تحميل مسبق مؤجَّل لـ shell الرئيسي — بحث + بطاقات الواجهة */
export function prefetchLawyerDashboardCriticalShell(): void {
    scheduleLawyerShellPrefetch();
}

export type HubArchivePrefetchPhase = 'hover' | 'open';

/** prefetch عند hover/لمس — قبل النقر */
export function prefetchHubArchiveIntent(
    archiveId: string,
    phase: HubArchivePrefetchPhase = 'hover',
    userId?: string | null,
): void {
    if (typeof window === 'undefined') return;
    switch (archiveId) {
        case 'execution':
            warmExecutionWorkspace();
            break;
        case 'lawsuit':
            warmLawsuitWorkspace();
            break;
        case 'transaction':
            if (phase === 'open') warmTransactionsOnOpen(userId);
            else warmTransactionsOnHover();
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
            if (phase === 'open') warmRepositoryOnOpen();
            else warmRepositoryHubOnHover();
            break;
        case 'dockNotepad':
            warmNotepadOnHover();
            break;
        case 'dockQuickNote':
            warmNotepadOnHover();
            if (phase === 'open') prefetchVoiceRecorderModal();
            break;
        case 'dockCalendar':
            warmScheduleOnHover();
            break;
        case 'dockVault':
            warmVaultOnHover();
            break;
        case 'dockTasks':
            warmFieldTasksOnHover();
            break;
        case 'alerts':
            prefetchLawyerHomeHubCard();
            prefetchNotificationPanel();
            void import('@/app/components/lawyer/dashboard/HomeDockQuickSheet').catch(() => undefined);
            break;
        case 'forum':
            warmForumOnHover();
            break;
        case 'hubExecution':
        case 'hubLawsuit':
        case 'hubTransaction': {
            const archiveId = hubArchiveIdFromWidget(widgetId);
            if (archiveId) prefetchHubArchiveIntent(archiveId);
            break;
        }
        default:
            prefetchArchivePortal();
            break;
    }
}

/** prefetch خفيف عند دخول منطقة الإنتاجية (settings drawer…) */
export function prefetchProductivityIntent(): void {
    warmSettingsShell();
    warmNotepadAndProfile();
    warmTasksWorkspace();
}
