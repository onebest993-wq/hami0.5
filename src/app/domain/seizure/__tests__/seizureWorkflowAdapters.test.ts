import { describe, expect, it } from 'vitest';
import { getSeizureAssetPlugin } from '../seizureAssetPlugins';
import {
    findSeizureDecisionForProperty,
    executorSubtypesForPropertyWorkflowStatus,
    propertyWorkflowActiveStepIndex,
    normalizePropertySeizureStatus,
    buildPropertyWorkflowStepHistory,
} from '../seizureWorkflowPropertyAdapter';
import {
    findSeizureDecisionForMovable,
    executorSubtypesForMovableWorkflowStatus,
    movableWorkflowActiveStepIndex,
    buildMovableWorkflowStepHistory,
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

    it('تاريخ خطوة الإشارة يقرأ رقم الكتاب من الأصل', () => {
        const movableLines = buildMovableWorkflowStepHistory(
            0,
            { id: 'm1', seizureMarkLetterNumber: 'ك-99' } as never,
            [],
            'm1',
        );
        const propertyLines = buildPropertyWorkflowStepHistory(
            0,
            { id: 'p1', seizureMarkLetterNumber: 'ع-12' } as never,
            [],
            'p1',
        );
        expect(movableLines.some((l) => String(l.value).includes('ك-99'))).toBe(true);
        expect(propertyLines.some((l) => String(l.value).includes('ع-12'))).toBe(true);
    });
});
