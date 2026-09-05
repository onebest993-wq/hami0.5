import { describe, expect, it } from 'vitest';
import { computeLaneObjectionDeadline, hasUnservedGhayabiLane } from '@/app/domain/lawsuit/partyChallengeLanes';
import { recordAbsentJudgmentNotification } from '../recordAbsentJudgmentNotification';
import type { CaseStage } from '../../../LawyerShared';

const PARTIES = [
    { id: 1, name: 'أحمد', role: 'مدعي' },
    { id: 2, name: 'سامي', role: 'مدعى عليه' },
    { id: 3, name: 'كريم', role: 'مدعى عليه' },
];

function ghayabiStage(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'active',
        isPleadingsClosed: true,
        judgmentForm: 'غيابي',
        finalDecision: 'حكم غيابي — بانتظار التبليغ والاعتراض',
        parties: PARTIES,
        ...overrides,
    } as CaseStage;
}

describe('recordAbsentJudgmentNotification', () => {
    it('يرفض الحفظ عند تعدد الغائبين بلا اختيار', () => {
        const result = recordAbsentJudgmentNotification({
            sourceStage: ghayabiStage(),
            notificationDate: '2026-08-20',
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('حدّد المدعى عليه');
        }
    });

    it('يسجّل تبليغ غائب واحد ويبقي الزر للآخر', () => {
        const first = recordAbsentJudgmentNotification({
            sourceStage: ghayabiStage(),
            notificationDate: '2026-08-20',
            partyId: '2',
            nowMs: 1,
        });
        expect(first.ok).toBe(true);
        if (!first.ok) return;
        expect(first.stillAwaiting).toBe(true);
        expect(first.partyName).toBe('سامي');
        expect(first.patch.awaitingAbsentJudgmentNotification).toBe(true);
        expect(hasUnservedGhayabiLane(first.patch.partyChallengeLanes)).toBe(true);
        const sami = first.patch.partyChallengeLanes?.find((lane) => lane.partyId === '2');
        expect(sami?.servedAt).toBe('2026-08-20');
        expect(sami?.objectionDeadline).toBe(computeLaneObjectionDeadline('2026-08-20'));

        const second = recordAbsentJudgmentNotification({
            sourceStage: ghayabiStage(first.patch),
            notificationDate: '2026-08-22',
            partyId: '3',
            nowMs: 2,
        });
        expect(second.ok).toBe(true);
        if (!second.ok) return;
        expect(second.stillAwaiting).toBe(false);
        expect(second.patch.awaitingAbsentJudgmentNotification).toBe(false);
        expect(hasUnservedGhayabiLane(second.patch.partyChallengeLanes)).toBe(false);
    });

    it('يسجّل تبليغ أكثر من غائب في حفظ واحد', () => {
        const result = recordAbsentJudgmentNotification({
            sourceStage: ghayabiStage(),
            notificationDate: '2026-08-20',
            partyIds: ['2', '3'],
            nowMs: 9,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.stillAwaiting).toBe(false);
        expect(result.partyIds).toEqual(['2', '3']);
        expect(result.partyName).toBe('سامي، كريم');
        expect(hasUnservedGhayabiLane(result.patch.partyChallengeLanes)).toBe(false);
        expect(result.patch.partyChallengeLanes?.find((lane) => lane.partyId === '2')?.servedAt).toBe(
            '2026-08-20',
        );
        expect(result.patch.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.servedAt).toBe(
            '2026-08-20',
        );
    });

    it('يبذر الغائبين من صفة الحكم الغيابي إذا لم تُحفظ صفات فردية', () => {
        const result = recordAbsentJudgmentNotification({
            sourceStage: ghayabiStage({
                partyJudgmentDispositions: [],
                partyChallengeLanes: [],
            }),
            notificationDate: '2026-08-20',
            partyId: '3',
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.partyName).toBe('كريم');
        expect(result.patch.partyJudgmentDispositions).toEqual([
            { partyId: '2', form: 'غيابي', operative: 'bound' },
            { partyId: '3', form: 'غيابي', operative: 'bound' },
        ]);
    });
});
