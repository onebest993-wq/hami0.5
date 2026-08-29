import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExecutionDashboardBootChrome } from '../ExecutionDashboardBootChrome';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

describe('ExecutionDashboardBootChrome', () => {
    it('renders above the execution archive shell stacking context', () => {
        const onExitToHome = vi.fn();
        render(
            <ExecutionDashboardBootChrome
                file={{ id: 'ex-1', type: 'execution', fileNumber: '12', fileYear: '2026' } as FileData}
                onExitToHome={onExitToHome}
            />,
        );

        const root = screen.getByTestId('execution-dashboard-dossier');
        expect(root.className).toContain('z-[230]');
        expect(screen.getByText('12/2026')).toBeTruthy();
        const close = screen.getByTestId('execution-dashboard-close');
        expect(close).toHaveAttribute('aria-label', 'المغادرة إلى الواجهة الرئيسية');
        close.click();
        expect(onExitToHome).toHaveBeenCalledTimes(1);
    });
});
