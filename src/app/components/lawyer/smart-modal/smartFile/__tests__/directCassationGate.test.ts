import { describe, expect, it } from 'vitest';
import { DIRECT_CASSATION_BLOCKED_MESSAGE } from '@/app/domain/lawsuit/cassationArt210';
import { resolveDirectCassationBlockMessage, shouldGateDirectCassationFromSource } from '../directCassationGate';
import { LANE_STATE_PENDING, LANE_STATE_WAIVED } from '@/app/domain/lawsuit/partyChallengeLanes';

const GHAYABI_LANE = {
    partyId: '3',
    disposition: 'غيابي' as const,
    laneState: LANE_STATE_PENDING,
    servedAt: '2026-08-04',
    objectionDeadline: '2026-08-14',
    cassationDeadline: '2026-09-04',
};

describe('directCassationGate', () => {
    it('يقيّد التمييز المباشر من البداءة فقط', () => {
        expect(shouldGateDirectCassationFromSource('البداءة', 'تمييز')).toBe(true);
        expect(shouldGateDirectCassationFromSource('الاستئناف', 'تمييز')).toBe(false);
        expect(shouldGateDirectCassationFromSource('البداءة', 'استئناف')).toBe(false);
    });

    it('يحجب الغائب أثناء مهلة الاعتراض ويسمح بعد التنازل أو بعد الاستئناف', () => {
        expect(
            resolveDirectCassationBlockMessage({
                sourceStageName: 'بداءة بدرجة أولى',
                appealType: 'تمييز',
                lanes: [GHAYABI_LANE],
                partyIds: ['3'],
                today: '2026-08-10',
            }),
        ).toBe(DIRECT_CASSATION_BLOCKED_MESSAGE);
        expect(
            resolveDirectCassationBlockMessage({
                sourceStageName: 'بداءة بدرجة أولى',
                appealType: 'تمييز',
                lanes: [{ ...GHAYABI_LANE, laneState: LANE_STATE_WAIVED }],
                partyIds: ['3'],
                today: '2026-08-10',
            }),
        ).toBeNull();
        expect(
            resolveDirectCassationBlockMessage({
                sourceStageName: 'الاستئناف',
                appealType: 'تمييز',
                lanes: [GHAYABI_LANE],
                partyIds: ['3'],
                today: '2026-08-10',
            }),
        ).toBeNull();
    });
});
