import { EnsureQuantumTasksProvider } from '@/app/context/QuantumTasksProvider';
import { TasksErrorBoundary } from '@/app/components/lawyer/dashboard/TasksErrorBoundary';
import { FieldTasksSheetHost } from '@/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetHost';
import { FieldTasksManagerHost } from '@/app/components/lawyer/dashboard/fieldTasks/FieldTasksManagerHost';
import {
    SUSPENDED_EXECUTION_FILES,
    SUSPENDED_LAWSUIT_FILES,
} from '@/app/constants/keepAliveSuspendedProps';
import type { LawyerDashboardOverlaysBundleProps } from '../lawyerDashboardOverlaysBundles';

/**
 * مهام الميدان خارج Suspense.
 * EnsureQuantumTasksProvider هنا — FullBoot بلا Provider ساكن حتى لا يُعاد تركيب المنزل.
 */
export function LawyerDashboardFieldTasksOverlayEntry({
    data,
    overlays,
}: Pick<LawyerDashboardOverlaysBundleProps, 'data' | 'overlays'>) {
    const { files, executionFiles } = data;
    const {
        fieldTasksSheetOpen,
        fieldTasksHostMounted,
        fieldTasksManagerHostMounted,
        fieldTasksSheetSessionKey,
        closeFieldTasksSheet,
        showTasksManager,
        tasksManagerSessionKey,
        closeTasksManager,
        switchToTasksManager,
        tasksManagerFocusTaskId,
    } = overlays;

    const sheetLive = fieldTasksSheetOpen || fieldTasksHostMounted;
    const managerLive = showTasksManager || fieldTasksManagerHostMounted;

    if (!sheetLive && !managerLive) return null;

    return (
        <EnsureQuantumTasksProvider>
            {sheetLive ? (
                <FieldTasksSheetHost
                    key={`field-tasks-sheet-${fieldTasksSheetSessionKey}`}
                    open={fieldTasksSheetOpen}
                    keepAlive={fieldTasksHostMounted && !fieldTasksSheetOpen}
                    onClose={closeFieldTasksSheet}
                    onManageAll={switchToTasksManager}
                    lawsuitFiles={fieldTasksSheetOpen ? files : SUSPENDED_LAWSUIT_FILES}
                    executionFiles={fieldTasksSheetOpen ? executionFiles : SUSPENDED_EXECUTION_FILES}
                />
            ) : null}

            {managerLive ? (
                <TasksErrorBoundary onClose={closeTasksManager}>
                    <FieldTasksManagerHost
                        key={`tasks-manager-overlay-${tasksManagerSessionKey}`}
                        open={showTasksManager}
                        onClose={closeTasksManager}
                        focusTaskId={tasksManagerFocusTaskId}
                        lawsuitFiles={showTasksManager ? files : SUSPENDED_LAWSUIT_FILES}
                        executionFiles={
                            showTasksManager ? executionFiles : SUSPENDED_EXECUTION_FILES
                        }
                    />
                </TasksErrorBoundary>
            ) : null}
        </EnsureQuantumTasksProvider>
    );
}
