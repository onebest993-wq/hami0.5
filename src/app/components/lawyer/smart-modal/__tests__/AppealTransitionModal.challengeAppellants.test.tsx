import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AppealTransitionModal } from '../AppealTransitionModal';
import { SmartFileModalThemeProvider } from '../smartFile/smartFileModalTheme';
import { defaultSelectedChallengeAppellantIds } from '../appealTransitionModalHelpers';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const MIXED_PARTIES = [
    { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
    { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
    { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: true },
    { id: 4, name: 'نادر', role: 'مدعى عليه', isClient: false },
];

const MIXED_DISPOSITIONS = [
    { partyId: '2', form: 'حضوري' as const },
    { partyId: '3', form: 'غيابي' as const },
    { partyId: '4', form: 'غيابي' as const },
];

function renderMixed(onConfirm = vi.fn(), clientPresent = false) {
    const parties = MIXED_PARTIES.map((party) => ({
        ...party,
        isClient: clientPresent ? party.id === 2 : party.id === 3,
    }));
    render(
        <SmartFileModalThemeProvider variant="civil">
            <AppealTransitionModal
                isOpen
                onClose={vi.fn()}
                onConfirm={onConfirm}
                currentParties={parties}
                representedParty="المدعى عليه"
                judgmentForm="مختلط"
                stageName="بداءة بدرجة أولى"
                finalDecision="إجابة الدعوى بالكامل"
                partyJudgmentDispositions={MIXED_DISPOSITIONS}
            />
        </SmartFileModalThemeProvider>,
    );
    return onConfirm;
}

describe('AppealTransitionModal challenge appellants', () => {
    it('اعتراض الحكم الغيابي يُظهر الغائبين فقط وليس الحاضر', () => {
        const onConfirm = renderMixed();
        expect(screen.getByText('كريم')).toBeTruthy();
        expect(screen.getByText('نادر')).toBeTruthy();
        expect(screen.queryByText('سامي')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'تأكيد الانتقال' }));
        expect(onConfirm).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText('كريم'));
        fireEvent.click(screen.getByRole('button', { name: 'تأكيد الانتقال' }));
        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                appealType: 'اعتراض على الحكم الغيابي',
                includedAppellantPartyIds: [3],
            }),
        );
        expect(onConfirm.mock.calls[0][0].includedAppellantPartyIds).not.toContain(4);
        expect(onConfirm.mock.calls[0][0].includedAppellantPartyIds).not.toContain(2);
    });

    it('استئناف الحكم المختلط يُظهر الغائبين مع الحاضر', () => {
        renderMixed(vi.fn(), true);
        expect(screen.getByText('سامي')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'استئناف' }));
        expect(screen.getByText('سامي')).toBeTruthy();
        expect(screen.getByText('كريم')).toBeTruthy();
        expect(screen.getByText('نادر')).toBeTruthy();
    });

    it('preferredChallengerPartyId يختار الطاعن من الشريط المسمّى عند الفتح', () => {
        const onConfirm = vi.fn();
        const parties = MIXED_PARTIES.map((party) => ({
            ...party,
            isClient: party.id === 3,
        }));
        render(
            <SmartFileModalThemeProvider variant="civil">
                <AppealTransitionModal
                    isOpen
                    onClose={vi.fn()}
                    onConfirm={onConfirm}
                    currentParties={parties}
                    representedParty="المدعى عليه"
                    judgmentForm="مختلط"
                    stageName="بداءة بدرجة أولى"
                    finalDecision="إجابة الدعوى بالكامل"
                    partyJudgmentDispositions={MIXED_DISPOSITIONS}
                    preferredChallengerPartyId="4"
                />
            </SmartFileModalThemeProvider>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'تأكيد الانتقال' }));
        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                appealType: 'اعتراض على الحكم الغيابي',
                includedAppellantPartyIds: [4],
            }),
        );
    });
});

describe('defaultSelectedChallengeAppellantIds', () => {
    it('لا يختار أحداً تلقائياً عند تعدد المؤهلين', () => {
        expect(
            defaultSelectedChallengeAppellantIds([
                { id: 3, isClient: true },
                { id: 4, isClient: false },
            ]),
        ).toEqual([]);
    });

    it('يختار الوحيد المؤهل', () => {
        expect(defaultSelectedChallengeAppellantIds([{ id: 2, isClient: true }])).toEqual([2]);
    });

    it('يفضّل الطاعن الممرَّر من الشريط المسمّى عند التعدد', () => {
        expect(
            defaultSelectedChallengeAppellantIds(
                [
                    { id: 3, isClient: true },
                    { id: 4, isClient: false },
                ],
                '4',
            ),
        ).toEqual([4]);
    });

    it('يتجاهل مفضّلاً خارج قائمة المؤهلين', () => {
        expect(
            defaultSelectedChallengeAppellantIds(
                [
                    { id: 3, isClient: true },
                    { id: 4, isClient: false },
                ],
                '99',
            ),
        ).toEqual([]);
    });

    it('من الاعتراض بعد خسارة المدعي: المستأنف هو المدعي لا المعترض الرابح', () => {
        const onConfirm = vi.fn();
        const parties = [
            {
                id: 1,
                name: 'أحمد',
                role: 'المعترض عليه بالحكم الغيابي (المدعي)',
                isClient: true,
            },
            { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
            {
                id: 4,
                name: 'كريم',
                role: 'المعترض على الحكم الغيابي (المدعى عليه)',
                isClient: false,
            },
        ];
        const stages = [
            { id: 's0', stageName: 'بداءة بدرجة أولى', name: 'بداءة بدرجة أولى' },
            { id: 's1', stageName: 'الاستئناف', name: 'الاستئناف' },
            {
                id: 's2',
                stageName: 'الاعتراض على الحكم الغيابي',
                name: 'الاعتراض على الحكم الغيابي',
                finalDecision: 'تعديل الحكم الغيابي — يحق لموكلك الطعن',
            },
        ];
        render(
            <SmartFileModalThemeProvider variant="civil">
                <AppealTransitionModal
                    isOpen
                    onClose={vi.fn()}
                    onConfirm={onConfirm}
                    currentParties={parties}
                    representedParty="المدعي"
                    judgmentType="رد الدعوى كلياً"
                    judgmentForm="حضوري"
                    stageName="الاعتراض على الحكم الغيابي"
                    finalDecision="تعديل الحكم الغيابي — يحق لموكلك الطعن"
                    stages={stages as never}
                    lawsuitFile={{ disputeIntegrity: 'indivisible' } as never}
                />
            </SmartFileModalThemeProvider>,
        );
        expect(screen.getByRole('button', { name: 'إنشاء طعن استئنافي مستقل' })).toBeTruthy();
        fireEvent.change(screen.getByTestId('independent-challenge-court'), {
            target: { value: 'استئناف بغداد' },
        });
        fireEvent.change(screen.getByTestId('independent-challenge-case-no'), {
            target: { value: 'است/88' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'إنشاء طعن استئنافي مستقل' }));
        expect(onConfirm).toHaveBeenCalled();
        const payload = onConfirm.mock.calls[0][0];
        expect(payload.includedAppellantPartyIds).toEqual([1]);
        expect(payload.includedOpponentPartyIds).toEqual([4]);
        expect(payload.appellant).toBe('المدعي');
    });
});
