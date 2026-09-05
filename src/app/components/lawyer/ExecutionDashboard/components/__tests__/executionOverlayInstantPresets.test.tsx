import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import {
    ExecutionAppointmentInstantFrame,
    ExecutionDecisionsInstantFrame,
    ExecutionDocumentsInstantFrame,
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
        expect(screen.getByRole('dialog', { name: 'سجل الملاحظات' })).toBeTruthy();
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

    it('هياكل النوافذ الحرجة تبقى كروماً بحرياً خفيفاً بلا إطار سيان/عنبر سميك', () => {
        const onClose = vi.fn();
        const { unmount: unmountNotes } = render(<ExecutionNotesInstantFrame onClose={onClose} />);
        const notes = screen.getByRole('dialog', { name: 'سجل الملاحظات' });
        expect(notes.className).toContain('bg-[#0A0F1C]');
        expect(notes.className).not.toContain('border-amber-500');
        expect(notes.className).not.toContain('border-2');
        unmountNotes();

        const { unmount: unmountAppt } = render(<ExecutionAppointmentInstantFrame onClose={onClose} />);
        const appt = screen.getByRole('dialog', { name: 'إضافة موعد' });
        expect(appt.className).toContain('bg-[#0A0F1C]');
        expect(appt.className).not.toContain('border-amber-500');
        unmountAppt();

        const { unmount: unmountVault } = render(<ExecutionDocumentsInstantFrame onClose={onClose} />);
        const vault = screen.getByRole('dialog', { name: 'خزينة المستندات' });
        expect(vault.className).toContain('bg-[#0A0F1C]');
        expect(vault.className).not.toContain('border-cyan-500');
        expect(vault.className).not.toContain('border-2');
        unmountVault();

        const { unmount: unmountDecisions } = render(<ExecutionDecisionsInstantFrame onClose={onClose} />);
        const decisions = screen.getByRole('dialog', { name: 'مركز القرارات والطعون' });
        expect(decisions.className).toContain('bg-[#0A0F1C]');
        unmountDecisions();

        render(<ExecutionFinancialHubInstantFrame onClose={onClose} />);
        const finance = screen.getByRole('dialog', { name: 'المركز المالي' });
        expect(finance.className).toContain('bg-[#0A0F1C]');
        expect(finance.className).not.toContain('border-[#E6C673]/40');
        expect(finance.className).not.toContain('bg-[#0B1120]');
    });
});
