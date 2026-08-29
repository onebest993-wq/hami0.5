import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHqTabKeepAlive } from '../useHqTabKeepAlive';

describe('useHqTabKeepAlive', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('يركب التبويب النشط ويسخّن المستخدمين بعد خمول المراقبة', async () => {
        vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
            cb();
            return 1;
        });
        vi.stubGlobal('cancelIdleCallback', () => undefined);
        const { result } = renderHook(() => useHqTabKeepAlive('monitor'));
        expect(result.current.isMounted('monitor')).toBe(true);
        await waitFor(() => expect(result.current.isMounted('users')).toBe(true));
        expect(result.current.isMounted('reports')).toBe(false);
    });

    it('warmTab يركّب التبويب ولا يسخّن القوانين مسبقاً', () => {
        vi.stubGlobal('requestIdleCallback', () => 1);
        vi.stubGlobal('cancelIdleCallback', () => undefined);
        const { result } = renderHook(() => useHqTabKeepAlive('monitor'));
        act(() => {
            result.current.warmTab('reports');
            result.current.warmTab('laws');
        });
        expect(result.current.isMounted('reports')).toBe(true);
        expect(result.current.isMounted('laws')).toBe(false);
    });

    it('زيارة تبويب جديد تبقيه مركّباً بعد المغادرة', () => {
        vi.stubGlobal('requestIdleCallback', () => 1);
        vi.stubGlobal('cancelIdleCallback', () => undefined);
        const { result, rerender } = renderHook(({ tab }) => useHqTabKeepAlive(tab), {
            initialProps: { tab: 'monitor' as const },
        });
        rerender({ tab: 'reports' });
        expect(result.current.isMounted('monitor')).toBe(true);
        expect(result.current.isMounted('reports')).toBe(true);
    });
});
