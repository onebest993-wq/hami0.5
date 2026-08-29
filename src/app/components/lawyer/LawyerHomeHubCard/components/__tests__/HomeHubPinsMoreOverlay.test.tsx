import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomeHubPinsMoreOverlay } from '../HomeHubPinsMoreOverlay';
import { resetHomeHubOverlayBackStackForTests } from '../../homeHub/homeHubOverlayBackStack';
import type { ClusterPinView } from '@/app/workspace/types';

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

const view: ClusterPinView = {
    pin: {
        id: 'case-ov',
        type: 'lawsuit',
        title: 'دعوى مثبتة',
        clientName: 'سامي',
        caseNumber: '12/2026',
        routePath: 'workspace:lawsuit:case-ov',
    },
    related: [],
};

describe('HomeHubPinsMoreOverlay', () => {
    beforeEach(() => resetHomeHubOverlayBackStackForTests());
    afterEach(() => resetHomeHubOverlayBackStackForTests());

    it('التنقّل يغلق الورقة وإلغاء التثبيت يبقيها', () => {
        const onClose = vi.fn();
        const onNavigate = vi.fn();
        const onUnpin = vi.fn();
        render(
            <HomeHubPinsMoreOverlay
                open
                clusterViews={[view]}
                onClose={onClose}
                onNavigate={onNavigate}
                onUnpin={onUnpin}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'دعوى مثبتة، مدني، الموكل: سامي، رقم القضية/الملف: 12/2026',
            }),
        );
        expect(onNavigate).toHaveBeenCalledWith('workspace:lawsuit:case-ov');
        expect(onClose).toHaveBeenCalledTimes(1);

        onClose.mockClear();
        fireEvent.click(screen.getByRole('button', { name: 'إلغاء تثبيت دعوى مثبتة' }));
        expect(onUnpin).toHaveBeenCalledWith('case-ov', 'lawsuit');
        expect(onClose).not.toHaveBeenCalled();
    });
});
