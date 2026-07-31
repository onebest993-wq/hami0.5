import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../GuarantorOverflowMenu', () => ({
    GuarantorConfirmDialog: () => null,
    GuarantorOverflowMenu: () => null,
}));

vi.mock('../GuarantorCollapsedSummary', () => ({
    GuarantorCollapsedSummary: () => <div>collapsed summary</div>,
}));

vi.mock('../GuarantorCardExpandButton', () => ({
    GuarantorCardExpandButton: () => null,
}));

import { GuarantorFollowupStandaloneCard } from '../GuarantorFollowupStandaloneCard';

describe('GuarantorFollowupStandaloneCard', () => {
    it('opens unified summons hub through explicit callback', () => {
        const onOpenUnifiedSummonsHub = vi.fn();

        render(
            <GuarantorFollowupStandaloneCard
                executionData={{
                    guarantor_followup: {
                        executor_approved: true,
                        guarantor_name: 'كفيل',
                        guarantor_workplace: 'دائرة',
                        guarantee_type: 'amount',
                    },
                } as never}
                expanded
                onExpandedChange={vi.fn()}
                openGuarantorDetailsModal={vi.fn()}
                archiveAndClearGuarantor={vi.fn()}
                handleGuarantorRequestFromFollowup={vi.fn()}
                onOpenUnifiedSummonsHub={onOpenUnifiedSummonsHub}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'متابعة الضامن' }));

        expect(onOpenUnifiedSummonsHub).toHaveBeenCalledWith({
            debtorKey: null,
            initialMainTab: 'guarantor',
        });
    });
});
