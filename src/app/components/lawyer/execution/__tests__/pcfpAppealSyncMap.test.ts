import { describe, expect, it } from 'vitest';
import {
    appealSyncForRequestSubtype,
    PCFP_APPEAL_SYNC_REQUEST_MAP,
} from '../pcfpAppealSyncMap';
import type { PersonalCoerciveAppealSyncView } from '@/app/utils/personalCoerciveAppealSync';

function stubView(blocked: boolean): PersonalCoerciveAppealSyncView {
    return {
        subtype: 'travel_ban',
        governingRow: null,
        decisionId: null,
        gate: { kind: 'continue' },
        followupBlock: null,
        blocked,
        blocksFieldwork: blocked,
        blocksSubmit: blocked,
        cycleSuperseded: false,
        enforced: false,
        pillLabel: 'test',
        decisionsNav: { decisionsTab: 'current' },
    };
}

describe('pcfpAppealSyncMap', () => {
    const allViews = {
        forced_bring_in: { ...stubView(false), subtype: 'forced_bring_in' as const },
        travel_ban: stubView(true),
        arrest_warrant_investigation: {
            ...stubView(false),
            subtype: 'arrest_warrant_investigation' as const,
        },
        executive_dossier_presentation: {
            ...stubView(false),
            subtype: 'executive_dossier_presentation' as const,
        },
    };

    it('maps known personal coercive subtypes to appeal sync keys', () => {
        expect(PCFP_APPEAL_SYNC_REQUEST_MAP.travel_ban).toBe('travel_ban');
        expect(PCFP_APPEAL_SYNC_REQUEST_MAP.forced_bring_in).toBe('forced_bring_in');
    });

    it('appealSyncForRequestSubtype returns view for mapped subtype', () => {
        expect(appealSyncForRequestSubtype(allViews, 'travel_ban')?.blocked).toBe(true);
    });

    it('appealSyncForRequestSubtype returns null for unmapped subtype', () => {
        expect(appealSyncForRequestSubtype(allViews, 'guarantor_request')).toBeNull();
    });
});
