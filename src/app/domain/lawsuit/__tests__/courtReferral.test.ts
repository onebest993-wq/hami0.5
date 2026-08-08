import { describe, expect, it } from 'vitest';
import {
    hasBlockingCourtReferral,
    mergeDraftIntoPendingStage,
    readPendingCourtReferral,
    resolveCourtReferralDisplay,
} from '../courtReferral';

describe('courtReferral', () => {
    it('keeps original court visible while pending', () => {
        const view = resolveCourtReferralDisplay({
            court: 'محكمة بداءة الرصافة',
            previousCourtName: 'محكمة بداءة الرصافة',
            referredToCourt: 'محكمة بداءة الكرخ',
            courtReferralAcceptance: 'pending',
        });
        expect(view.displayCourt).toBe('محكمة بداءة الرصافة');
        expect(view.previousCourt).toBeNull();
        expect(view.isPending).toBe(true);
    });

    it('shows referred court only after acceptance', () => {
        const view = resolveCourtReferralDisplay({
            court: 'محكمة بداءة الرصافة',
            previousCourtName: 'محكمة بداءة الرصافة',
            referredToCourt: 'محكمة بداءة الكرخ',
            courtReferralAcceptance: 'accepted',
        });
        expect(view.displayCourt).toBe('محكمة بداءة الكرخ');
        expect(view.previousCourt).toBe('محكمة بداءة الرصافة');
        expect(view.isAccepted).toBe(true);
    });

    it('reverts display after rejection', () => {
        const view = resolveCourtReferralDisplay({
            court: 'محكمة بداءة الرصافة',
            referredToCourt: 'محكمة بداءة الكرخ',
            courtReferralAcceptance: 'rejected',
        });
        expect(view.displayCourt).toBe('محكمة بداءة الرصافة');
        expect(view.previousCourt).toBeNull();
    });

    it('reads pending referral for modal', () => {
        const pending = readPendingCourtReferral({
            court: 'محكمة أ',
            previousCourtName: 'محكمة أ',
            referredToCourt: 'محكمة ب',
            courtReferralDate: '2026-08-03',
            courtReferralAcceptance: 'pending',
        });
        expect(pending?.referredToCourt).toBe('محكمة ب');
        expect(
            hasBlockingCourtReferral({
                referredToCourt: 'x',
                courtReferralAcceptance: 'pending',
                court: 'y',
                previousCourtName: 'y',
            }),
        ).toBe(true);
    });

    it('merges modal draft when stage state is stale', () => {
        const merged = mergeDraftIntoPendingStage(
            { court: 'محكمة أ' },
            {
                referredToCourt: 'محكمة ب',
                previousCourtName: 'محكمة أ',
                transferDate: '2026-08-03',
            },
        );
        expect(merged.courtReferralAcceptance).toBe('pending');
        expect(merged.referredToCourt).toBe('محكمة ب');
    });
});
