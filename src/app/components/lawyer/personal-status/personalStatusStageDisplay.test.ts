import { describe, expect, it } from 'vitest';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import {
    buildPersonalStatusChromeStageStripItems,
    shouldShowPersonalStatusCassationOutcomePanel,
    shouldShowPersonalStatusCoreStageInChrome,
} from './personalStatusStageDisplay';

describe('shouldShowPersonalStatusCassationOutcomePanel', () => {
    it('shows on active تمييز stage before outcome', () => {
        expect(
            shouldShowPersonalStatusCassationOutcomePanel({
                stage: { stageName: 'تمييز', status: 'active', finalDecision: null },
                viewingStageIndex: 1,
                activeStageIndex: 1,
            }),
        ).toBe(true);
    });

    it('hides after ratification', () => {
        expect(
            shouldShowPersonalStatusCassationOutcomePanel({
                stage: {
                    stageName: 'تمييز',
                    status: 'completed',
                    finalDecision: 'مصدق (القرار اكتسب الدرجة القطعية)',
                },
                viewingStageIndex: 1,
                activeStageIndex: 1,
            }),
        ).toBe(false);
    });

    it('hides when viewing archived stage', () => {
        expect(
            shouldShowPersonalStatusCassationOutcomePanel({
                stage: { stageName: 'تمييز', status: 'active', finalDecision: null },
                isViewingArchived: true,
                viewingStageIndex: 1,
                activeStageIndex: 1,
            }),
        ).toBe(false);
    });

    it('hides on non-cassation stage', () => {
        expect(
            shouldShowPersonalStatusCassationOutcomePanel({
                stage: { stageName: 'أحوال شخصية', status: 'active', finalDecision: null },
                viewingStageIndex: 0,
                activeStageIndex: 0,
            }),
        ).toBe(false);
    });
});

describe('buildPersonalStatusChromeStageStripItems', () => {
    it('shows أحوال شخصية alongside تمييز in multi-stage journey', () => {
        const stages = [
            { id: '1', stageName: 'أحوال شخصية', status: 'locked' },
            { id: '2', stageName: 'تمييز', status: 'active' },
        ] as CaseStage[];

        expect(shouldShowPersonalStatusCoreStageInChrome(stages)).toBe(true);

        const items = buildPersonalStatusChromeStageStripItems(stages, 1, 1);
        expect(items.map((item) => item.displayName)).toEqual(['أحوال شخصية', 'تمييز']);
    });

    it('hides أحوال شخصية pill on single-stage dossier', () => {
        const stages = [{ id: '1', stageName: 'أحوال شخصية', status: 'active' }] as CaseStage[];
        expect(shouldShowPersonalStatusCoreStageInChrome(stages)).toBe(false);
        const items = buildPersonalStatusChromeStageStripItems(stages, 0, 0);
        expect(items).toHaveLength(0);
    });
});
