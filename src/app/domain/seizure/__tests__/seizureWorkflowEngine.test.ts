import { describe, expect, it } from 'vitest';
import {
    createSeizureWorkflowEngine,
    executorSubtypesForWorkflowStep,
    getSeizureAssetPlugin,
    workflowActiveStepIndex,
} from '@/app/domain/seizure';

describe('seizureWorkflowEngine', () => {
    it('movable and property share eight-step active index rules', () => {
        const movablePlugin = getSeizureAssetPlugin('movable');
        const propertyPlugin = getSeizureAssetPlugin('property');

        expect(workflowActiveStepIndex('seized', { seizureMarkLetterNumber: '123' })).toBe(1);
        expect(workflowActiveStepIndex('valued', {})).toBe(2);
        expect(workflowActiveStepIndex('sold', {})).toBe(7);

        expect(executorSubtypesForWorkflowStep(movablePlugin, 1)).toEqual(['movable_expert']);
        expect(executorSubtypesForWorkflowStep(propertyPlugin, 1)).toEqual(['property_expert']);
    });

    it('resolves inline focus step from approved subtype', () => {
        const engine = createSeizureWorkflowEngine({
            assetKind: 'movable',
            dossierInput: { executionId: 'exec-1' },
        });
        expect(engine.inlineFocusStepForApprovedSubtype('movable_expert')).toBe('experts');
        expect(engine.inlineFocusStepForApprovedSubtype('movable_auction_date')).toBe('auction');
        expect(engine.inlineFocusEventName()).toBe('hami-movable-inline-focus');
    });
});
