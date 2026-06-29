import { useEffect } from 'react';
import { releaseBodyScrollLock } from '@/app/utils/bodyScrollLock';

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
            event.preventDefault();
            event.stopPropagation();
            if (fieldTasksSheetOpen) {
                onCloseFieldTasksSheet();
                releaseBodyScrollLock();
                return;
            }
            if (showTasksManager) {
                onCloseTasksManager();
                releaseBodyScrollLock();
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
