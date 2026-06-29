import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Decision } from '../../types';
import { ManualExecutorSmartCardPanel } from '../ManualExecutorSmartCardPanel';

const BTN_CLASS = 'btn-primary';

function baseDecision(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'ledger-ui-1',
        title: 'قرار منفذ',
        body: 'تفاصيل',
        date: '2026-06-01',
        appealStatus: 'pending',
        manualExecutorLedgerEntry: true,
        executorDecisionStatusFlag: 1,
        ...overrides,
    };
}

function renderPanel(decision: Decision, overrides: Partial<Parameters<typeof ManualExecutorSmartCardPanel>[0]> = {}) {
    const patchDecisionRow = vi.fn();
    const logAppealTimeline = vi.fn();
    const goToAppealsWithScroll = vi.fn();
    const onOpenArchiveTab = vi.fn();

    const view = render(
        <ManualExecutorSmartCardPanel
            decision={decision}
            btnPrimaryWFull={BTN_CLASS}
            patchDecisionRow={patchDecisionRow}
            logAppealTimeline={logAppealTimeline}
            goToAppealsWithScroll={goToAppealsWithScroll}
            onOpenArchiveTab={onOpenArchiveTab}
            {...overrides}
        />
    );

    return {
        ...view,
        patchDecisionRow,
        logAppealTimeline,
        goToAppealsWithScroll,
        onOpenArchiveTab,
    };
}

describe('ManualExecutorSmartCardPanel — grievance_pending', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-03T12:00:00'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    const grievancePending = baseDecision({
        executorDecisionStatusFlag: 2,
        manualExecutorWorkflowPhase: 'grievance_pending',
        manualExecutorAppealKind: 'tadhallum',
        manualExecutorAppealAppellant: 'lawyer',
        grievanceIssuedYmd: '2026-06-03',
    });

    it('يعرض حقل تاريخ إصدار قرار التظلم في نتيجة التظلم', () => {
        renderPanel(grievancePending);

        expect(
            screen.getByLabelText('تاريخ إصدار قرار التظلم (معيار بدء احتساب مهلة التمييز)')
        ).toBeInTheDocument();
        expect(screen.getByText(/سجّل نتيجة قرار المنفذ:/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^قبول التظلم$/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^رد التظلم$/ })).toBeInTheDocument();
    });

    it('يمرّر تاريخ الإصدار المُختار عند قبول التظلم', () => {
        const { patchDecisionRow } = renderPanel(grievancePending);
        const dateInput = screen.getByLabelText(
            'تاريخ إصدار قرار التظلم (معيار بدء احتساب مهلة التمييز)'
        ) as HTMLInputElement;

        fireEvent.change(dateInput, { target: { value: '2026-06-04' } });
        fireEvent.click(screen.getByRole('button', { name: /^قبول التظلم$/ }));

        expect(patchDecisionRow).toHaveBeenCalledTimes(1);
        expect(patchDecisionRow).toHaveBeenCalledWith(
            'ledger-ui-1',
            expect.objectContaining({
                manualExecutorGrievanceOutcome: 'accepted',
                manualExecutorWorkflowPhase: 'cassation_unlocked',
                grievanceOutcomeIssuedYmd: '2026-06-04',
                cassationAppealClockYmd: '2026-06-04',
            })
        );
    });

    it('يمرّر تاريخ الإصدار المُختار عند رد التظلم', () => {
        const { patchDecisionRow } = renderPanel(grievancePending);
        const dateInput = screen.getByLabelText(
            'تاريخ إصدار قرار التظلم (معيار بدء احتساب مهلة التمييز)'
        ) as HTMLInputElement;

        fireEvent.change(dateInput, { target: { value: '2026-06-05' } });
        fireEvent.click(screen.getByRole('button', { name: /^رد التظلم$/ }));

        expect(patchDecisionRow).toHaveBeenCalledWith(
            'ledger-ui-1',
            expect.objectContaining({
                manualExecutorGrievanceOutcome: 'rejected',
                grievanceOutcomeIssuedYmd: '2026-06-05',
                cassationAppealClockYmd: '2026-06-05',
            })
        );
    });

    it('لا يعرض حقل التاريخ بعد انتهاء مهلة التظلم', () => {
        vi.setSystemTime(new Date('2026-06-06T12:00:00'));
        renderPanel(grievancePending);

        expect(
            screen.queryByLabelText('تاريخ إصدار قرار التظلم (معيار بدء احتساب مهلة التمييز)')
        ).not.toBeInTheDocument();
    });
});

describe('ManualExecutorSmartCardPanel — cassation_pending', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-12T12:00:00'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يعرض أزرار حسم التمييز بعد التسجيل حتى لو انتهت مهلة التقديم', () => {
        const pending = baseDecision({
            executorDecisionStatusFlag: 2,
            manualExecutorWorkflowPhase: 'cassation_pending',
            manualExecutorAppealKind: 'tamyeez',
            manualExecutorAppealAppellant: 'lawyer',
            manualExecutorGrievanceOutcome: 'rejected',
            grievanceOutcomeIssuedYmd: '2026-06-04',
            cassationAppealClockYmd: '2026-06-04',
        });

        renderPanel(pending);

        expect(screen.getByText('قام الدائن بتمييز القرار')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^نقض القرار$/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^رد اللائحة$/ })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /تسجيل الطعن/ })).not.toBeInTheDocument();
    });
});

