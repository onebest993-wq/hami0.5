import { describe, expect, it } from 'vitest';
import { buildPersonalCoerciveExecutionMerge } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';

describe('buildPersonalCoerciveExecutionMerge', () => {
    it('activates travel ban on approval', () => {
        const m = buildPersonalCoerciveExecutionMerge({
            subtype: 'travel_ban',
            resolution: 'approved',
        });
        expect(m.debtor_travel_ban_active).toBe(true);
        expect(m.travel_ban_withdrawn_at).toBeNull();
    });

    it('clears travel ban on rejection and withdraw', () => {
        expect(
            buildPersonalCoerciveExecutionMerge({ subtype: 'travel_ban', resolution: 'rejected' })
                .debtor_travel_ban_active
        ).toBe(false);
        expect(
            buildPersonalCoerciveExecutionMerge({ subtype: 'travel_ban', resolution: 'withdrawn' })
                .debtor_travel_ban_active
        ).toBe(false);
    });

    it('opens investigation path on arrest warrant approval', () => {
        const m = buildPersonalCoerciveExecutionMerge({
            subtype: 'arrest_warrant_investigation',
            resolution: 'approved',
        });
        expect(m.investigationCourtRequested).toBe(true);
        expect(m.personal_arrest_warrant_stage).toBe('pending_court');
    });

    it('resets investigation on withdraw', () => {
        const m = buildPersonalCoerciveExecutionMerge({
            subtype: 'arrest_warrant_investigation',
            resolution: 'withdrawn',
        });
        expect(m.investigationCourtRequested).toBe(false);
        expect(m.personal_arrest_warrant_stage).toBe('none');
    });

    it('pins judge stage to the approving executor decision row', () => {
        const m = buildPersonalCoerciveExecutionMerge({
            subtype: 'executive_detention',
            resolution: 'approved',
            decisionId: 'personal_coercive_test_1',
        });
        expect(m.executive_detention_judge_eligible_decision_id).toBe('personal_coercive_test_1');
        expect(m.executive_detention_judge_outcome).toBeNull();
    });

    it('opens judge track for dossier presentation approval', () => {
        const m = buildPersonalCoerciveExecutionMerge({
            subtype: 'executive_dossier_presentation',
            resolution: 'approved',
            decisionId: 'personal_coercive_dossier_1',
        });
        expect(m.executive_dossier_phase).toBe('handed_to_judge');
        expect(m.executive_detention_judge_eligible_decision_id).toBe('personal_coercive_dossier_1');
    });
});
