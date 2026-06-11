import { describe, expect, it } from 'vitest';
import {
    resolveAllPersonalCoerciveAppealSync,
    resolvePersonalCoerciveAppealSync,
} from '@/app/utils/personalCoerciveAppealSync';

function forcedHub(overrides: Record<string, unknown> = {}) {
    return {
        id: 'personal_coercive_forced_1',
        title: 'إحضار جبري',
        requestKind: 'personal_coercive',
        personalCoerciveSubtype: 'forced_bring_in',
        appealRequestOrigin: 'creditor_side',
        executorOutcome: 'approved',
        appealStatus: 'pending',
        ...overrides,
    };
}

describe('resolvePersonalCoerciveAppealSync', () => {
    it('pauses forced bring fieldwork when grievance filed without appealActor', () => {
        const hub = forcedHub({
            appealPhase: 'grievance',
            appealStatus: 'tadhallum_filed',
        });
        const sync = resolvePersonalCoerciveAppealSync({
            executionId: 'ex-sync-1',
            subtype: 'forced_bring_in',
            allDecisions: [hub],
        });
        expect(sync.blocked).toBe(true);
        expect(sync.blocksFieldwork).toBe(true);
        expect(sync.blocksSubmit).toBe(true);
        expect(sync.followupBlock?.kind).toBe('paused');
        expect(sync.enforced).toBe(false);
    });

    it('continues when no governing row', () => {
        const sync = resolvePersonalCoerciveAppealSync({
            executionId: 'ex-empty',
            subtype: 'travel_ban',
            allDecisions: [],
        });
        expect(sync.blocked).toBe(false);
        expect(sync.followupBlock).toBeNull();
    });

    it('resolves all subtypes in one call', () => {
        const all = resolveAllPersonalCoerciveAppealSync({
            executionId: 'ex-all',
            allDecisions: [forcedHub()],
        });
        expect(all.forced_bring_in.governingRow?.id).toBe('personal_coercive_forced_1');
        expect(all.travel_ban.governingRow).toBeNull();
        expect(all.executive_detention_judge.governingRow).toBeNull();
    });
});
