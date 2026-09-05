import { flushSync } from 'react-dom';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { persistFieldTasksSessionOpen } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    paintFieldTasksInstantChrome,
    suppressFieldTasksClose,
} from '@/app/runtime/fieldTasksInstantPaint';
import { warmFieldTasksOnOpen, warmFieldTasksManagerOnOpen } from '@/app/hooks/lawyerDashboard/fieldTasksIntentWarm';
import {
    clearFieldTasksPerfMarks,
    markFieldTasksPerfPhase,
} from '@/app/services/fieldTasks/fieldTasksPerfMetrics';
import { loadFieldTasksSheetModule, loadTasksManagerModule, warmTasksManagerAgendaDevTransforms } from '@/app/runtime/fieldTasksHubLoader';
import type { FieldTasksInstantPaintModule } from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports';
import {
    snapTasksManagerShellClose,
    snapFieldTasksShellClose,
} from '@/app/services/fieldTasks/fieldTasksShellSnap';
import { paintTasksManagerInstantChrome } from '@/app/runtime/tasksManagerInstantPaint';

type CommitFieldTasksSheetOpenParams = {
    instantPaint: FieldTasksInstantPaintModule | null;
    setFieldTasksHostMounted: (mounted: boolean) => void;
    setFieldTasksManagerHostMounted: (mounted: boolean) => void;
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
    setFieldTasksManagerHostMounted,
    setTasksManagerFocusTaskId,
    setShowTasksManager,
    setFieldTasksSheetOpen,
    closeCommunity,
    setActiveTab,
}: CommitFieldTasksSheetOpenParams): void {
    clearFieldTasksPerfMarks();
    markFieldTasksPerfPhase('open-request');
    /** قبل flushSync — وإلا click الشبح بعد pointerup يغلق الستارة فوراً */
    suppressFieldTasksClose();
    snapTasksManagerShellClose();
    paintFieldTasksInstantChrome();
    void loadFieldTasksSheetModule().catch(() => undefined);
    void loadTasksManagerModule().catch(() => undefined);
    warmTasksManagerAgendaDevTransforms();
    warmFieldTasksOnOpen();

    flushSync(() => {
        setFieldTasksHostMounted(true);
        setFieldTasksManagerHostMounted(false);
        setTasksManagerFocusTaskId(undefined);
        setShowTasksManager(false);
        setFieldTasksSheetOpen(true);
        persistFieldTasksSessionOpen(true, 'sheet');
    });

    paintFieldTasksInstantChrome();
    instantPaint?.revealFieldTasksWarmSheet();

    queueMicrotask(() => {
        dismissTransientOverlays('field-tasks');
        closeCommunity?.();
        setActiveTab('home');
    });
}

type CommitTasksManagerOpenParams = {
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
    void loadTasksManagerModule().catch(() => undefined);
    warmFieldTasksManagerOnOpen();
    warmTasksManagerAgendaDevTransforms();
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
