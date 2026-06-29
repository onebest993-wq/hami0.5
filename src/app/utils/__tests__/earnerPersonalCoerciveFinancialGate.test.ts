import { describe, expect, it } from 'vitest';
import {
    applyEarnerFinancialPersonalCoerciveOverlay,
    EARNER_EXECUTIVE_DETENTION_MIN_IQD,
    EARNER_PERSONAL_COERCIVE_MIN_IQD,
    meetsEarnerExecutiveDetentionThreshold,
    meetsEarnerPersonalCoerciveFinancialThreshold,
    shouldShowEarnerExecutiveDetentionFromFinancialCenter,
    shouldUnlockEarnerPersonalCoerciveFromFinancialCenter,
} from '../earnerPersonalCoerciveFinancialGate';
describe('earnerPersonalCoerciveFinancialGate', () => {
    it('threshold constants', () => {
        expect(EARNER_PERSONAL_COERCIVE_MIN_IQD).toBe(250_000);
        expect(EARNER_EXECUTIVE_DETENTION_MIN_IQD).toBe(500_000);
    });

    it('personal coercive unlock: strictly above 250k for earner', () => {
        expect(meetsEarnerPersonalCoerciveFinancialThreshold(250_000)).toBe(false);
        expect(meetsEarnerPersonalCoerciveFinancialThreshold(250_001)).toBe(true);
        expect(
            shouldUnlockEarnerPersonalCoerciveFromFinancialCenter({
                isEmployee: false,
                financialCenterTotalIqd: 300_000,
            })
        ).toBe(true);
        expect(
            shouldUnlockEarnerPersonalCoerciveFromFinancialCenter({
                isEmployee: true,
                financialCenterTotalIqd: 600_000,
            })
        ).toBe(false);
    });

    it('executive detention from 500k upward for earner', () => {
        expect(meetsEarnerExecutiveDetentionThreshold(499_999)).toBe(false);
        expect(meetsEarnerExecutiveDetentionThreshold(500_000)).toBe(true);
        expect(
            shouldShowEarnerExecutiveDetentionFromFinancialCenter({
                isEmployee: false,
                financialCenterTotalIqd: 400_000,
            })
        ).toBe(false);
        expect(
            shouldShowEarnerExecutiveDetentionFromFinancialCenter({
                isEmployee: false,
                financialCenterTotalIqd: 500_000,
            })
        ).toBe(true);
    });

    it('overlay unlocks personal tab and hides judge below 500k', () => {
        const hidden = {
            hidePersonalCoerciveFollowupTab: true,
            hidePersonalForcedBringActivation: true,
            hidePersonalJudgePresentation: true,
        };
        const mid = applyEarnerFinancialPersonalCoerciveOverlay(hidden, {
            isEmployee: false,
            financialCenterTotalIqd: 400_000,
        });
        expect(mid.hidePersonalCoerciveFollowupTab).toBe(false);
        expect(mid.hidePersonalForcedBringActivation).toBe(false);
        expect(mid.hidePersonalJudgePresentation).toBe(false);
        expect(mid.hideFollowupSeizureRequestsTab).toBe(false);
        expect(mid.isFinancialDebtCollection).toBe(true);

        const high = applyEarnerFinancialPersonalCoerciveOverlay(hidden, {
            isEmployee: false,
            financialCenterTotalIqd: 600_000,
        });
        expect(high.hidePersonalJudgePresentation).toBe(false);
        expect(
            shouldShowEarnerExecutiveDetentionFromFinancialCenter({
                isEmployee: false,
                financialCenterTotalIqd: 600_000,
            })
        ).toBe(true);
    });
});
