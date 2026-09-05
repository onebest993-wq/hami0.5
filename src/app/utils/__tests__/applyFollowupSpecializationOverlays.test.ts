import { describe, expect, it } from 'vitest';
import { applyFollowupSpecializationOverlays } from '../applyFollowupSpecializationOverlays';
import { resolveFollowupSpecializationVisibility } from '../followupSpecializationVisibility';

describe('applyFollowupSpecializationOverlays', () => {
    it('applies earner overlay for living earner with high financial center', () => {
        const base = resolveFollowupSpecializationVisibility('مطالبة مدنية', false);
        const overlaid = applyFollowupSpecializationOverlays(base, {
            isEmployee: false,
            financialCenterTotalIqd: 400_000,
            activeDebtorIsDeceased: false,
        });
        expect(overlaid.hideFollowupCoerciveTab).toBe(false);
        expect(overlaid.hidePersonalCoerciveFollowupTab).toBe(false);
    });

    it('skips earner overlay when debtor is deceased', () => {
        const base = resolveFollowupSpecializationVisibility('استحصال دين مالي', false);
        const overlaid = applyFollowupSpecializationOverlays(base, {
            isEmployee: false,
            financialCenterTotalIqd: 400_000,
            activeDebtorIsDeceased: true,
        });
        expect(overlaid.hideFollowupCoerciveTab).toBe(true);
        expect(overlaid.hidePersonalCoerciveFollowupTab).toBe(true);
        expect(overlaid.suppressHiddenPersonalCoerciveRequests).toBe(true);
    });

    it('does not hide seizure tab for deceased financial debtor', () => {
        const base = resolveFollowupSpecializationVisibility('استحصال دين مالي', false);
        const overlaid = applyFollowupSpecializationOverlays(base, {
            isEmployee: false,
            financialCenterTotalIqd: 900_000,
            activeDebtorIsDeceased: true,
        });
        expect(overlaid.hideFollowupSeizureRequestsTab).toBe(false);
        expect(overlaid.hideFollowupCoerciveTab).toBe(true);
        expect(overlaid.hidePersonalCoerciveFollowupTab).toBe(true);
    });

    it('keeps coercive tab hidden for financial collection when earner overlay unlocks personal tab', () => {
        const base = resolveFollowupSpecializationVisibility('استحصال دين مالي', false);
        const overlaid = applyFollowupSpecializationOverlays(base, {
            isEmployee: false,
            financialCenterTotalIqd: 400_000,
            activeDebtorIsDeceased: false,
        });
        expect(overlaid.hideFollowupCoerciveTab).toBe(true);
        expect(overlaid.hidePersonalCoerciveFollowupTab).toBe(false);
    });
});
