/** @vitest-environment jsdom */
import React, { Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/components/lawyer/FinancialOperationsCenter', () => ({
    FinancialOperationsCenter: function MockFoc() {
        return <div data-testid="foc-real">FOC_READY</div>;
    },
}));

describe('LazyFinancialOperationsCenter preload-aware', () => {
    it('بعد preload يرسم المحتوى الحقيقي بلا FocInstantShell', async () => {
        const { LazyFinancialOperationsCenter } = await import(
            '../executionDashboardLazyRegistry'
        );

        await act(async () => {
            await LazyFinancialOperationsCenter.preload();
        });

        expect(LazyFinancialOperationsCenter.isPreloaded()).toBe(true);

        render(
            <Suspense fallback={<div data-testid="foc-fallback">LOADING</div>}>
                <LazyFinancialOperationsCenter />
            </Suspense>,
        );

        expect(screen.queryByTestId('foc-fallback')).toBeNull();
        expect(screen.getByTestId('foc-real').textContent).toBe('FOC_READY');
    });
});
