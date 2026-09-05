import { describe, expect, it } from 'vitest';
import {
    ART210_EXTENSION_NOTICE,
    CASSATION_JUDGMENT_REVERSE_FINAL,
    DIRECT_CASSATION_BLOCKED_MESSAGE,
    applyArt210CassationExtension,
    canPartyFileDirectCassation,
    classifyCassationJudgmentEffect,
    hasArt210ExtensionLanes,
    isCassationAppealMethod,
    listBlockedDirectCassationPartyIds,
} from '../cassationArt210';
import { computeCassationDeadline } from '@/app/components/lawyer/smart-modal/smartFile/appealDeadlineEngine';
import {
    LANE_STATE_CASSATION,
    LANE_STATE_LAPSED_EXECUTABLE,
    LANE_STATE_PENDING,
    LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
    LANE_STATE_WAIVED,
    computeLaneCassationDeadlineFromService,
    type PartyChallengeLane,
} from '../partyChallengeLanes';

function lane(partial: Partial<PartyChallengeLane> & Pick<PartyChallengeLane, 'partyId' | 'disposition'>): PartyChallengeLane {
    return {
        laneState: LANE_STATE_PENDING,
        ...partial,
    };
}

describe('cassationArt210', () => {
    it('يحسب مهلة التمييز 30 يوماً من اليوم التالي للتبليغ', () => {
        expect(computeLaneCassationDeadlineFromService('2026-08-04')).toBe('2026-09-04');
        expect(computeCassationDeadline('2026-08-04')).toBe('2026-09-03');
    });

    it('يحجب التمييز المباشر ما دامت مهلة الاعتراض قائمة ويسمح بعد التنازل', () => {
        const pendingGhayabi = lane({
            partyId: '3',
            disposition: 'غيابي',
            servedAt: '2026-08-04',
            objectionDeadline: '2026-08-14',
            cassationDeadline: '2026-09-04',
        });
        expect(canPartyFileDirectCassation(pendingGhayabi, '2026-08-10')).toBe(false);
        expect(canPartyFileDirectCassation({ ...pendingGhayabi, servedAt: null, objectionDeadline: null }, '2026-08-10')).toBe(false);
        expect(
            canPartyFileDirectCassation({ ...pendingGhayabi, laneState: LANE_STATE_WAIVED }, '2026-08-10'),
        ).toBe(true);
        expect(
            listBlockedDirectCassationPartyIds({
                lanes: [pendingGhayabi],
                partyIds: ['3'],
                today: '2026-08-10',
            }),
        ).toEqual(['3']);
        const present = lane({
            partyId: '2',
            disposition: 'حضوري',
            cassationDeadline: '2026-09-04',
        });
        expect(canPartyFileDirectCassation(present, '2026-08-10')).toBe(true);
        expect(canPartyFileDirectCassation(present, '2026-09-10')).toBe(false);
        expect(
            listBlockedDirectCassationPartyIds({
                lanes: [present, pendingGhayabi],
                partyIds: ['2', '3'],
                today: '2026-08-10',
            }),
        ).toEqual(['3']);
        expect(DIRECT_CASSATION_BLOCKED_MESSAGE).toContain('الاعتراض');
        expect(isCassationAppealMethod('تمييز')).toBe(true);
        expect(isCassationAppealMethod('استئناف')).toBe(false);
        expect(isCassationAppealMethod('تصحيح القرار التمييزي')).toBe(false);
    });

    it('يمد أثر النقض للشركاء في النزاع غير القابل للتجزئة عند أسباب مشتركة فقط', () => {
        const lanes = [
            lane({
                partyId: '2',
                disposition: 'حضوري',
                laneState: LANE_STATE_CASSATION,
            }),
            lane({
                partyId: '3',
                disposition: 'غيابي',
                laneState: LANE_STATE_LAPSED_EXECUTABLE,
                servedAt: '2026-08-04',
            }),
        ];
        const revived = applyArt210CassationExtension({
            lanes,
            integrity: 'indivisible',
            groundsScope: 'COMMON',
            cassatorPartyIds: ['2'],
            effect: 'REVERSED_REMANDED',
        });
        expect(revived.find((row) => row.partyId === '2')?.laneState).toBe(LANE_STATE_CASSATION);
        expect(revived.find((row) => row.partyId === '3')?.laneState).toBe(
            LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
        );
        expect(hasArt210ExtensionLanes(revived)).toBe(true);
        expect(ART210_EXTENSION_NOTICE).toContain('210');

        const severable = applyArt210CassationExtension({
            lanes,
            integrity: 'severable',
            groundsScope: 'COMMON',
            cassatorPartyIds: ['2'],
            effect: 'REVERSED_REMANDED',
        });
        expect(severable.find((row) => row.partyId === '3')?.laneState).toBe(LANE_STATE_LAPSED_EXECUTABLE);

        const personal = applyArt210CassationExtension({
            lanes,
            integrity: 'indivisible',
            groundsScope: 'PERSONAL',
            cassatorPartyIds: ['2'],
            effect: 'REVERSED_REMANDED',
        });
        expect(personal.find((row) => row.partyId === '3')?.laneState).toBe(LANE_STATE_LAPSED_EXECUTABLE);

        const fromArabic = applyArt210CassationExtension({
            lanes,
            integrity: 'indivisible',
            groundsScope: 'COMMON',
            cassatorPartyIds: ['2'],
            effect: 'نقض الحكم وإعادة الإضبارة',
        });
        expect(fromArabic.find((row) => row.partyId === '3')?.laneState).toBe(
            LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
        );

        const withReleased = applyArt210CassationExtension({
            lanes,
            integrity: 'indivisible',
            groundsScope: 'COMMON',
            cassatorPartyIds: ['2'],
            effect: 'REVERSED_REMANDED',
            dispositions: [
                { partyId: '2', form: 'حضوري', operative: 'bound' },
                { partyId: '3', form: 'غيابي', operative: 'released' },
            ],
        });
        expect(withReleased.find((row) => row.partyId === '3')?.laneState).toBe(
            LANE_STATE_LAPSED_EXECUTABLE,
        );
    });

    it('يميّز نقض الفصل في الموضوع عن إعادة الإضبارة', () => {
        expect(classifyCassationJudgmentEffect('نقض الحكم والفصل في الموضوع')).toBe('REVERSED_FINAL');
        expect(classifyCassationJudgmentEffect('نقض الحكم وإعادة الإضبارة')).toBe('REVERSED_REMANDED');
        expect(CASSATION_JUDGMENT_REVERSE_FINAL).toContain('الموضوع');
    });
});
