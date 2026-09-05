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

        expect(screen.queryByText(/اقتراح عند توفر الرقم/)).toBeNull();
        expect(screen.queryByText(/المحكمة \(اختياري\)/)).toBeNull();

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

        const input = screen.getByDisplayValue('') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '99/ب/اعتراضية/2026' } });
        fireEvent.click(screen.getByRole('button', { name: 'تأكيد الانتقال' }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                newCaseNumber: '99/ب/اعتراضية/2026',
            }),
        );
    });

    it('does not render court field for cassation', () => {
        render(
            <SmartFileModalThemeProvider variant="civil">
                <AppealTransitionModal
                    isOpen
                    onClose={vi.fn()}
                    onConfirm={vi.fn()}
                    currentParties={PARTIES}
                    representedParty="المدعى عليه"
                    judgmentForm="حضوري"
                    stageName="الاستئناف"
                />
            </SmartFileModalThemeProvider>,
        );

        expect(screen.queryByText('المحكمة المختصة')).toBeNull();
        expect(screen.queryByPlaceholderText(/محكمة الاستئناف/)).toBeNull();
    });

    it('renders court field when filing first appeal', () => {
        render(
            <SmartFileModalThemeProvider variant="civil">
                <AppealTransitionModal
                    isOpen
                    onClose={vi.fn()}
                    onConfirm={vi.fn()}
                    currentParties={PARTIES}
                    representedParty="المدعى عليه"
                    judgmentForm="حضوري"
                    stageName="بداءة بدرجة أولى"
                />
            </SmartFileModalThemeProvider>,
        );

        expect(screen.getByText(/المحكمة المختصة/)).toBeTruthy();
        expect(screen.getByPlaceholderText(/محكمة الاستئناف/)).toBeTruthy();
    });

    it('shows court and case number when spawning an independent dossier', () => {
        render(
            <SmartFileModalThemeProvider variant="civil">
                <AppealTransitionModal
                    isOpen
                    onClose={vi.fn()}
                    onConfirm={vi.fn()}
                    currentParties={[
                        { id: 1, name: 'أحمد', role: 'المعترض عليه بالحكم الغيابي (المدعي)', isClient: true },
                        { id: 4, name: 'كريم', role: 'المعترض على الحكم الغيابي (المدعى عليه)', isClient: false },
                    ]}
                    representedParty="المدعي"
                    judgmentForm="حضوري"
                    stageName="الاعتراض على الحكم الغيابي"
                    forcedAllowedMethods={['استئناف']}
                    stages={[
                        { id: 's0', stageName: 'بداءة بدرجة أولى' },
                        { id: 's1', stageName: 'الاستئناف' },
                        { id: 's2', stageName: 'الاعتراض على الحكم الغيابي' },
                    ] as never}
                />
            </SmartFileModalThemeProvider>,
        );

        expect(screen.getByText(/المحكمة المختصة/)).toBeTruthy();
        expect(screen.getByPlaceholderText(/محكمة الاستئناف/)).toBeTruthy();
        expect(screen.getByText(/رقم دعوى الاستئناف/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'إنشاء طعن استئنافي مستقل' })).toBeTruthy();
    });
});
