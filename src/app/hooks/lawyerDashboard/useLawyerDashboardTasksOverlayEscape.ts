import { useEffect } from 'react';
import { isTasksOverlayEscapeBlocked } from '@/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator';

type UseLawyerDashboardTasksOverlayEscapeParams = {
    fieldTasksSheetOpen: boolean;
    showTasksManager: boolean;
    onCloseFieldTasksSheet: () => void;
    onCloseTasksManager: () => void;
};

/** Escape يغلق ستارة الميدان ثم مدير المهام — مع تحرير قفل التمرير */
export function useLawyerDashboardTasksOverlayEscape({
    fieldTasksSheetOpen,
    showTasksManager,
    onCloseFieldTasksSheet,
    onCloseTasksManager,
}: UseLawyerDashboardTasksOverlayEscapeParams): void {
    useEffect(() => {
        if (!fieldTasksSheetOpen && !showTasksManager) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (isTasksOverlayEscapeBlocked()) return;
            event.preventDefault();
            event.stopPropagation();
            if (fieldTasksSheetOpen) {
                onCloseFieldTasksSheet();
                return;
            }
            if (showTasksManager) {
                onCloseTasksManager();
            }
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [
        fieldTasksSheetOpen,
        showTasksManager,
        onCloseFieldTasksSheet,
        onCloseTasksManager,
    ]);
}
