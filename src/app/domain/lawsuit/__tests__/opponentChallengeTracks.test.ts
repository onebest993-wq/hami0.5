import { describe, expect, it } from 'vitest';
import {
    hasRemainingOpponentChallengeTrack,
    remainingGhayabiObjectionPartyIds,
    remainingPresentAppealPartyIds,
    resolveRemainingOpponentChallengeMethods,
} from '../opponentChallengeTracks';

const MIXED_LANES = [
    { partyId: '2', disposition: 'حضوري' as const, laneState: 'pending' as const },
    { partyId: '3', disposition: 'غيابي' as const, laneState: 'pending' as const },
];

describe('opponentChallengeTracks', () => {
    it('يفصل الغائب الحاضر كمسارين متبقيين', () => {
        expect(remainingPresentAppealPartyIds(MIXED_LANES)).toEqual(['2']);
        expect(remainingGhayabiObjectionPartyIds(MIXED_LANES)).toEqual(['3']);
        expect(
            resolveRemainingOpponentChallengeMethods({
                lanes: MIXED_LANES,
            }),
        ).toEqual(['اعتراض غيابي', 'استئناف', 'تمييز']);
    });

    it('بعد استئناف الحاضر يبقى اعتراض الغائب', () => {
        const lanes = [
            { partyId: '2', disposition: 'حضوري' as const, laneState: 'appeal' as const },
            { partyId: '3', disposition: 'غيابي' as const, laneState: 'pending' as const },
        ];
        expect(
            resolveRemainingOpponentChallengeMethods({
                lanes,
                hasAppealStageFromFirstInstance: true,
            }),
        ).toEqual(['اعتراض غيابي', 'استئناف', 'تمييز']);
        expect(
            hasRemainingOpponentChallengeTrack({
                lanes,
                hasAppealStageFromFirstInstance: true,
            }),
        ).toBe(true);
    });

    it('بعد اعتراض الغائب يبقى استئناف الحاضر', () => {
        const lanes = [
            { partyId: '2', disposition: 'حضوري' as const, laneState: 'pending' as const },
            { partyId: '3', disposition: 'غيابي' as const, laneState: 'objection' as const },
        ];
        expect(
            resolveRemainingOpponentChallengeMethods({
                lanes,
                hasObjectionStage: true,
            }),
        ).toEqual(['استئناف', 'تمييز']);
    });

    it('الغائب الذي استأنف مباشرة لا يبقى له اعتراض', () => {
        const lanes = [
            { partyId: '2', disposition: 'حضوري' as const, laneState: 'appeal' as const },
            { partyId: '3', disposition: 'غيابي' as const, laneState: 'appeal' as const },
        ];
        expect(
            hasRemainingOpponentChallengeTrack({
                lanes,
                hasAppealStageFromFirstInstance: true,
            }),
        ).toBe(false);
    });

    it('حاضران: بعد استئناف أحدهما يبقى مسار الآخر', () => {
        const lanes = [
            { partyId: '2', disposition: 'حضوري' as const, laneState: 'appeal' as const },
            { partyId: '3', disposition: 'حضوري' as const, laneState: 'pending' as const },
        ];
        expect(remainingPresentAppealPartyIds(lanes)).toEqual(['3']);
        expect(
            resolveRemainingOpponentChallengeMethods({
                lanes,
                hasAppealStageFromFirstInstance: true,
            }),
        ).toEqual(['استئناف', 'تمييز']);
        expect(
            hasRemainingOpponentChallengeTrack({
                lanes,
                hasAppealStageFromFirstInstance: true,
            }),
        ).toBe(true);
    });

    it('غائبان: بعد اعتراض أحدهما يبقى اعتراض الآخر', () => {
        const lanes = [
            { partyId: '2', disposition: 'غيابي' as const, laneState: 'objection' as const },
            { partyId: '3', disposition: 'غيابي' as const, laneState: 'pending' as const },
        ];
        expect(remainingGhayabiObjectionPartyIds(lanes)).toEqual(['3']);
        expect(
            resolveRemainingOpponentChallengeMethods({
                lanes,
                hasObjectionStage: true,
            }),
        ).toEqual(['اعتراض غيابي', 'استئناف', 'تمييز']);
    });

    it('يختفي المسار فقط بعد استهلاك كل مؤهل', () => {
        const lanes = [
            { partyId: '2', disposition: 'حضوري' as const, laneState: 'appeal' as const },
            { partyId: '3', disposition: 'حضوري' as const, laneState: 'appeal' as const },
        ];
        expect(
            resolveRemainingOpponentChallengeMethods({
                lanes,
                hasAppealStageFromFirstInstance: true,
            }),
        ).toEqual([]);
    });
});
