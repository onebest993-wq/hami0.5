import { useEffect } from 'react';
import { isTasksOverlayEscapeBlocked } from '@/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';

type UseLawyerDashboardTasksOverlayEscapeParams = {
    fieldTasksSheetOpen: boolean;
    showTasksManager: boolean;
    onCloseFieldTasksSheet: () => void;
    onCloseTasksManager: () => void;
};

/** Escape/Cap يغلق ستارة الميدان ثم مدير المهام — مع احترام block coordinator */
export function useLawyerDashboardTasksOverlayEscape({
    fieldTasksSheetOpen,
    showTasksManager,
    onCloseFieldTasksSheet,
    onCloseTasksManager,
}: UseLawyerDashboardTasksOverlayEscapeParams): void {
    useEffect(() => {
        if (!fieldTasksSheetOpen && !showTasksManager) return;

        const consumeBackStack = (): boolean => {
            if (isTasksOverlayEscapeBlocked()) return true;
            if (fieldTasksSheetOpen) {
                onCloseFieldTasksSheet();
                return true;
            }
            if (showTasksManager) {
                onCloseTasksManager();
                return true;
            }
            return false;
        };

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
        const unregisterNativeBack = registerNativeBackHandler(() => consumeBackStack());
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, [
        fieldTasksSheetOpen,
        showTasksManager,
        onCloseFieldTasksSheet,
        onCloseTasksManager,
    ]);
}
