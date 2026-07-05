import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../LawyerShared';
import {
    resolveStableStageIndex,
    resolveStableViewingStageIndex,
} from './useSmartFileModalFileSync';

describe('resolveStableStageIndex', () => {
    it('preserves the same stage by id when incoming indices shift', () => {
        const prevStages = [
            { id: 'first', stageName: 'البداءة' },
            { id: 'appeal', stageName: 'الاستئناف' },
            { id: 'cass', stageName: 'التمييز' },
        ] as CaseStage[];
        const incomingStages = [
            { id: 'first', stageName: 'البداءة' },
            { id: 'cass', stageName: 'التمييز' },
            { id: 'appeal', stageName: 'الاستئناف' },
        ] as CaseStage[];

        expect(resolveStableStageIndex(prevStages, incomingStages, 1, 2)).toBe(2);
    });

    it('falls back to previous index when stage id is missing but index is still valid', () => {
        const prevStages = [{ id: 'stage-1' }, { id: 'stage-2' }] as CaseStage[];
        const incomingStages = [{ id: 'new-1' }, { id: 'new-2' }, { id: 'new-3' }] as CaseStage[];

        expect(resolveStableStageIndex(prevStages, incomingStages, 1, 0)).toBe(1);
    });

    it('falls back to supplied index when previous index is no longer valid', () => {
        const prevStages = [{ id: 'stage-1' }, { id: 'stage-2' }] as CaseStage[];
        const incomingStages = [{ id: 'new-1' }] as CaseStage[];

        expect(resolveStableStageIndex(prevStages, incomingStages, 1, 0)).toBe(0);
    });

    it('moves viewing stage with the new active stage when user was viewing the active stage', () => {
        const prevStages = [
            { id: 'first', stageName: 'البداءة' },
            { id: 'appeal', stageName: 'الاستئناف' },
        ] as CaseStage[];
        const incomingStages = [
            { id: 'first', stageName: 'البداءة', status: 'locked' },
            { id: 'appeal', stageName: 'الاستئناف', status: 'locked' },
            { id: 'cass', stageName: 'التمييز', status: 'active' },
        ] as CaseStage[];

        expect(resolveStableViewingStageIndex(prevStages, incomingStages, 1, 1, 2)).toBe(2);
    });

    it('preserves archived viewing stage when active stage changes in background', () => {
        const prevStages = [
            { id: 'first', stageName: 'البداءة' },
            { id: 'appeal', stageName: 'الاستئناف' },
        ] as CaseStage[];
        const incomingStages = [
            { id: 'first', stageName: 'البداءة', status: 'locked' },
            { id: 'appeal', stageName: 'الاستئناف', status: 'locked' },
            { id: 'cass', stageName: 'التمييز', status: 'active' },
        ] as CaseStage[];

        expect(resolveStableViewingStageIndex(prevStages, incomingStages, 0, 1, 2)).toBe(0);
    });
});
