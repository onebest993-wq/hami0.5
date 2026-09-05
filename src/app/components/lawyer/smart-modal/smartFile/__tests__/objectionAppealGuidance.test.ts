import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import { resolveDossierObjectionOutcome, resolveObjectionAppealGuidanceNotices } from '../objectionAppealGuidance';

describe('objectionAppealGuidance — حكم البداءة لا يُقرأ كحسم للاعتراض', () => {
    const pendingObjection = {
        id: 'obj',
        name: 'اعتراض على الحكم الغيابي (بداءة)',
        stageName: 'اعتراض على الحكم الغيابي (بداءة)',
        status: 'active',
        lastJudgmentType: 'إجابة الدعوى بالكامل',
        parties: [{ id: 1, name: 'أحمد', role: 'المعترض عليه بالحكم الغيابي (المدعي)', isClient: true }],
    } as CaseStage;

    const appeal = {
        id: 's1',
        name: 'الاستئناف',
        stageName: 'الاستئناف',
        status: 'active',
    } as CaseStage;

    it('لا يصنّف ربح البداءة أو الخسارة الجزئية كحسم اعتراض ما دام بلا قرار', () => {
        expect(resolveDossierObjectionOutcome([pendingObjection, appeal])).toBeNull();
        expect(
            resolveDossierObjectionOutcome([
                { ...pendingObjection, lastJudgmentType: 'رد الدعوى جزئياً' },
                appeal,
            ]),
        ).toBeNull();
        expect(
            resolveDossierObjectionOutcome([
                {
                    ...pendingObjection,
                    decisionDate: '2026-09-01',
                    lastJudgmentType: 'إجابة الدعوى بالكامل',
                },
                appeal,
            ]),
        ).toBeNull();
        expect(
            resolveObjectionAppealGuidanceNotices({
                displayStage: appeal,
                stages: [pendingObjection, appeal],
            }),
        ).toEqual([]);
    });

    it('يصنّف تأييد الغيابي بعد تسجيل قرار الاعتراض', () => {
        expect(
            resolveDossierObjectionOutcome([
                {
                    ...pendingObjection,
                    finalDecision: 'تأييد الحكم الغيابي — بانتظار طعن المعترض',
                    decisionDate: '2026-09-01',
                },
                appeal,
            ]),
        ).toBe('uphold');
    });
});
