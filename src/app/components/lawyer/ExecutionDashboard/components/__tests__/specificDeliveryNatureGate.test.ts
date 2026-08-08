import { describe, expect, it } from 'vitest';
import { resolveFollowupSpecializationVisibility } from '@/app/utils/followupSpecializationVisibility';

describe('specific delivery nature gate', () => {
    it('enables field procedures after nature is set on dossier', () => {
        const unset = resolveFollowupSpecializationVisibility('تسليم شيء معين', false, {});
        expect(unset.showSpecificDeliveryFieldProcedures).toBe(false);

        const movable = resolveFollowupSpecializationVisibility('تسليم شيء معين', false, {
            specificDeliveryItemNature: 'movable',
        });
        expect(movable.showSpecificDeliveryFieldProcedures).toBe(true);
        expect(movable.hideFollowupCoerciveTab).toBe(false);
    });

    it('keeps coercive tab for legal-entity debtor on specific delivery', () => {
        const flags = resolveFollowupSpecializationVisibility('تسليم شيء معين', false, {
            debtorEntityKind: 'legal_entity',
            specificDeliveryItemNature: 'movable',
        });
        expect(flags.hideFollowupCoerciveTab).toBe(false);
        expect(flags.showSpecificDeliveryFieldProcedures).toBe(true);
        expect(flags.showCorrespondencesSoftProcedures).toBe(true);
    });
});
