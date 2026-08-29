import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import {
    buildInitialStagesFromFile,
    inferActiveStageIndexFromStages,
    isLockedPriorStage,
    isViewingArchivedStage,
    resolveInitialStageIndex,
    shouldShowFirstInstancePleadingLockUi,
    shouldShowExtraordinaryPleadingPostJudgmentUi,
} from '../stageInit';

describe('buildInitialStagesFromFile', () => {
    it('returns existing stages when present', () => {
        const existing = [{ id: 's1', stageName: 'استئناف', status: 'active' }];
        const stages = buildInitialStagesFromFile({ stages: existing });
        expect(stages).toHaveLength(1);
        expect(stages[0]?.id).toBe('s1');
        expect(stages[0]?.stageName).toBe('استئناف');
        expect(stages[0]?.status).toBe('active');
    });

    it('creates default first stage from file metadata', () => {
        const stages = buildInitialStagesFromFile({
            caseNo: '10 / أ / 2026',
            court: 'كرخ',
            currentStage: 'بداءة',
            parties: [{ id: 1, name: 'موكل' }],
            history: [{ id: 1, stage: 'جلسة', result: '', date: '2026-01-01' }],
        });
        expect(stages).toHaveLength(1);
        const first = stages[0] as CaseStage & { caseNo?: string; court?: string };
        expect(first.caseNo).toBe('10 / أ / 2026');
        expect(first.court).toBe('كرخ');
        expect(first.stageName).toBe('بداءة');
        expect(stages[0]!.status).toBe('active');
    });

    it('fills judge and stageName from file when the active stage omits them', () => {
        const stages = buildInitialStagesFromFile({
            judge: 'القاضي علي',
            currentStage: 'استئناف',
            stages: [{ id: 's1', status: 'active' }],
        });
        expect(stages[0]?.judge).toBe('القاضي علي');
        expect(stages[0]?.stageName).toBe('استئناف');
        expect(stages[0]?.name).toBe('استئناف');
    });

    it('uses file parties when active stage has empty parties array', () => {
        const fileParties = [
            { id: 1, name: 'المدعي', role: 'المدعي', side: 'right' },
            { id: 2, name: 'المدعى عليه', role: 'المدعى عليه', side: 'left' },
        ];
        const stages = buildInitialStagesFromFile({
            caseNo: '10 / أ / 2026',
            court: 'كرخ',
            parties: fileParties,
            stages: [{ id: 's1', stageName: 'البداءة', status: 'active', parties: [] }],
        });
        expect((stages[0] as CaseStage).parties).toEqual(fileParties);
    });
});

describe('resolveInitialStageIndex', () => {
    it('uses file activeStageIndex when valid', () => {
        expect(resolveInitialStageIndex({ activeStageIndex: 1 }, 3)).toBe(1);
    });

    it('falls back to last stage for civil when no active marker', () => {
        expect(resolveInitialStageIndex({}, 2)).toBe(1);
    });

    it('prefers active stage from stages array when activeStageIndex missing', () => {
        const stages = [
            { stageName: 'أحوال شخصية', status: 'active' },
            { stageName: 'تمييز', status: 'locked' },
        ] as CaseStage[];
        expect(resolveInitialStageIndex({}, 2, stages)).toBe(0);
        expect(inferActiveStageIndexFromStages(stages)).toBe(0);
    });

    it('personal status opens core dossier when cassation is terminal only', () => {
        const stages = [
            { stageName: 'أحوال شخصية', status: 'locked' },
            { stageName: 'تمييز', status: 'completed' },
        ] as CaseStage[];
        expect(
            resolveInitialStageIndex({ lawsuitJurisdiction: 'personal' }, 2, stages),
        ).toBe(0);
    });
});

describe('isViewingArchivedStage', () => {
    it('detects completed or locked stages', () => {
        expect(isViewingArchivedStage({ status: 'completed' } as never)).toBe(true);
        expect(isViewingArchivedStage({ status: 'active' } as never)).toBe(false);
    });

    it('does not archive stages awaiting opponent appeal', () => {
        expect(
            isViewingArchivedStage({
                status: 'completed',
                isPleadingsClosed: true,
                awaitingOpponentAppeal: true,
                finalDecision: 'محسومة لصالح الموكل - بانتظار الطعن',
            } as never),
        ).toBe(false);
        expect(
            isViewingArchivedStage({
                status: 'completed',
                isPleadingsClosed: true,
                finalDecision: 'محسومة ضد الموكل - بانتظار الطعن',
            } as never),
        ).toBe(false);
    });
});

describe('pleading lock UI helpers', () => {
    it('hides lock chrome on locked prior stages', () => {
        expect(isLockedPriorStage({ status: 'locked' })).toBe(true);
        expect(
            shouldShowFirstInstancePleadingLockUi({
                status: 'locked',
                isPleadingsClosed: true,
                stageName: 'البداءة',
            }),
        ).toBe(false);
    });

    it('shows lock chrome on active awaiting first instance', () => {
        expect(
            shouldShowFirstInstancePleadingLockUi({
                status: 'active',
                isPleadingsClosed: true,
                stageName: 'البداءة',
                awaitingOpponentAppeal: true,
            }),
        ).toBe(true);
    });

    it('shows post-judgment appeal chrome on third-party objection after pleadings close', () => {
        expect(
            shouldShowExtraordinaryPleadingPostJudgmentUi({
                status: 'active',
                isPleadingsClosed: true,
                stageName: 'اعتراض الغير',
            }),
        ).toBe(true);
        expect(
            shouldShowExtraordinaryPleadingPostJudgmentUi({
                status: 'active',
                isPleadingsClosed: true,
                name: 'إعادة المحاكمة',
            }),
        ).toBe(true);
        expect(
            shouldShowExtraordinaryPleadingPostJudgmentUi({
                status: 'active',
                isPleadingsClosed: true,
                stageName: 'البداءة',
            }),
        ).toBe(false);
    });
});
