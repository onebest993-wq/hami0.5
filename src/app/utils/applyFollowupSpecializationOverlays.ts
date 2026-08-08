import { applyEarnerFinancialPersonalCoerciveOverlay } from '@/app/utils/earnerPersonalCoerciveFinancialGate';
import { applyDebtorDeathFollowupOverlay } from '@/app/utils/partyDeathFollowupOverlay';
import type { FollowupSpecializationVisibility } from '@/app/utils/followupSpecializationVisibility';

export type ApplyFollowupSpecializationOverlaysInput = {
    isEmployee: boolean;
    financialCenterTotalIqd: number;
    activeDebtorIsDeceased?: boolean;
};

/**
 * ترتيب overlays محضر المتابعة:
 * 1. أعلام المطالبة/المدين (base)
 * 2. بوابة الكاسب المالي — فقط إذا المدين حيّ
 * 3. وفاة المدين — تفوز أخيراً ولا تُعاد فتح الجبرية بالكاسب
 */
export function applyFollowupSpecializationOverlays(
    baseFlags: FollowupSpecializationVisibility,
    input: ApplyFollowupSpecializationOverlaysInput,
): FollowupSpecializationVisibility {
    if (input.activeDebtorIsDeceased) {
        return applyDebtorDeathFollowupOverlay(baseFlags, true);
    }
    return applyEarnerFinancialPersonalCoerciveOverlay(baseFlags, {
        isEmployee: input.isEmployee,
        financialCenterTotalIqd: input.financialCenterTotalIqd,
    });
}
