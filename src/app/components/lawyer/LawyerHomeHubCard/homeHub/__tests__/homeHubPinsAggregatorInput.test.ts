import { describe, expect, it } from 'vitest';
import {
    EMPTY_HOME_HUB_PINS_AGGREGATOR_INPUT,
    resolveHomeHubPinsAggregatorInput,
} from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubPinsAggregatorInput';
import type { WorkspacePinnedItem } from '@/app/workspace/types';

const sources = {
    lawsuitFiles: [{ id: 'f1' }],
    executionFiles: [{ id: 'e1' }],
    criminalCases: [{ id: 'c1' }],
    urgentCases: [{ id: 'u1' }],
    threadingTransactions: [{ id: 't1' }],
    notes: [{ id: 'n1' }],
    fieldTasks: [{ id: 'k1' }],
};

describe('resolveHomeHubPinsAggregatorInput', () => {
    it('صفر دبابيس إضبارة: مدخل ثابت بلا مسح عنقودي', () => {
        const hubOnly: WorkspacePinnedItem[] = [
            {
                id: 'hub-1',
                type: 'hub',
                title: 'مركز',
                clientName: '',
                caseNumber: '',
                routePath: 'workspace:hub',
            },
        ];
        expect(resolveHomeHubPinsAggregatorInput([], sources)).toBe(
            EMPTY_HOME_HUB_PINS_AGGREGATOR_INPUT,
        );
        expect(resolveHomeHubPinsAggregatorInput(hubOnly, sources)).toBe(
            EMPTY_HOME_HUB_PINS_AGGREGATOR_INPUT,
        );
    });

    it('مع تثبيت إضبارة يمرّر المصادر الحيّة', () => {
        const pins: WorkspacePinnedItem[] = [
            {
                id: 'p1',
                type: 'lawsuit',
                title: 'دعوى',
                clientName: 'أ',
                caseNumber: '1',
                routePath: 'workspace:lawsuit:p1',
            },
        ];
        const next = resolveHomeHubPinsAggregatorInput(pins, sources);
        expect(next).not.toBe(EMPTY_HOME_HUB_PINS_AGGREGATOR_INPUT);
        expect(next.pinnedItems).toBe(pins);
        expect(next.lawsuitFiles).toBe(sources.lawsuitFiles);
        expect(next.executionFiles).toBe(sources.executionFiles);
    });
});
