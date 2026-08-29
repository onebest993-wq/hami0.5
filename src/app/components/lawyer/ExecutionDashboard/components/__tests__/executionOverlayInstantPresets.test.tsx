import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import {
    ExecutionFinancialHubInstantFrame,
    ExecutionLawInstantFrame,
    ExecutionNamedOverlayInstantFrame,
    ExecutionNotesInstantFrame,
} from '../executionOverlayInstantPresets';

describe('execution overlay instant frames', () => {
    beforeEach(() => {
        useExecutionDashboardStore.getState().closeAllModals();
        useExecutionDashboardStore.getState().openModal('showLawReferencePanel');
    });

    it('المركز المالي يرسم هيكلاً مع خروج 44px يعمل', () => {
        const onClose = vi.fn();
        render(<ExecutionFinancialHubInstantFrame onClose={onClose} />);
        expect(screen.getByRole('dialog', { name: 'المركز المالي' })).toBeTruthy();
        const close = screen.getByTestId('execution-financial-hub-instant-close');
        expect(close.className).toContain('min-h-[44px]');
        fireEvent.click(close);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('مرجع القانون يرسم هيكلاً ويغلق المتجر', () => {
        render(<ExecutionLawInstantFrame />);
        expect(screen.getByRole('dialog', { name: 'قانون التنفيذ العراقي رقم 45' })).toBeTruthy();
        fireEvent.click(screen.getByTestId('execution-law-reference-close'));
        expect(useExecutionDashboardStore.getState().modals.showLawReferencePanel).toBe(false);
    });

    it('الملاحظات ترسم هيكلاً مع خروج يعمل', () => {
        const onClose = vi.fn();
        render(<ExecutionNotesInstantFrame onClose={onClose} />);
        expect(screen.getByRole('dialog', { name: 'سجل الملاحظات والمهام' })).toBeTruthy();
        fireEvent.click(screen.getByTestId('execution-notes-instant-close'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('النافذة المسماة ترسم هيكلاً مع خروج 44px يعمل', () => {
        const onClose = vi.fn();
        render(
            <ExecutionNamedOverlayInstantFrame title="سداد دفعة" onClose={onClose} />,
        );
        expect(screen.getByRole('dialog', { name: 'سداد دفعة' })).toBeTruthy();
        const close = screen.getByTestId('execution-named-overlay-instant-close');
        expect(close.className).toContain('min-h-[44px]');
        fireEvent.click(close);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
