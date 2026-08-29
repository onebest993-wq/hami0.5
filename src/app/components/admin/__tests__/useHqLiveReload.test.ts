import React, { createElement } from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HQ_STATUS_REFRESH_EVENT } from '@/app/components/admin/hqStatusEvents';
import { HqPaneActiveContext } from '@/app/components/admin/hqPaneActive';
import { useHqLiveReload } from '../useHqLiveReload';

function HookHost({ reload }: { reload: () => void }) {
    useHqLiveReload(reload);
    return null;
}

describe('useHqLiveReload', () => {
    it('يستدعي reload عند حدث نبض المقر', async () => {
        const reload = vi.fn();
        renderHook(() => useHqLiveReload(reload));
        await act(async () => {
            window.dispatchEvent(new Event(HQ_STATUS_REFRESH_EVENT));
        });
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('يجمع حدثين في نفس الدورة', async () => {
        const reload = vi.fn();
        renderHook(() => useHqLiveReload(reload));
        await act(async () => {
            window.dispatchEvent(new Event(HQ_STATUS_REFRESH_EVENT));
            window.dispatchEvent(new Event(HQ_STATUS_REFRESH_EVENT));
        });
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('يزيل المستمع عند الإلغاء', async () => {
        const reload = vi.fn();
        const { unmount } = renderHook(() => useHqLiveReload(reload));
        unmount();
        await act(async () => {
            window.dispatchEvent(new Event(HQ_STATUS_REFRESH_EVENT));
        });
        expect(reload).not.toHaveBeenCalled();
    });

    it('يؤجّل الجلب للتبويب المخفي ثم يزامنه عند الإظهار', async () => {
        const reload = vi.fn();
        const { rerender } = render(
            createElement(
                HqPaneActiveContext.Provider,
                { value: false },
                createElement(HookHost, { reload }),
            ),
        );
        await act(async () => {
            window.dispatchEvent(new Event(HQ_STATUS_REFRESH_EVENT));
        });
        expect(reload).not.toHaveBeenCalled();
        rerender(
            createElement(
                HqPaneActiveContext.Provider,
                { value: true },
                createElement(HookHost, { reload }),
            ),
        );
        expect(reload).toHaveBeenCalledTimes(1);
    });
});
