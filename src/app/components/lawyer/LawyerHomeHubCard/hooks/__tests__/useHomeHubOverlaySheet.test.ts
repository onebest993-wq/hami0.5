import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHomeHubOverlaySheet } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubOverlaySheet';
import {
    getHomeHubOverlayBackStackDepthForTests,
    popHomeHubOverlayBack,
    resetHomeHubOverlayBackStackForTests,
} from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubOverlayBackStack';

vi.mock('@/app/utils/bodyScrollLock', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/utils/bodyScrollLock')>();
    return {
        ...actual,
        useBodyScrollLock: vi.fn(),
    };
});

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: () => () => undefined,
}));

vi.mock('@/app/runtime/overlaySnapClose', () => ({
    executeOverlaySnapClose: ({ commit }: { commit?: () => void }) => {
        commit?.();
    },
}));

describe('useHomeHubOverlaySheet', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetHomeHubOverlayBackStackForTests();
    });

    it('يسجّل الواجهة في مكدس الرجوع عند الفتح', () => {
        const onClose = vi.fn();
        const { rerender } = renderHook(
            ({ open }) => useHomeHubOverlaySheet(open, onClose, 'home-hub-alerts-more'),
            { initialProps: { open: false } },
        );

        expect(getHomeHubOverlayBackStackDepthForTests()).toBe(0);
        rerender({ open: true });
        expect(getHomeHubOverlayBackStackDepthForTests()).toBe(1);
    });

    it('requestBack يغلق الواجهة المسجّلة', () => {
        const onClose = vi.fn();
        const { result, rerender } = renderHook(
            ({ open }) => useHomeHubOverlaySheet(open, onClose, 'home-hub-alerts-more'),
            { initialProps: { open: true } },
        );

        result.current.requestBack();
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(getHomeHubOverlayBackStackDepthForTests()).toBe(0);

        rerender({ open: false });
    });

    it('pop من المكدس يستدعي onClose', () => {
        const onClose = vi.fn();
        renderHook(() => useHomeHubOverlaySheet(true, onClose, 'home-hub-urgent-more'));

        expect(popHomeHubOverlayBack()).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
