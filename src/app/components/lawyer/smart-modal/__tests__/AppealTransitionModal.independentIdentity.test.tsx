import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AppealTransitionModal } from '../AppealTransitionModal';
import { SmartFileModalThemeProvider } from '../smartFile/smartFileModalTheme';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CaseStage } from '../../LawyerShared';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        success: vi.fn(),
        info: vi.fn(),
    },
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const PARTIES = [
    { id: 1, name: 'أحمد', role: 'المدعي', isClient: true },
    { id: 2, name: 'سامي', role: 'المدعى عليه', isClient: false },
    { id: 4, name: 'كريم', role: 'المدعى عليه', isClient: false },
];

const STAGES = [
    {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'locked',
        parties: PARTIES,
        caseNo: '100/2026',
    },
    {
        id: 's1',
        name: 'الاستئناف',
        stageName: 'الاستئناف',
        status: 'active',
        caseNo: 'است/10',
        parties: PARTIES,
    },
    {
        id: 's2',
        name: 'الاعتراض على الحكم الغيابي',
        stageName: 'الاعتراض على الحكم الغيابي',
        status: 'active',
        parties: PARTIES,
        caseNo: '100/2026',
        finalDecision: 'تعديل الحكم الغيابي — يحق لموكلك الطعن',
        clientStageOutcome: 'LOSS',
    },
] as CaseStage[];

describe('AppealTransitionModal independent spawn identity', () => {
    it('لا ينشئ الإضبارة المستقلة بلا محكمة ورقم دعوى', () => {
        const onConfirm = vi.fn();
        render(
            <SmartFileModalThemeProvider variant="civil">
                <AppealTransitionModal
                    isOpen
                    onClose={vi.fn()}
                    onConfirm={onConfirm}
                    currentParties={PARTIES}
                    representedParty="المدعي"
                    judgmentType="تعديل الحكم الغيابي"
                    judgmentForm="حضوري"
                    stageName="الاعتراض على الحكم الغيابي"
                    stages={STAGES}
                    sourceCaseNumber="100/2026"
                />
            </SmartFileModalThemeProvider>,
        );

        expect(screen.getByTestId('independent-challenge-court')).toBeInTheDocument();
        expect(screen.getByTestId('independent-challenge-case-no')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'إنشاء طعن استئنافي مستقل' }));

        expect(onConfirm).not.toHaveBeenCalled();
        expect(SmartToast.error).toHaveBeenCalled();
    });

    it('يمرّر المحكمة ورقم الدعوى بعد الإدخال', () => {
        const onConfirm = vi.fn();
        render(
            <SmartFileModalThemeProvider variant="civil">
                <AppealTransitionModal
                    isOpen
                    onClose={vi.fn()}
                    onConfirm={onConfirm}
                    currentParties={PARTIES}
                    representedParty="المدعي"
                    judgmentType="تعديل الحكم الغيابي"
                    judgmentForm="حضوري"
                    stageName="الاعتراض على الحكم الغيابي"
                    stages={STAGES}
                    sourceCaseNumber="100/2026"
                />
            </SmartFileModalThemeProvider>,
        );

        fireEvent.change(screen.getByTestId('independent-challenge-court'), {
            target: { value: 'استئناف بغداد' },
        });
        fireEvent.change(screen.getByTestId('independent-challenge-case-no'), {
            target: { value: 'است/88' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'إنشاء طعن استئنافي مستقل' }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                newCourt: 'استئناف بغداد',
                newCaseNumber: 'است/88',
                appealType: 'استئناف',
            }),
        );
    });
});
