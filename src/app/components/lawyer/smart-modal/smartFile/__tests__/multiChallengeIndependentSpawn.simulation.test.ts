import { describe, expect, it, vi } from 'vitest';
import type { CaseStage, FileData, Party } from '@/app/components/lawyer/LawyerShared';
import { applyAppealStageTransition } from '@/app/components/lawyer/smart-modal/smartFile/appealStageTransitionApply';
import { buildIndependentChallengeSpawnInput } from '@/app/components/lawyer/smart-modal/smartFile/independentChallengeSpawnApply';
import { resolveAppealTransitionSpawnDecision } from '@/app/components/lawyer/smart-modal/smartFile/appealTransitionSpawnDecision';
import {
    applyIndependentChallengeSpawn,
    shouldSpawnIndependentChallengeDossier,
} from '@/app/domain/lawsuit/independentChallengeDossier';
import { isAppellantAppealRole } from '@/app/components/lawyer/smart-modal/smartFile/partyRoleClassification';
import { resolvePostHopChallengeChromeActions } from '@/app/components/lawyer/smart-modal/layout/mainPanel/postHopChallengeChrome';

const PARTIES: Party[] = [
    { id: 1, name: 'أحمد', role: 'المدعي', isClient: true, side: 'right' },
    { id: 2, name: 'سامي', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 3, name: 'كريم', role: 'المدعى عليه', isClient: false, side: 'left' },
];

function buildAfterFirstAppeal(): { stages: CaseStage[]; fi: CaseStage; appeal: CaseStage } {
    const fi = {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'locked',
        parties: PARTIES,
        caseNo: '100/2026',
        finalDecision: 'رد الدعوى جزئياً',
        awaitingOpponentAppeal: true,
        disputeIntegrity: 'indivisible',
        judgmentForm: 'حضوري',
        partyJudgmentDispositions: [
            { partyId: '2', form: 'حضوري', operative: 'bound' },
            { partyId: '3', form: 'حضوري', operative: 'bound' },
        ],
        partyChallengeLanes: [
            { partyId: '2', disposition: 'حضوري', laneState: 'appeal' },
            { partyId: '3', disposition: 'حضوري', laneState: 'pending' },
        ],
    } as CaseStage;

    const hop = applyAppealStageTransition([fi], 0, fi, {
        appealType: 'استئناف',
        appellant: 'المدعى عليه',
        filingDate: '2026-09-01',
        newCaseNumber: 'است/10',
        newCourt: 'استئناف بغداد',
        includedAppellantPartyIds: [2],
        includedOpponentPartyIds: [1],
        priorStageOutcome: 'PARTIAL',
    });
    expect(hop.independentRequired).toBeFalsy();
    const stages = hop.updatedStages;
    return { stages, fi: stages[0]!, appeal: stages[1]! };
}

