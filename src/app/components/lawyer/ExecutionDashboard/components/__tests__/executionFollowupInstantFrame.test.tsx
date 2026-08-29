import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { ExecutionFollowupInstantFrame } from '../ExecutionFollowupInstantFrame';

describe('ExecutionFollowupInstantFrame', () => {
    beforeEach(() => {
        useExecutionDashboardStore.getState().closeAllModals();
        useExecutionDashboardStore.getState().openModal('showUnifiedExecutionModal');
    });

    it('يرسم هيكل المحضر مع خروج 44px يعمل', () => {
        render(<ExecutionFollowupInstantFrame />);
        expect(screen.getByRole('dialog', { name: 'محضر المتابعة' })).toBeTruthy();
        expect(screen.getByTestId('execution-followup-modal')).toBeTruthy();
        const close = screen.getByTestId('execution-followup-modal-close');
        expect(close.className).toContain('min-h-[44px]');
        fireEvent.click(close);
        expect(useExecutionDashboardStore.getState().modals.showUnifiedExecutionModal).toBe(false);
    });
});
