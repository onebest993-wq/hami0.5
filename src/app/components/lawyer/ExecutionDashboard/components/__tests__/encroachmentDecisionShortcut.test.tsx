import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EncroachmentDecisionInlineAccordion } from '../encroachmentRemoval/encroachmentDecisionHelpers';

describe('EncroachmentDecisionInlineAccordion', () => {
    it('يعرض اختصار قرار المنفذ للمعلّق ويفتح مركز القرارات', () => {
        const onOpenDecisions = vi.fn();
        const row = {
            id: 'enc_surv_1',
            executorOutcome: 'pending',
            evictionProcedureBranch: 'surveyor_appointment',
        };

        render(
            <EncroachmentDecisionInlineAccordion
                label="طلب انتداب خبير"
                row={row}
                decisionRows={[row]}
                onOpenDecisions={onOpenDecisions}
            />,
        );

        expect(screen.getByTestId('encroachment-pending-executor-decision')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'رفض' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'موافقة' })).toBeNull();

        fireEvent.click(screen.getByTestId('seizure-executor-decision-shortcut'));
        expect(onOpenDecisions).toHaveBeenCalledWith('enc_surv_1', row);
    });

    it('يخفي الاختصار بعد الموافقة ويعرض شريط الإتمام', () => {
        const row = {
            id: 'enc_surv_1',
            executorOutcome: 'approved',
            evictionProcedureBranch: 'surveyor_appointment',
        };

        render(
            <EncroachmentDecisionInlineAccordion
                label="طلب انتداب خبير"
                row={row}
                decisionRows={[row]}
                onOpenDecisions={vi.fn()}
            />,
        );

        expect(screen.queryByTestId('seizure-executor-decision-shortcut')).toBeNull();
        expect(screen.getByTestId('encroachment-approved-executor-decision')).toBeInTheDocument();
    });
});
