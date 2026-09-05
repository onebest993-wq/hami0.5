import { describe, expect, it, vi } from 'vitest';
import { shouldShowGuarantorSeizureFollowupActions } from '../SeizureRequestsTabGuarantorSeizureActions';

describe('shouldShowGuarantorSeizureFollowupActions', () => {
    it('requires an approved financial guarantor with saved details and a live handler', () => {
        expect(
            shouldShowGuarantorSeizureFollowupActions({
                requestGuarantorSeizure: vi.fn(),
                executionData: {
                    guarantor_followup: {
                        executor_approved: true,
                        details_saved: true,
                        channel: 'financial',
                    },
                } as never,
            }),
        ).toBe(true);
    });

    it('hides the follow-up seizures when the handler is missing or the guarantor is not approved', () => {
        const approved = {
            guarantor_followup: {
                executor_approved: true,
                details_saved: true,
                channel: 'financial',
            },
        } as never;
        expect(shouldShowGuarantorSeizureFollowupActions({ executionData: approved })).toBe(false);
        expect(
            shouldShowGuarantorSeizureFollowupActions({
                requestGuarantorSeizure: vi.fn(),
                executionData: {
                    guarantor_followup: { executor_approved: false, details_saved: true },
                } as never,
            }),
        ).toBe(false);
    });
});
