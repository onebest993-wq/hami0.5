import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTasksLifecycle } from '@/app/components/lawyer/dashboard/fieldTasks/useTasksLifecycle';

vi.mock('@/app/hooks/useQuantumTasksContext', () => ({
    useQuantumTasksData: vi.fn(() => ({
        tasks: [],
        pendingTasks: [],
        storageHydrated: true,
    })),
}));

describe('useTasksLifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يعيد hydrated=false عند open=false', () => {
        const { result } = renderHook(() => useTasksLifecycle(false, false));
        expect(result.current).toBe(false);
    });

    it('يعيد hydrated=true بعد open + shellVisible + storage', async () => {
        const onHydrated = vi.fn();
        const { result } = renderHook(() => useTasksLifecycle(true, true, onHydrated));

        await waitFor(() => {
            expect(result.current).toBe(true);
        });
        expect(onHydrated).toHaveBeenCalledTimes(1);
    });
});
