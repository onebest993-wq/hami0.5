import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EventForm } from '../EventForm';
import { EMPTY_FORM } from '../eventFormModel';

vi.mock('@/app/services/calendar/calendarReminderAlarmSound', () => ({
    primeHamiLegalReminderAudio: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/services/notifications/bridge/hamiBridgeNativePlugin', () => ({
    requestHamiNotificationPermission: vi.fn(() => Promise.resolve()),
}));

function renderForm(
    overrides: Partial<React.ComponentProps<typeof EventForm>> = {},
) {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onDelete = vi.fn();
    render(
        <EventForm
            show
            onClose={onClose}
            formData={{ ...EMPTY_FORM, date: '2026-06-24' }}
            editingEvent={null}
            saving={false}
            onSave={onSave}
            onDelete={onDelete}
            {...overrides}
        />,
    );
    return { onClose, onSave, onDelete };
}

describe('EventForm', () => {
    it('Escape يستدعي onClose عندما النموذج مفتوح', () => {
        const { onClose } = renderForm();

        expect(screen.getByTestId('radar-event-form')).toBeInTheDocument();
        expect(screen.getByTestId('radar-event-form-overlay')).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Escape لا يُغلق أثناء الحفظ', () => {
        const { onClose } = renderForm({
            formData: { ...EMPTY_FORM, date: '2026-06-24', title: 'جلسة' },
            saving: true,
        });

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
    });

    it('حفظ معطّل بلا عنوان — سيناريو محامٍ يفتح الإضافة ثم يتردد', () => {
        renderForm();
        expect(screen.getByTestId('radar-event-save')).toBeDisabled();
        fireEvent.change(screen.getByTestId('radar-event-title'), {
            target: { value: 'مراجعة أوراق' },
        });
        expect(screen.getByTestId('radar-event-save')).toBeEnabled();
    });

    it('التذكير معطّل بلا وقت ثم يُفعَّل بعد إدخال وقت', () => {
        renderForm();
        const toggle = screen.getByTestId('radar-event-reminder-toggle');
        expect(toggle).toBeDisabled();

        fireEvent.change(screen.getByTestId('radar-event-time'), {
            target: { value: '10:00' },
        });
        expect(toggle).toBeEnabled();
        expect(toggle).toHaveAttribute('aria-pressed', 'false');

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByTestId('radar-event-reminder-options')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('radar-event-reminder-30'));
        expect(screen.getByTestId('radar-event-reminder-30')).toHaveAttribute('aria-pressed', 'true');
    });

    it('نقر الخلفية يغلق النموذج', () => {
        const { onClose } = renderForm();
        fireEvent.click(screen.getByTestId('radar-event-form-overlay'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
