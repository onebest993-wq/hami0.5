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

import { LawyerDashboardGate } from '@/app/bootstrap/LawyerDashboardGate';
import { preloadLawyerDashboardChunk } from '@/app/bootstrap/lawyerDashboardChunk';

describe('LawyerDashboardGate', () => {
    beforeEach(() => {
        suspendOnce = true;
        vi.mocked(preloadLawyerDashboardChunk).mockClear();
    });

    it('يعرض هيكل الإقلاع ثم chunk اللوحة', async () => {
        render(<LawyerDashboardGate onLogout={vi.fn()} onAppNavigate={vi.fn()} />);
        expect(preloadLawyerDashboardChunk).toHaveBeenCalled();
        expect(screen.getByTestId('lawyer-boot-shell')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByTestId('lawyer-dashboard-lazy-loaded')).toBeInTheDocument();
        });
    });
});
