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
    scheduleLawyerDashboardPrefetch: vi.fn(),
}));

vi.mock('@/app/runtime/lawyerDashboardLoader', () => ({
    resetLawyerDashboardModuleCache: vi.fn(),
}));

vi.mock('@/app/bootstrap/useBootReveal', () => ({
    useBootReveal: () => ({ overlayCovering: false }),
}));

vi.mock('@/app/bootstrap/bootStaticShell', () => ({
    removeStaticBootShell: vi.fn(),
    shouldMountReactBootOverlay: () => false,
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
        vi.mocked(preloadLawyerDashboardChunk).mockClear();
    });

    it('يُظهر fallback البوابة ثم chunk اللوحة — بلا preload مبكر إلزامي', async () => {
        render(<LawyerDashboardGate onLogout={vi.fn()} onAppNavigate={vi.fn()} />);

        expect(preloadLawyerDashboardChunk).not.toHaveBeenCalled();
        expect(screen.getByTestId('lawyer-gate-content-fallback')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByTestId('lawyer-dashboard-lazy-loaded')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('lawyer-gate-content-fallback')).not.toBeInTheDocument();
    });
});
