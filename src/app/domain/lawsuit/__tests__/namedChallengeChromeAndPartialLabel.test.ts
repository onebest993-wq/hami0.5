import { describe, expect, it } from 'vitest';
import { buildLitigationMatrixInputFromStage } from '../buildLitigationMatrixFromStage';
import { resolveCivilLitigationMatrixDecision } from '../litigationDecisionEngine';
import { resolvePostHopChallengeChromeActions } from '@/app/components/lawyer/smart-modal/layout/mainPanel/postHopChallengeChrome';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import {
    BOUND_MERIT_PARTIAL_LABEL,
    formatJudgmentOutcomeDisplayLabel,
    PARTIAL_JUDGMENT_OPTION_LABEL,
} from '@/app/components/lawyer/smart-modal/smartFile/judgmentOutcomeDisplay';

describe('إلزام جزئي — عرض منطوق الحكم', () => {
    it('يعرض رد جزئي كإلزام جزئي دون تغيير قيمة التخزين', () => {
        expect(formatJudgmentOutcomeDisplayLabel('رد الدعوى جزئياً')).toBe(
            'رد الدعوى جزئياً (إلزام جزئي)',
        );
        expect(formatJudgmentOutcomeDisplayLabel('إجابة الدعوى بالكامل')).toBe(
            'إجابة الدعوى بالكامل',
        );
        expect(BOUND_MERIT_PARTIAL_LABEL).toBe('إلزام جزئي');
        expect(PARTIAL_JUDGMENT_OPTION_LABEL).toContain('إلزام جزئي');
    });
});

describe('buildLitigationMatrixFromStage + named top-bar', () => {
    const fi = {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'locked',
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
        parties: [
            { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
            { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
            { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
        ],
    } as CaseStage;

    it('يبني مصفوفة ويستخرج أزرار شريط مسمّاة لأكثر من مستحق', () => {
        const matrix = buildLitigationMatrixInputFromStage({ stage: fi });
        expect(matrix).not.toBeNull();
        const decision = resolveCivilLitigationMatrixDecision(matrix!);
        expect(decision.topBarActions.length).toBeGreaterThanOrEqual(2);
        expect(decision.topBarActions.some((a) => a.challengerName === 'سامي')).toBe(true);
        expect(decision.topBarActions.every((a) => a.challengerId !== '3')).toBe(true);
    });

    it('resolvePostHopChallengeChromeActions يعرض الأسماء على مرحلة البداءة بعد الحكم', () => {
        const chrome = resolvePostHopChallengeChromeActions({
            stages: [fi],
            displayStage: fi,
            displayStageLabel: 'بداءة بدرجة أولى',
            viewingStageIndex: 0,
            activeStageIndex: 0,
        });
        expect(chrome.namedChallengeActions.length).toBeGreaterThanOrEqual(2);
        expect(chrome.namedChallengeActions.some((a) => a.label.includes('سامي'))).toBe(true);
        expect(chrome.namedChallengeActions.every((a) => !a.label.includes('استئناف'))).toBe(true);
    });

    it('الأحوال: أزرار مسمّاة بلا استئناف في النص', () => {
        const ps = {
            ...fi,
            name: 'أحوال شخصية',
            stageName: 'أحوال شخصية',
        } as CaseStage;
        const chrome = resolvePostHopChallengeChromeActions({
            stages: [ps],
            displayStage: ps,
            displayStageLabel: 'أحوال شخصية',
            viewingStageIndex: 0,
            activeStageIndex: 0,
            file: { lawsuitJurisdiction: 'personal' },
        });
        expect(chrome.showIndependentClientChallenge).toBe(false);
        expect(chrome.namedChallengeActions.every((a) => !/استئناف/.test(a.label))).toBe(true);
    });
});
