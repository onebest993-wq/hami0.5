import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExecutorSideAppealEntryPanel } from '../ExecutorSideAppealEntryPanel';
import type { AppealDeadlineWindows } from '../../utils';

const windows: AppealDeadlineWindows = {
    canTadhallum: true,
    canTamyeez: true,
    daysElapsed: 0,
    grievanceDaysElapsed: 0,
    cassationDaysElapsed: 0,
    isPastGrievanceDeadline: false,
    isPastTamyeezDeadline: false,
    decisionClockYmd: '2026-06-01',
    cassationClockYmd: '2026-06-01',
};

const baseProps = {
    windows,
    locked: false,
    debtorOnly: false,
    cassationOnly: false,
    appealPerspective: 'creditor_agent' as const,
    challengeBtnClass: 'challenge',
    primaryBtnClass: 'primary',
    secondaryBtnClass: 'secondary',
    onCommit: vi.fn(),
};

describe('ExecutorSideAppealEntryPanel', () => {
    it('يعرض زر الطعن ثم نموذج الاختيار', () => {
        render(<ExecutorSideAppealEntryPanel {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: /الطعن بالقرار/ }));
        expect(screen.getByRole('button', { name: /^تظلم$/ })).toBeInTheDocument();
        expect(screen.getByText(/من قام بالطعن/)).toBeInTheDocument();
    });

    it('طلب مسوّى — يقفل الطاعن ولا يعرض منتقياً', () => {
        render(
            <ExecutorSideAppealEntryPanel
                {...baseProps}
                presetAppellant="lawyer"
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /الطعن بالقرار/ }));
        expect(screen.getByText('الطاعن:', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('الدائن')).toBeInTheDocument();
        expect(screen.queryByText(/من قام بالطعن/)).not.toBeInTheDocument();
        expect(screen.queryByText(/قرار المنفذ على الطلب/)).not.toBeInTheDocument();
    });

    it('يمرّر الطاعن المقفول عند التسجيل', () => {
        const onCommit = vi.fn();
        render(
            <ExecutorSideAppealEntryPanel
                {...baseProps}
                presetAppellant="debtor"
                debtorOnly
                onCommit={onCommit}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /الطعن بالقرار/ }));
        fireEvent.click(screen.getByRole('button', { name: /تسجيل الطعن/ }));
        expect(onCommit).toHaveBeenCalledWith('grievance', ['debtor']);
    });

    it('يعرض آخر موعد عند توفر تاريخ القرار', () => {
        render(
            <ExecutorSideAppealEntryPanel
                {...baseProps}
                decisionAppealYmd="2026-06-01"
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /الطعن بالقرار/ }));
        expect(screen.getByText(/آخر موعد لالتظلم/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /^تمييز$/ }));
        expect(screen.getByText(/آخر موعد لالتمييز/)).toBeInTheDocument();
    });

    it('يعرض الموعد بجانب الطاعن المقفول', () => {
        render(
            <ExecutorSideAppealEntryPanel
                {...baseProps}
                presetAppellant="debtor"
                debtorOnly
                decisionAppealYmd="2026-06-01"
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /الطعن بالقرار/ }));
        expect(screen.getByText(/الطاعن:/)).toBeInTheDocument();
        expect(screen.getByText(/آخر موعد لالتظلم/)).toBeInTheDocument();
    });
});
