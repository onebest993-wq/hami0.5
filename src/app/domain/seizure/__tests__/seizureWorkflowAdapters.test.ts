import { describe, expect, it } from 'vitest';
import { getSeizureAssetPlugin } from '../seizureAssetPlugins';
import {
    findSeizureDecisionForProperty,
    executorSubtypesForPropertyWorkflowStatus,
    propertyWorkflowActiveStepIndex,
    normalizePropertySeizureStatus,
} from '../seizureWorkflowPropertyAdapter';
import {
    findSeizureDecisionForMovable,
    executorSubtypesForMovableWorkflowStatus,
    movableWorkflowActiveStepIndex,
} from '../seizureWorkflowMovableAdapter';
import {
    findSeizureDecisionForEntity,
    executorSubtypesForWorkflowStatus,
    workflowActiveStepIndex,
} from '../seizureWorkflowDecisionQueries';
import { normalizeSeizureWorkflowStatus } from '../seizureWorkflowStatus';

const propertyPlugin = getSeizureAssetPlugin('property');
const movablePlugin = getSeizureAssetPlugin('movable');

describe('seizureWorkflowAdapters', () => {
    it('normalizePropertySeizureStatus يطابق normalizeSeizureWorkflowStatus', () => {
        expect(normalizePropertySeizureStatus('estimated')).toBe('valued');
        expect(normalizeSeizureWorkflowStatus('auction_scheduled')).toBe('published');
    });

    it('property adapter يفوّض findSeizureDecisionForEntity', () => {
        const decisions = [
            {
                requestKind: 'seizure',
                seizureSubtype: 'property_expert',
                seizurePayloadJson: JSON.stringify({ seizedPropertyId: 'p1' }),
                executorOutcome: 'pending',
            },
        ];
        const fromAdapter = findSeizureDecisionForProperty(decisions, 'property_expert', 'p1', {
            pendingOnly: true,
        });
        const fromDomain = findSeizureDecisionForEntity(
            decisions,
            propertyPlugin,
            'property_expert',
            'p1',
            { pendingOnly: true },
        );
        expect(fromAdapter).toBe(fromDomain);
    });

    it('movable adapter يفوّض findSeizureDecisionForEntity', () => {
        const decisions = [
            {
                requestKind: 'seizure',
                seizureSubtype: 'movable_expert',
                seizurePayloadJson: JSON.stringify({ seizedMovableId: 'm1' }),
                executorOutcome: 'pending',
            },
        ];
        const fromAdapter = findSeizureDecisionForMovable(decisions, 'movable_expert', 'm1', {
            pendingOnly: true,
        });
        const fromDomain = findSeizureDecisionForEntity(
            decisions,
            movablePlugin,
            'movable_expert',
            'm1',
            { pendingOnly: true },
        );
        expect(fromAdapter).toBe(fromDomain);
    });

    it('executorSubtypesForPropertyWorkflowStatus يطابق plugin queries', () => {
        const property = {
            id: 'p1',
            seizureMarkLetterNumber: '123',
            status: 'seized',
        };
        expect(executorSubtypesForPropertyWorkflowStatus('seized', property as never)).toEqual(
            executorSubtypesForWorkflowStatus(propertyPlugin, 'seized', property),
        );
    });

    it('executorSubtypesForMovableWorkflowStatus يطابق plugin queries', () => {
        const movable = {
            id: 'm1',
            seizureMarkLetterNumber: '456',
            status: 'valued',
        };
        expect(executorSubtypesForMovableWorkflowStatus('valued', movable as never)).toEqual(
            executorSubtypesForWorkflowStatus(movablePlugin, 'valued', movable),
        );
    });

    it('workflowActiveStepIndex موحّد للعقار والمنقول', () => {
        const entity = {
            seizureMarkLetterNumber: '1',
            newspaperName: '',
            publicationDateYmd: '',
        };
        expect(propertyWorkflowActiveStepIndex('published', entity)).toBe(
            workflowActiveStepIndex('published', entity),
        );
        expect(movableWorkflowActiveStepIndex('published', entity as never)).toBe(
            workflowActiveStepIndex('published', entity),
        );
    });
});