describe('طعن متعدد — لا تخريب رول الأم + إضبارة جديدة', () => {
    it('على مرحلة الاستئناف: shouldSpawn بالـcurrent قد يفشل بينما force/FI ينجح', () => {
        const { stages, appeal, fi } = buildAfterFirstAppeal();
        expect(
            shouldSpawnIndependentChallengeDossier({
                stages,
                sourceStage: appeal,
                appealType: 'استئناف',
            }),
        ).toBe(false);
        expect(
            shouldSpawnIndependentChallengeDossier({
                stages,
                sourceStage: fi,
                appealType: 'استئناف',
            }),
        ).toBe(true);

        const withoutForce = resolveAppealTransitionSpawnDecision({
            stages,
            currentStage: appeal,
            activeStageIndex: 1,
            appealType: 'استئناف',
            forceIndependentChallengeSpawn: false,
        });
        expect(withoutForce.spawn).toBe(true);
        expect(withoutForce.sourceStageIndex).toBe(0);

        const withForce = resolveAppealTransitionSpawnDecision({
            stages,
            currentStage: appeal,
            activeStageIndex: 1,
            appealType: 'استئناف',
            forceIndependentChallengeSpawn: true,
        });
        expect(withForce.spawn).toBe(true);
    });

    it('تأكيد الطعن المسمّى ينشئ ملفاً جديداً دون قلب أطراف رول الاستئناف في الأم', () => {
        const { stages, appeal } = buildAfterFirstAppeal();
        const motherAppellantsBefore = (appeal.parties ?? [])
            .filter((p) => isAppellantAppealRole(String(p.role)))
            .map((p) => p.id)
            .sort();

        const sourceFile = {
            id: 11,
            type: 'lawsuit',
            status: 'active',
            caseNo: '100/2026',
            court: 'بداءة الرصافة',
            parties: PARTIES,
            stages,
            activeStageIndex: 1,
            representedParty: 'المدعي',
            history: [],
            notes: [],
            images: [],
            date: '2026-01-01',
        } as FileData;

        const decision = resolveAppealTransitionSpawnDecision({
            stages,
            currentStage: stages[1]!,
            activeStageIndex: 1,
            appealType: 'استئناف',
            forceIndependentChallengeSpawn: true,
        });
        expect(decision.spawn).toBe(true);

        const spawn = buildIndependentChallengeSpawnInput({
            sourceFileId: 11,
            stages,
            sourceStageIndex: decision.sourceStageIndex,
            sourceStage: decision.sourceStage,
            hop: {
                appealType: 'استئناف',
                appellant: 'المدعى عليه',
                filingDate: '2026-09-21',
                newCaseNumber: 'است/77',
                newCourt: 'استئناف بغداد',
                includedAppellantPartyIds: [3],
                includedOpponentPartyIds: [1],
                priorStageOutcome: 'PARTIAL',
            },
            sourceFile,
        });
        expect('error' in spawn).toBe(false);
        if ('error' in spawn) return;

        const onSpawn = vi.fn();
        onSpawn(spawn);

        const { sourceFile: patched, createdFile } = applyIndependentChallengeSpawn({
            sourceFile,
            sourceStageIndex: decision.sourceStageIndex,
            createdId: 88,
            appealStage: spawn.appealStage,
            appealType: 'استئناف',
            filingDate: '2026-09-21',
            newCaseNumber: 'است/77',
            newCourt: 'استئناف بغداد',
        });

        const motherAppeal = patched.stages?.[1];
        expect(motherAppeal?.caseNo).toBe('است/10');
        expect(
            (motherAppeal?.parties ?? [])
                .filter((p) => isAppellantAppealRole(String(p.role)))
                .map((p) => p.id)
                .sort(),
        ).toEqual(motherAppellantsBefore);
        expect(motherAppeal?.parties?.some((p) => p.id === 3 && isAppellantAppealRole(String(p.role)))).toBe(
            false,
        );

        expect(createdFile.id).toBe(88);
        expect(createdFile.caseNo).toBe('است/77');
        expect(createdFile.parentId).toBe(11);
        expect(createdFile.stages?.[0]?.parties?.some((p) => p.id === 3)).toBe(true);
        expect(onSpawn).toHaveBeenCalledTimes(1);
    });

    it('أزرار الشريط المسمّاة تظهر بعد الحكم الجزئي المتعدد', () => {
        const fi = {
            id: 's0',
            name: 'بداءة بدرجة أولى',
            stageName: 'بداءة بدرجة أولى',
            status: 'active',
            finalDecision: 'رد الدعوى جزئياً',
            awaitingOpponentAppeal: true,
            disputeIntegrity: 'indivisible',
            partyJudgmentDispositions: [
                { partyId: '2', form: 'حضوري', operative: 'bound' },
                { partyId: '3', form: 'حضوري', operative: 'released' },
            ],
            partyChallengeLanes: [
                { partyId: '2', disposition: 'حضوري', laneState: 'pending' },
                { partyId: '3', disposition: 'حضوري', laneState: 'pending' },
            ],
            parties: PARTIES,
        } as CaseStage;

        const chrome = resolvePostHopChallengeChromeActions({
            stages: [fi],
            displayStage: fi,
            displayStageLabel: 'بداءة بدرجة أولى',
            viewingStageIndex: 0,
            activeStageIndex: 0,
        });
        expect(chrome.namedChallengeActions.length).toBeGreaterThanOrEqual(2);
    });
});