describe('ManualExecutorSmartCardPanel — cassation_unlocked', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-06T12:00:00'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يعرض تاريخ إصدار القرار للقراءة فقط بعد نتيجة التظلم', () => {
        const unlocked = baseDecision({
            executorDecisionStatusFlag: 2,
            manualExecutorWorkflowPhase: 'cassation_unlocked',
            manualExecutorAppealKind: 'tadhallum',
            manualExecutorAppealAppellant: 'lawyer',
            manualExecutorGrievanceOutcome: 'rejected',
            appealResult: 'رد التظلم',
            awaitingCassationEntryBy: 'lawyer',
            grievanceRejectedAwaitingTamyeez: true,
            grievanceOutcomeIssuedYmd: '2026-06-04',
            cassationAppealClockYmd: '2026-06-04',
        });

        renderPanel(unlocked);

        expect(screen.getByText(/آخر موعد ل/)).toBeInTheDocument();
        expect(
            screen.queryByLabelText('تاريخ إصدار قرار التظلم (معيار بدء احتساب مهلة التمييز)')
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /تمييز من قبل الدائن/ })).toBeInTheDocument();
    });
});

describe('ManualExecutorSmartCardPanel — حالات إخفاء اللوحة', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('لا يعرض شيئاً عند علم 3 (منتهٍ)', () => {
        const { container } = renderPanel(
            baseDecision({
                executorDecisionStatusFlag: 3,
            })
        );
        expect(container.firstChild).toBeNull();
    });

    it('لا يعرض اللوحة الذكية في يوم إنهاء المدة (تُعرض AppealDeadlineLapsePanel خارجاً)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-08T12:00:00'));

        const { container } = renderPanel(baseDecision());
        expect(container.firstChild).toBeNull();

        vi.useRealTimers();
    });
});

describe('ManualExecutorSmartCardPanel — مسار أولي', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-03T12:00:00'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('لا ينتقل تلقائياً إلى سجل الطعون بعد حفظ تسجيل الطعن الأولي', () => {
        const { patchDecisionRow, goToAppealsWithScroll } = renderPanel(baseDecision());
        fireEvent.click(screen.getByRole('button', { name: /تسجيل الطعن/ }));
        fireEvent.click(screen.getByRole('button', { name: /^حفظ$/ }));

        expect(patchDecisionRow).toHaveBeenCalledTimes(1);
        expect(patchDecisionRow).toHaveBeenCalledWith(
            'ledger-ui-1',
            expect.objectContaining({
                executorDecisionStatusFlag: 2,
                manualExecutorWorkflowPhase: 'grievance_pending',
            })
        );
        expect(goToAppealsWithScroll).not.toHaveBeenCalled();
    });

    it('يعرض زر تسجيل الطعن للقرار الساري دون تظلم معلّق', () => {
        renderPanel(baseDecision());
        expect(screen.getByRole('button', { name: /تسجيل الطعن/ })).toBeInTheDocument();
        expect(
            screen.queryByLabelText('تاريخ إصدار قرار التظلم (معيار بدء احتساب مهلة التمييز)')
        ).not.toBeInTheDocument();
    });

    it('يعرض نتيجة التظلم عندما تكون البطاقة في مرحلة grievance_pending', () => {
        renderPanel(
            baseDecision({
                executorDecisionStatusFlag: 2,
                manualExecutorWorkflowPhase: 'grievance_pending',
                manualExecutorAppealKind: 'tadhallum',
                manualExecutorAppealAppellant: 'lawyer',
                grievanceIssuedYmd: '2026-06-03',
            })
        );
        expect(screen.queryByRole('button', { name: /تسجيل الطعن/ })).not.toBeInTheDocument();
        expect(screen.getByText(/سجّل نتيجة قرار المنفذ:/)).toBeInTheDocument();
    });

    it('يعرض خيار التظلم والتمييز مع آخر موعد عند فتح النموذج', () => {
        renderPanel(baseDecision());
        fireEvent.click(screen.getByRole('button', { name: /تسجيل الطعن/ }));

        expect(screen.getByText(/آخر موعد ل/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /تظلم أمام المنفذ/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /تمييز أمام الاستئناف/ })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /تمييز أمام الاستئناف/ }));
        expect(screen.getByText(/آخر موعد ل/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /تمييز أمام الاستئناف/ })).toHaveClass(
            'text-[#E6C673]'
        );
    });

    it('يُبقي خيار التظلم معطّلاً بعد انتهاء مهلة 3 أيام', () => {
        vi.setSystemTime(new Date('2026-06-05T12:00:00'));
        renderPanel(baseDecision());
        fireEvent.click(screen.getByRole('button', { name: /تسجيل الطعن/ }));

        const tadhallumBtn = screen.getByRole('button', { name: /تظلم أمام المنفذ/ });
        expect(tadhallumBtn).toBeDisabled();
    });

    it('لا يعرض تسجيل الطعن بعد انتهاء مهلتي التظلم والتمييز', () => {
        vi.setSystemTime(new Date('2026-06-10T12:00:00'));
        const { container } = renderPanel(
            baseDecision({ date: '2026-06-01', executorDecisionStatusFlag: 1 })
        );
        expect(screen.queryByRole('button', { name: /تسجيل الطعن/ })).not.toBeInTheDocument();
        expect(container.firstChild).toBeNull();
    });
});
