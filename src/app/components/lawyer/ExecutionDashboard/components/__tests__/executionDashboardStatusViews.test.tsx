import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { EXECUTION_DOSSIER_TEST_IDS } from '../../executionDossierTestIds';
import {
    ExecutionDashboardErrorView,
    ExecutionDashboardLoadingView,
} from '../ExecutionDashboardStatusViews';

describe('ExecutionDashboardStatusViews', () => {
    it('هيكل التحميل توأم InstantFrame مع خروج 44px يعمل', () => {
        const onExitToHome = vi.fn();
        render(
            <ExecutionDashboardLoadingView
                file={{ id: 'exec-1', fileNumber: '88', fileYear: '2024' }}
                onExitToHome={onExitToHome}
            />,
        );
        expect(screen.getByText('الإضبارة التنفيذية')).toBeTruthy();
        expect(screen.getByText('88/2024')).toBeTruthy();
        fireEvent.click(screen.getByTestId(EXECUTION_DOSSIER_TEST_IDS.close));
        expect(onExitToHome).toHaveBeenCalledTimes(1);
    });

    it('شاشة الخطأ تغلق بلمس 44px', () => {
        const onClose = vi.fn();
        render(<ExecutionDashboardErrorView message="تعذّر القراءة" onClose={onClose} />);
        const close = screen.getByRole('button', { name: 'إغلاق' });
        expect(close.className).toContain('min-h-[44px]');
        expect(close.className).toContain('touch-manipulation');
        fireEvent.click(close);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
