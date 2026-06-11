import { describe, expect, it } from 'vitest';
import { resolveSpecificDeliveryUiPhase } from '../resolveSpecificDeliveryUiPhase';
import { resolveFollowupSpecializationVisibility } from '../followupSpecializationVisibility';

describe('resolveSpecificDeliveryUiPhase', () => {
    it('needs_nature blocks field procedures', () => {
        const r = resolveSpecificDeliveryUiPhase({ isEmployee: false });
        expect(r.phase).toBe('needs_nature');
        expect(r.showFieldProcedures).toBe(false);
        expect(r.showConversionCard).toBe(false);
    });

    it('pre_delivery immovable shows surveyor and hidden break inventory request', () => {
        const r = resolveSpecificDeliveryUiPhase({
            specificDeliveryItemNature: 'immovable',
            isEmployee: false,
        });
        expect(r.phase).toBe('pre_delivery');
        expect(r.showFieldProcedures).toBe(true);
        expect(r.showSurveyorCard).toBe(true);
        expect(r.showBreakInventoryCard).toBe(false);
        expect(r.showHiddenBreakInventoryRequest).toBe(true);
        expect(r.showPersonalCoerciveTab).toBe(false);
    });

    it('pre_delivery movable hides surveyor and break inventory', () => {
        const r = resolveSpecificDeliveryUiPhase({
            specificDeliveryItemNature: 'movable',
            isEmployee: false,
        });
        expect(r.showSurveyorCard).toBe(false);
        expect(r.showBreakInventoryCard).toBe(false);
        expect(r.showFieldProcedures).toBe(true);
    });

    it('post_financialization kills all field cards and activates seizure', () => {
        const r = resolveSpecificDeliveryUiPhase({
            specificDeliveryItemNature: 'immovable',
            specificDeliveryFinancialized: true,
            isEmployee: false,
        });
        expect(r.phase).toBe('post_financialization');
        expect(r.showFieldProcedures).toBe(false);
        expect(r.showSurveyorCard).toBe(false);
        expect(r.showConversionCard).toBe(false);
        expect(r.activateFinancialSeizurePath).toBe(true);
        expect(r.hideCoerciveSeizureTools).toBe(false);
    });

    it('post_financialization earner movable shows personal tab', () => {
        const r = resolveSpecificDeliveryUiPhase({
            specificDeliveryItemNature: 'movable',
            specificDeliveryFinancialized: true,
            isEmployee: false,
        });
        expect(r.showPersonalCoerciveTab).toBe(true);
    });

    it('maps to followup flags with field procedures off after financialization', () => {
        const flags = resolveFollowupSpecializationVisibility('تسليم شيء معين', false, {
            specificDeliveryItemNature: 'immovable',
            specificDeliveryFinancialized: true,
        });
        expect(flags.showSpecificDeliveryFieldProcedures).toBe(false);
        expect(flags.showSpecificDeliverySurveyorCard).toBe(false);
        expect(flags.showSpecificDeliveryConversionCard).toBe(false);
        expect(flags.isFinancialDebtCollection).toBe(true);
    });
});
