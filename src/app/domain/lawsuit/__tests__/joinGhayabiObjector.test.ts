import { describe, expect, it } from 'vitest';
import {
    formatUnifiedObjectionBanner,
    listEligibleJoinableGhayabiObjectors,
    UNIFIED_OBJECTION_BANNER_PREFIX,
} from '../joinGhayabiObjector';
import {
    computeLaneObjectionDeadline,
    markLaneServed,
    mergePartyChallengeLanes,
} from '../partyChallengeLanes';

const PARTIES = [
    { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
    { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
    { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: true },
];

describe('joinGhayabiObjector', () => {
    it('يسرد الغائبين المبلَّغين داخل مهلة العشرة أيام فقط', () => {
        let lanes = mergePartyChallengeLanes({
            parties: PARTIES,
            dispositions: [
                { partyId: '2', form: 'غيابي' },
                { partyId: '3', form: 'غيابي' },
            ],
            judgmentDate: '2026-08-01',
        });
        lanes = markLaneServed(lanes, '3', '2026-08-10');
        const eligible = listEligibleJoinableGhayabiObjectors({
            lanes,
            parties: PARTIES,
            today: '2026-08-15',
        });
        expect(eligible).toEqual([{ partyId: '3', name: 'كريم' }]);
        expect(computeLaneObjectionDeadline('2026-08-10')).toBe('2026-08-20');
        expect(listEligibleJoinableGhayabiObjectors({
            lanes,
            parties: PARTIES,
            today: '2026-08-21',
        })).toEqual([]);
    });

    it('يصوغ بانر الاعتراض الموحد بأسماء المعترضين', () => {
        expect(formatUnifiedObjectionBanner(['سامي', 'كريم'])).toBe(
            `${UNIFIED_OBJECTION_BANNER_PREFIX} سامي وكريم`,
        );
        expect(formatUnifiedObjectionBanner([])).toBe('');
    });
});
