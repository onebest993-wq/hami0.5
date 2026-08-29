import type { HomeWidgetId } from '@/app/services/settings/homeLayout';
import { hubArchiveIdFromWidget } from '@/app/services/hub/hubShellNavigation';
import { requestHomeHubEntryOpen } from '@/app/services/alerts/homeHubEntryOpen';
import type { LawyerDashboardHomeTabProps } from './lawyerDashboardHomeTab.types';

export type HomeFirstPaintActivators = Pick<
    LawyerDashboardHomeTabProps,
    | 'onOpenCalendar'
    | 'onOpenFieldTasksSheet'
    | 'onOpenFullNotepad'
    | 'onOpenRepository'
    | 'onOpenVault'
    | 'onOpenCommunity'
    | 'onOpenArchive'
>;

/** تفعيل بلاطة المنزل قبل وصول مقطع commandHub — نفس الوجهات الحية. */
export function activateHomeFirstPaintWidget(
    id: HomeWidgetId,
    handlers: HomeFirstPaintActivators,
): void {
    switch (id) {
        case 'dockCalendar':
            handlers.onOpenCalendar();
            return;
        case 'dockTasks':
            handlers.onOpenFieldTasksSheet();
            return;
        case 'dockRepository':
        case 'dockNotepad':
        case 'dockVault':
            if (handlers.onOpenRepository) {
                handlers.onOpenRepository({ tab: 'notepad' });
                return;
            }
            if (id === 'dockVault') {
                handlers.onOpenVault();
                return;
            }
            handlers.onOpenFullNotepad();
            return;
        case 'forum':
            handlers.onOpenCommunity();
            return;
        case 'alerts':
            requestHomeHubEntryOpen();
            return;
        case 'hubExecution':
        case 'hubLawsuit':
        case 'hubTransaction': {
            const archiveId = hubArchiveIdFromWidget(id);
            if (archiveId) handlers.onOpenArchive(archiveId);
            return;
        }
        default:
            return;
    }
}
