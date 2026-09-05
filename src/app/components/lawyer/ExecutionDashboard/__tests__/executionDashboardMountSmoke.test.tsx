import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/app/motion/overlayMotionRuntime', () => ({
    motion: {
        div: ({ children, ...rest }: { children?: React.ReactNode }) =>
            React.createElement('div', rest, children),
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/observability/sentryClient', () => ({
    sentryCaptureException: vi.fn(),
}));

describe('ExecutionDashboard mount smoke', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    it('does not crash ErrorBoundary for a minimal execution file', async () => {
        const { ExecutionDashboard } = await import(
            '@/app/components/lawyer/ExecutionDashboard.tsx'
        );
        const file = {
            id: 'exec-smoke-1',
            type: 'execution',
            title: 'اختبار',
            caseNumber: '1',
            court: 'بغداد',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            parties: [],
            timeline: [],
            payments: [],
            creditors: [{ id: 'c1', name: 'دائن' }],
            debtors: [{ id: 'd1', name: 'مدين' }],
            claimType: 'financial_debt',
            principal_amount: 1000,
        };

        const onClose = vi.fn();
        const onExitToHome = vi.fn();
        const onUpdate = vi.fn();

        expect(() => {
            render(
                React.createElement(ExecutionDashboard as React.ComponentType<Record<string, unknown>>, {
                    file,
                    onClose,
                    onExitToHome,
                    onUpdate,
                }),
            );
        }).not.toThrow();

        await waitFor(
            () => {
                expect(screen.queryByTestId('execution-dossier-error-fallback')).toBeNull();
            },
            { timeout: 8000 },
        );
    }, 15000);
});
