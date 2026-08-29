import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HQ_PANEL_LOAD_BUDGET_MS, useHqPanelLoad } from '../useHqPanelLoad';

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    ensureCsrfSessionReady: vi.fn(async () => undefined),
}));

describe('useHqPanelLoad', () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    it('ينهي التحميل بعد نجاح العمل', async () => {
        const work = vi.fn(async () => undefined);
        const { result } = renderHook(() => useHqPanelLoad(work));
        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.failed).toBe(false);
        expect(work).toHaveBeenCalledTimes(1);
    });

    it('ينهي التحميل حتى لو رمى العمل', async () => {
        const work = vi.fn(async () => {
            throw new Error('boom');
        });
        const { result } = renderHook(() => useHqPanelLoad(work));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.failed).toBe(true);
        expect(work).toHaveBeenCalledTimes(1);
    });

    it('reload يعيد التحميل ثم ينهيه', async () => {
        const work = vi.fn(async () => undefined);
        const { result } = renderHook(() => useHqPanelLoad(work));
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => {
            await result.current.reload();
        });
        expect(result.current.loading).toBe(false);
        expect(result.current.failed).toBe(false);
        expect(work).toHaveBeenCalledTimes(2);
    });

    it('reload بعد النجاح لا يعيد شاشة التحميل', async () => {
        let release: (() => void) | undefined;
        const work = vi.fn(async () => {
            if (work.mock.calls.length === 1) return;
            await new Promise<void>((resolve) => {
                release = resolve;
            });
        });
        const { result } = renderHook(() => useHqPanelLoad(work));
        await waitFor(() => expect(result.current.loading).toBe(false));
        let reloadDone = false;
        await act(async () => {
            const pending = result.current.reload().then(() => {
                reloadDone = true;
            });
            await Promise.resolve();
            expect(result.current.loading).toBe(false);
            release?.();
            await pending;
        });
        expect(reloadDone).toBe(true);
        expect(result.current.loading).toBe(false);
        expect(work).toHaveBeenCalledTimes(2);
    });

    it('ينهي التحميل بعد ميزانية المهلة إذا علّق العمل', async () => {
        vi.useFakeTimers();
        const work = vi.fn(() => new Promise<void>(() => {}));
        const { result } = renderHook(() => useHqPanelLoad(work));
        expect(result.current.loading).toBe(true);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(HQ_PANEL_LOAD_BUDGET_MS);
        });
        expect(result.current.loading).toBe(false);
        expect(result.current.failed).toBe(true);
        expect(result.current.failKind).toBe('timeout');
        vi.useRealTimers();
    });

    it('alreadySettled لا يبدأ بشاشة التحميل', async () => {
        const work = vi.fn(async () => undefined);
        const { result } = renderHook(() => useHqPanelLoad(work, { alreadySettled: true }));
        expect(result.current.loading).toBe(false);
        await waitFor(() => expect(work).toHaveBeenCalledTimes(1));
        expect(result.current.loading).toBe(false);
        expect(result.current.failed).toBe(false);
    });

    it('skipFirstWork لا يجلب في التركيب الأول ويسمح بالتحديث', async () => {
        const work = vi.fn(async () => undefined);
        const { result } = renderHook(() =>
            useHqPanelLoad(work, { alreadySettled: true, skipFirstWork: true }),
        );
        expect(result.current.loading).toBe(false);
        await act(async () => {
            await Promise.resolve();
        });
        expect(work).not.toHaveBeenCalled();
        await act(async () => {
            await result.current.reload();
        });
        expect(work).toHaveBeenCalledTimes(1);
        expect(result.current.failed).toBe(false);
    });

    it('يلغي مهلة الميزانية بعد النجاح فلا يفشل لاحقاً', async () => {
        vi.useFakeTimers();
        const work = vi.fn(async () => undefined);
        const { result } = renderHook(() => useHqPanelLoad(work));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(result.current.loading).toBe(false);
        expect(result.current.failed).toBe(false);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(HQ_PANEL_LOAD_BUDGET_MS + 50);
        });
        expect(result.current.failed).toBe(false);
        vi.useRealTimers();
    });
});
