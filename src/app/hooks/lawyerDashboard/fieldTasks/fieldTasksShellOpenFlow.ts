import { flushSync } from 'react-dom';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { persistFieldTasksSessionOpen } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { warmFieldTasksOnOpen, warmFieldTasksManagerOnOpen } from '@/app/hooks/lawyerDashboard/fieldTasksIntentWarm';
import {
    clearFieldTasksPerfMarks,
    markFieldTasksPerfPhase,
} from '@/app/services/fieldTasks/fieldTasksPerfMetrics';
import { warmQuantumTasksDiskRead } from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports';
import { prefetchFieldTasksSheetModule, loadFieldTasksSheetModule, prefetchTasksManagerModule } from '@/app/runtime/fieldTasksHubLoader';
import type { FieldTasksInstantPaintModule } from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports';
import {
    snapFieldTasksShellOpen,
    snapTasksManagerShellClose,
    snapFieldTasksShellClose,
} from '@/app/services/fieldTasks/fieldTasksShellSnap';
import { paintTasksManagerInstantChrome } from '@/app/runtime/tasksManagerInstantPaint';

export type CommitFieldTasksSheetOpenParams = {
    instantPaint: FieldTasksInstantPaintModule | null;
    setFieldTasksHostMounted: (mounted: boolean) => void;
    setTasksManagerFocusTaskId: (id: string | undefined) => void;
    setShowTasksManager: (open: boolean) => void;
    setFieldTasksSheetOpen: (open: boolean) => void;
    closeCommunity?: () => void;
    setActiveTab: (tab: 'home') => void;
};

/** فتح ستارة الميدان: commit فوري على اللمس؛ التسخين بعد paint */
export function commitFieldTasksSheetOpen({
    instantPaint,
    setFieldTasksHostMounted,
    setTasksManagerFocusTaskId,
    setShowTasksManager,
    setFieldTasksSheetOpen,
    closeCommunity,
    setActiveTab,
}: CommitFieldTasksSheetOpenParams): void {
    clearFieldTasksPerfMarks();
    markFieldTasksPerfPhase('open-request');

    warmQuantumTasksDiskRead();
    prefetchFieldTasksSheetModule();
    warmFieldTasksOnOpen();

    const revealed = (() => {
        snapTasksManagerShellClose();
        snapFieldTasksShellOpen();
        return instantPaint?.revealFieldTasksWarmSheet() ?? false;
    })();

    flushSync(() => {
        setFieldTasksHostMounted(true);
        setTasksManagerFocusTaskId(undefined);
        setShowTasksManager(false);
        setFieldTasksSheetOpen(true);
        persistFieldTasksSessionOpen(true, 'sheet');
    });

    if (!revealed) {
        instantPaint?.revealFieldTasksWarmSheet();
    }

    queueMicrotask(() => {
        dismissTransientOverlays('field-tasks');
        closeCommunity?.();
        setActiveTab('home');
        void loadFieldTasksSheetModule()
            .then(() => prefetchTasksManagerModule())
            .catch(() => undefined);
    });
}

export type CommitTasksManagerOpenParams = {
    focusTaskId?: string;
    armFieldTasksManagerHost: () => void;
    revealTasksManager: (focusTaskId?: string) => void;
    afterOpen?: () => void;
};

export function commitTasksManagerOpen({
    focusTaskId,
    armFieldTasksManagerHost,
    revealTasksManager,
    afterOpen,
}: CommitTasksManagerOpenParams): void {
    clearFieldTasksPerfMarks();
    markFieldTasksPerfPhase('open-request');
    warmFieldTasksManagerOnOpen();
    snapFieldTasksShellClose();
    paintTasksManagerInstantChrome();
    flushSync(() => {
        armFieldTasksManagerHost();
        revealTasksManager(focusTaskId);
    });
    queueMicrotask(() => {
        dismissTransientOverlays('tasks-manager');
        afterOpen?.();
    });
}
