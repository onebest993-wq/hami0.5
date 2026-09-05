import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { PleadingCloseDecisionFlow } from '../PleadingCloseDecisionFlow';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../../smartFile/civilLawsuitTestIds';

vi.mock('@/app/components/ui/HamiDateInput', () => ({
    HamiDateInput: ({
        value,
        onValueChange,
    }: {
        value: string;
        onValueChange?: (v: string) => void;
    }) => (
        <input
            data-testid="mock-pleading-decision-date"
            value={value}
            onChange={(e) => onValueChange?.(e.target.value)}
        />
    ),
}));

function advanceToFork(ui: ReturnType<typeof render>) {
    fireEvent.click(ui.getByRole('button', { name: 'ختام المرافعة' }));
    fireEvent.change(ui.getByTestId('mock-pleading-decision-date'), {
        target: { value: '2020-01-15' },
    });
    fireEvent.click(ui.getByRole('button', { name: 'متابعة' }));
}

describe('PleadingCloseDecisionFlow', () => {
    it('ختام → تاريخ ماضٍ → قرار الحكم يفتح مباشرة عند غياب فرع التأجيل', () => {
        const onOpen = vi.fn();
        render(
            <PleadingCloseDecisionFlow
                primaryLabel="ختام المرافعة"
                showAdjournFork={false}
                onOpenJudgment={onOpen}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'ختام المرافعة' }));
        fireEvent.change(screen.getByTestId('mock-pleading-decision-date'), {
            target: { value: '2020-01-15' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'متابعة' }));
        expect(onOpen).toHaveBeenCalledWith('2020-01-15');
        expect(screen.queryByRole('button', { name: 'ختام المرافعة' })).toBeNull();
        expect(screen.getByTestId('mock-pleading-decision-date')).toBeTruthy();
    });

    it('فرع فتح باب المرافعة يعيد الشريط بعد الفتح', () => {
        const onAdjourn = vi.fn();
        const ui = render(
            <PleadingCloseDecisionFlow
                primaryLabel="ختام المرافعة"
                showAdjournFork
                onAdjournPleading={onAdjourn}
                onOpenJudgment={vi.fn()}
            />,
        );

        advanceToFork(ui);
        expect(ui.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentAdjournPleading)).toBeTruthy();
        fireEvent.click(ui.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentAdjournPleading));
        expect(onAdjourn).toHaveBeenCalledTimes(1);
        expect(ui.getByRole('button', { name: 'ختام المرافعة' })).toBeTruthy();
    });

    it('فرع قرار الحكم يمرّر التاريخ ويُبقي الفرع بعد الفتح', () => {
        const onOpen = vi.fn();
        const ui = render(
            <PleadingCloseDecisionFlow
                primaryLabel="ختام المرافعة"
                showAdjournFork
                onAdjournPleading={vi.fn()}
                onOpenJudgment={onOpen}
            />,
        );

        advanceToFork(ui);
        fireEvent.click(ui.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentEnterDecision));
        expect(onOpen).toHaveBeenCalledWith('2020-01-15');
        expect(ui.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentEnterDecision)).toBeTruthy();
    });

    it('تاريخ مستقبلي يظهر بوابة الاستمرار أو المغادرة', () => {
        const onOpen = vi.fn();
        const future = new Date();
        future.setFullYear(future.getFullYear() + 1);
        const iso = `${future.getFullYear()}-06-15`;

        render(
            <PleadingCloseDecisionFlow
                primaryLabel="ختام المرافعة"
                showAdjournFork={false}
                onOpenJudgment={onOpen}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'ختام المرافعة' }));
        fireEvent.change(screen.getByTestId('mock-pleading-decision-date'), {
            target: { value: iso },
        });
        fireEvent.click(screen.getByRole('button', { name: 'متابعة' }));

        expect(screen.getByText(/موعد القرار لم يحن/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'الاستمرار' }));
        expect(onOpen).toHaveBeenCalledWith(iso);
        expect(screen.getByText(/موعد القرار لم يحن/)).toBeTruthy();
    });
});
