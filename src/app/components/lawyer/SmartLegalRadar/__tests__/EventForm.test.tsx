import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EventForm } from '../EventForm';
import { EMPTY_FORM } from '../utils';

vi.mock('motion/react', () => ({
    motion: {
        div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
            <div {...props}>{children}</div>
        ),
    },
}));

describe('EventForm', () => {
    it('Escape يستدعي onClose عندما النموذج مفتوح', () => {
        const onClose = vi.fn();
        render(
            <EventForm
                show
                onClose={onClose}
                formData={{ ...EMPTY_FORM, date: '2026-06-24' }}
                editingEvent={null}
                saving={false}
                onSave={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getByTestId('radar-event-form')).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Escape لا يُغلق أثناء الحفظ', () => {
        const onClose = vi.fn();
        render(
            <EventForm
                show
                onClose={onClose}
                formData={{ ...EMPTY_FORM, date: '2026-06-24', title: 'جلسة' }}
                editingEvent={null}
                saving
                onSave={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
    });
});
