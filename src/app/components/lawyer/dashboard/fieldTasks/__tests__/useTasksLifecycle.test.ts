import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTasksLifecycle } from '@/app/components/lawyer/dashboard/fieldTasks/useTasksLifecycle';
import { clearFieldTasksPerfMarks } from '@/app/services/fieldTasks/fieldTasksPerfMetrics';
import { useQuantumTasksData } from '@/app/hooks/useQuantumTasksContext';

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
        clearFieldTasksPerfMarks();
        vi.mocked(useQuantumTasksData).mockReturnValue({
            tasks: [],
            pendingTasks: [],
            storageHydrated: true,
        } as ReturnType<typeof useQuantumTasksData>);
        vi.useRealTimers();
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

    it('T1: interactive احتياطي بعد 1.2s إن تأخرت الجاهزية', () => {
        vi.mocked(useQuantumTasksData).mockReturnValue({
            tasks: [],
            pendingTasks: [],
            storageHydrated: false,
        } as ReturnType<typeof useQuantumTasksData>);

        vi.useFakeTimers();
        const onHydrated = vi.fn();
        const { result } = renderHook(() => useTasksLifecycle(true, true, onHydrated));
        expect(result.current).toBe(false);

        act(() => {
            vi.advanceTimersByTime(1_200);
        });

        expect(result.current).toBe(true);
        expect(onHydrated).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });
});
