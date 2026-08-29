import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

let suspendOnce = true;

vi.mock('@/app/bootstrap/lawyerDashboardChunk', () => ({
    LawyerDashboardLazy: () => {
        if (suspendOnce) {
            throw new Promise<void>((resolve) => {
                window.setTimeout(() => {
                    suspendOnce = false;
                    resolve();
                }, 30);
            });
        }
        return <div data-testid="lawyer-dashboard-lazy-loaded" />;
    },
    preloadLawyerDashboardChunk: vi.fn(),
}));

vi.mock('@/app/runtime/lawyerDashboardLoader', () => ({
    resetLawyerDashboardModuleCache: vi.fn(),
    getLawyerDashboardModuleSync: () => null,
}));

vi.mock('@/app/context/authHooks', () => ({
    useAuthSafe: () => ({ user: { id: 'u1' }, isLoading: false, hasRole: () => false }),
}));

vi.mock('@/boot/shouldPreloadLawyerBoard', () => ({
    shouldPreloadLawyerDashboardBoard: () => true,
    shouldEnterLawyerDashboardBoard: () => true,
    resolveLawyerBoardEnter: ({ forcedAuthLane }: { forcedAuthLane: boolean }) => !forcedAuthLane,
}));

vi.mock('@/app/runtime/lawyerDashboardInnerLoader', () => ({
    prefetchLawyerDashboardInner: vi.fn(),
}));

vi.mock('@/app/services/auth/passwordRecoveryGate', () => ({
    subscribePasswordRecovery: () => () => undefined,
    isPasswordRecoveryPending: () => false,
}));

vi.mock('@/app/bootstrap/useBootReveal', () => ({
    useBootReveal: () => ({ overlayCovering: false }),
}));

vi.mock('@/app/bootstrap/bootStaticShell', () => ({
    removeStaticBootShell: vi.fn(),
    shouldMountReactBootOverlay: () => false,
    shouldHideBootSuspenseFallback: () => false,
}));

vi.mock('@/app/bootstrap/bootReveal', async () => {
    const actual = await vi.importActual<typeof import('@/app/bootstrap/bootReveal')>(
        '@/app/bootstrap/bootReveal',
    );
    return {
        ...actual,
        isBootRevealDone: () => true,
        isSplashGuardFrozen: () => false,
    };
});

import { LawyerDashboardGate } from '@/app/bootstrap/LawyerDashboardGate';
import { preloadLawyerDashboardChunk } from '@/app/bootstrap/lawyerDashboardChunk';

describe('LawyerDashboardGate', () => {
    beforeEach(() => {
        suspendOnce = true;
    });

    it('يُظهر fallback البوابة ثم chunk اللوحة — مع preload مبكر للوحة', async () => {
        render(<LawyerDashboardGate onLogout={vi.fn()} onAppNavigate={vi.fn()} />);

        expect(preloadLawyerDashboardChunk).toHaveBeenCalled();
        expect(screen.getByTestId('lawyer-gate-content-fallback')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByTestId('lawyer-dashboard-lazy-loaded')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('lawyer-gate-content-fallback')).not.toBeInTheDocument();
    });
});
