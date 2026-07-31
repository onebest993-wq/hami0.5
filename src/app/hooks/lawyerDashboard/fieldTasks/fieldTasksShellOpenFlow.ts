import { flushSync } from 'react-dom';
import type { MutableRefObject } from 'react';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { persistFieldTasksSessionOpen } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { warmFieldTasksOnOpen } from '@/app/hooks/lawyerDashboard/fieldTasksIntentWarm';
import {
    clearFieldTasksPerfMarks,
    markFieldTasksPerfPhase,
} from '@/app/services/fieldTasks/fieldTasksPerfMetrics';
import {
    warmQuantumTasksDiskRead,
    type FieldTasksInstantPaintModule,
} from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports';

export type CommitFieldTasksSheetOpenParams = {
    sheetOpenRef: MutableRefObject<boolean>;
    instantPaint: FieldTasksInstantPaintModule | null;
    setFieldTasksHostMounted: (mounted: boolean) => void;
    setTasksManagerFocusTaskId: (id: string | undefined) => void;
    setShowTasksManager: (open: boolean) => void;
    setFieldTasksSheetOpen: (open: boolean) => void;
    closeCommunity?: () => void;
    setActiveTab: (tab: 'home') => void;
};

/** فتح ستارة الميدان: reveal فوري ثم commit + warm في microtask. */
export function commitFieldTasksSheetOpen({
    sheetOpenRef,
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

    const revealed = instantPaint?.revealFieldTasksWarmSheet() ?? false;

    const commitOpen = () => {
        setFieldTasksHostMounted(true);
        setTasksManagerFocusTaskId(undefined);
        setShowTasksManager(false);
        setFieldTasksSheetOpen(true);
        persistFieldTasksSessionOpen(true, 'sheet');
    };

    if (revealed) {
        requestAnimationFrame(commitOpen);
    } else {
        flushSync(commitOpen);
    }

    queueMicrotask(() => {
        warmFieldTasksOnOpen();
        dismissTransientOverlays('field-tasks');
        closeCommunity?.();
        setActiveTab('home');
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
    flushSync(() => {
        armFieldTasksManagerHost();
        revealTasksManager(focusTaskId);
    });
    queueMicrotask(() => {
        dismissTransientOverlays('tasks-manager');
        afterOpen?.();
    });
}
