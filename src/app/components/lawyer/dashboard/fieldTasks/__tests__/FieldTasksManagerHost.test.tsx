import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FieldTasksManagerHost } from '@/app/components/lawyer/dashboard/fieldTasks/FieldTasksManagerHost';

const loaderMocks = vi.hoisted(() => ({
    getCachedTasksManagerOverlay: vi.fn(),
    loadTasksManagerModule: vi.fn(),
}));

const instantMocks = vi.hoisted(() => ({
    removeTasksManagerInstantChrome: vi.fn(),
}));

vi.mock('@/app/runtime/fieldTasksHubLoader', () => ({
    getCachedTasksManagerOverlay: loaderMocks.getCachedTasksManagerOverlay,
    loadTasksManagerModule: loaderMocks.loadTasksManagerModule,
}));

vi.mock('@/app/runtime/tasksManagerInstantPaint', () => ({
    removeTasksManagerInstantChrome: instantMocks.removeTasksManagerInstantChrome,
}));

vi.mock('@/app/components/lawyer/dashboard/tasksManager/TasksManagerOpenInstantChrome', () => ({
    TasksManagerOpenInstantChrome: () => <div data-testid="tasks-manager-open-instant-chrome" />,
}));

describe('FieldTasksManagerHost', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.stubGlobal('requestIdleCallback', vi.fn(() => 1));
        vi.stubGlobal('cancelIdleCallback', vi.fn());
        loaderMocks.getCachedTasksManagerOverlay.mockReturnValue(null);
        loaderMocks.loadTasksManagerModule.mockRejectedValue(new Error('load failed'));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('يلغي retry المؤجل عند فك التركيب حتى لا يعيد التحميل بعد الإغلاق', async () => {
        const { unmount } = render(
            <FieldTasksManagerHost open onClose={vi.fn()} keepAlive={false} />,
        );

        expect(loaderMocks.loadTasksManagerModule).toHaveBeenCalledTimes(1);

        await vi.runOnlyPendingTimersAsync();
        expect(loaderMocks.loadTasksManagerModule).toHaveBeenCalledTimes(2);

        unmount();
        await vi.runAllTimersAsync();

        expect(loaderMocks.loadTasksManagerModule).toHaveBeenCalledTimes(2);
    });
});
