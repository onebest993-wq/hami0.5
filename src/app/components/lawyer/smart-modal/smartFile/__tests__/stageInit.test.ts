import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import {
    buildInitialStagesFromFile,
    isViewingArchivedStage,
    resolveInitialStageIndex,
} from '../stageInit';

describe('buildInitialStagesFromFile', () => {
    it('returns existing stages when present', () => {
        const existing = [{ id: 's1', stageName: 'استئناف', status: 'active' }];
        const stages = buildInitialStagesFromFile({ stages: existing });
        expect(stages).toEqual(existing);
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
        expect(stages[0]!.status).toBe('active');
    });
});

describe('resolveInitialStageIndex', () => {
    it('uses file activeStageIndex when valid', () => {
        expect(resolveInitialStageIndex({ activeStageIndex: 1 }, 3)).toBe(1);
    });

    it('falls back to last stage', () => {
        expect(resolveInitialStageIndex({}, 2)).toBe(1);
    });
});

describe('isViewingArchivedStage', () => {
    it('detects completed or locked stages', () => {
        expect(isViewingArchivedStage({ status: 'completed' } as never)).toBe(true);
        expect(isViewingArchivedStage({ status: 'active' } as never)).toBe(false);
    });
});
