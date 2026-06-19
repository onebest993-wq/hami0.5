import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import {
    buildChromeStageStripItems,
    resolveStepperStageDisplayName,
    shouldShowFutureCassationStage,
} from '../stepperPipeline';

describe('stepperPipeline', () => {
    it('shows future التمييز when appeal exists without cassation', () => {
        const stages = [
            { id: '1', stageName: 'البداءة', status: 'locked' },
            { id: '2', stageName: 'الاستئناف', status: 'active' },
        ] as CaseStage[];

        expect(shouldShowFutureCassationStage(stages)).toBe(true);
        const items = buildChromeStageStripItems(stages, 1, 1);
        expect(items).toHaveLength(3);
        expect(items[2]?.isPlaceholder).toBe(true);
        expect(items[2]?.displayName).toBe('التمييز');
    });

    it('hides future التمييز when cassation stage already exists', () => {
        const stages = [
            { id: '1', stageName: 'البداءة', status: 'locked' },
            { id: '2', stageName: 'الاستئناف', status: 'locked' },
            { id: '3', stageName: 'التمييز', status: 'active' },
        ] as CaseStage[];

        expect(shouldShowFutureCassationStage(stages)).toBe(false);
        expect(buildChromeStageStripItems(stages, 2, 2)).toHaveLength(3);
    });

    it('marks active remand stage without renaming in stepper', () => {
        const stages = [
            { id: '1', stageName: 'البداءة', status: 'locked' },
            { id: '2', stageName: 'الاستئناف', status: 'active', wasReopened: true },
            {
                id: '3',
                stageName: 'التمييز',
                status: 'completed',
                finalDecision: 'منقوض (إعادة للمحاكمة)',
            },
        ] as CaseStage[];

        expect(resolveStepperStageDisplayName(stages[1]!, 1, stages)).toBe('الاستئناف');
        const items = buildChromeStageStripItems(stages, 1, 1);
        expect(items[1]?.postCassationRemand).toBe(true);
        expect(items[1]?.displayName).toBe('الاستئناف');
    });
});
