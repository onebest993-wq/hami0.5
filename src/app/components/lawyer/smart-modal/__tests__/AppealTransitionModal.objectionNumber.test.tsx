import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AppealTransitionModal } from '../AppealTransitionModal';
import { SmartFileModalThemeProvider } from '../smartFile/smartFileModalTheme';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const PARTIES = [
    { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
    { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: true },
];

describe('AppealTransitionModal absent-objection number', () => {
    it('leaves case number empty by default and submits empty when not entered', () => {
        const onConfirm = vi.fn();
        render(
            <SmartFileModalThemeProvider variant="civil">
                <AppealTransitionModal
                    isOpen
                    onClose={vi.fn()}
                    onConfirm={onConfirm}
                    currentParties={PARTIES}
                    representedParty="المدعى عليه"
                    judgmentForm="غيابي"
                    stageName="بداءة بدرجة أولى"
                    sourceCaseNumber="111/ب/2026"
                />
            </SmartFileModalThemeProvider>,
        );

        expect(screen.getByPlaceholderText(/اتركه فارغاً/)).toBeTruthy();
        expect(screen.getByText(/اقتراح عند توفر الرقم/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'تأكيد الانتقال' }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                appealType: 'اعتراض على الحكم الغيابي',
                newCaseNumber: '',
            }),
        );
    });

    it('keeps a manually entered case number', () => {
        const onConfirm = vi.fn();
        render(
            <SmartFileModalThemeProvider variant="civil">
                <AppealTransitionModal
                    isOpen
                    onClose={vi.fn()}
                    onConfirm={onConfirm}
                    currentParties={PARTIES}
                    representedParty="المدعى عليه"
                    judgmentForm="غيابي"
                    stageName="بداءة بدرجة أولى"
                    sourceCaseNumber="111/ب/2026"
                />
            </SmartFileModalThemeProvider>,
        );

        const input = screen.getByPlaceholderText(/اتركه فارغاً/) as HTMLInputElement;
        fireEvent.change(input, { target: { value: '99/ب/اعتراضية/2026' } });
        fireEvent.click(screen.getByRole('button', { name: 'تأكيد الانتقال' }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                newCaseNumber: '99/ب/اعتراضية/2026',
            }),
        );
    });
});
