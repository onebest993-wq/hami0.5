import { describe, expect, it } from 'vitest';
import {
    buildActiveParties,
    buildAllParties,
    formatConcernedPartyLabelWithContext,
    isPartyDeceased,
} from './partyContextFilter';

describe('partyContextFilter', () => {
    it('detects deceased by status and personalStage', () => {
        expect(isPartyDeceased({ status: 'متوفى' })).toBe(true);
        expect(isPartyDeceased({ personalStage: 'lawsuit_dropped_death' })).toBe(true);
        expect(isPartyDeceased({ accusedStatus: 'متوفى' })).toBe(true);
        expect(isPartyDeceased({ accusedPersonalStage: 'lawsuit_dropped_death' })).toBe(true);
        expect(isPartyDeceased({ status: 'موقوف' })).toBe(false);
    });

    it('excludes deceased from active parties', () => {
        const all = buildAllParties(
            [{ id: 'c1', fullName: 'مشتكي', address: '', phone: '' }],
            [
                {
                    id: 'd1',
                    fullName: 'متهم حي',
                    address: '',
                    birthYear: '',
                    status: 'موقوف',
                    detentionAuthority: '',
                    detentionExpiryDate: '',
                    detentionHistoryLog: [],
                    totalDetentionDays: 0,
                },
                {
                    id: 'd2',
                    fullName: 'متهم متوفى',
                    address: '',
                    birthYear: '',
                    status: 'متوفى',
                    personalStage: 'lawsuit_dropped_death',
                    detentionAuthority: '',
                    detentionExpiryDate: '',
                    detentionHistoryLog: [],
                    totalDetentionDays: 0,
                },
            ],
        );
        expect(all).toHaveLength(3);
        expect(buildActiveParties(
            [{ id: 'c1', fullName: 'مشتكي', address: '', phone: '' }],
            [
                {
                    id: 'd1',
                    fullName: 'متهم حي',
                    address: '',
                    birthYear: '',
                    status: 'موقوف',
                    detentionAuthority: '',
                    detentionExpiryDate: '',
                    detentionHistoryLog: [],
                    totalDetentionDays: 0,
                },
                {
                    id: 'd2',
                    fullName: 'متهم متوفى',
                    address: '',
                    birthYear: '',
                    status: 'متوفى',
                    personalStage: 'lawsuit_dropped_death',
                    detentionAuthority: '',
                    detentionExpiryDate: '',
                    detentionHistoryLog: [],
                    totalDetentionDays: 0,
                },
            ],
        )).toHaveLength(2);
        const dead = all.find((p) => p.id === 'd2');
        expect(dead?.isDeceased).toBe(true);
        expect(formatConcernedPartyLabelWithContext(dead!, { showDeceasedBadge: true })).toContain('[متوفى 💀]');
    });
});
