import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { LawyerDashboardBootErrorBoundary } from '@/app/bootstrap/LawyerDashboardBootErrorBoundary';

function ThrowOnce({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) {
        throw new Error('simulated dashboard chunk failure');
    }
    return <div data-testid="lawyer-dashboard-ok">ok</div>;
}

describe('LawyerDashboardBootErrorBoundary', () => {
    it('يعرض شاشة الخطأ ثم يستعيد اللوحة بعد إعادة المحاولة', () => {
        const onReset = vi.fn();
        let bootKey = 0;
        let shouldThrow = true;

        const { rerender } = render(
            <LawyerDashboardBootErrorBoundary bootKey={bootKey} onReset={onReset}>
                <ThrowOnce shouldThrow={shouldThrow} />
            </LawyerDashboardBootErrorBoundary>,
        );

        expect(screen.getByTestId('lawyer-dashboard-boot-error')).toBeInTheDocument();

        shouldThrow = false;
        bootKey += 1;
        onReset.mockImplementation(() => undefined);

        fireEvent.click(screen.getByTestId('lawyer-dashboard-boot-error-retry'));
        expect(onReset).toHaveBeenCalledTimes(1);

        rerender(
            <LawyerDashboardBootErrorBoundary bootKey={bootKey} onReset={onReset}>
                <ThrowOnce shouldThrow={shouldThrow} />
            </LawyerDashboardBootErrorBoundary>,
        );

        expect(screen.getByTestId('lawyer-dashboard-ok')).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-dashboard-boot-error')).not.toBeInTheDocument();
    });
});
