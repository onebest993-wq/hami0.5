import { countHomeHubDossierPins } from '@/app/services/alerts/homeHubPanelModel';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { WorkspacePinnedItem } from '@/app/workspace/types';
import type { ClusterAggregatorInput } from '@/app/workspace/useClusterAggregator';

type HomeHubPinsScanSlice = Pick<
    ClusterScanSources,
    | 'lawsuitFiles'
    | 'executionFiles'
    | 'criminalCases'
    | 'urgentCases'
    | 'threadingTransactions'
    | 'notes'
    | 'fieldTasks'
>;

const EMPTY_SCAN: unknown[] = [];

/** مدخل ثابت — البطاقة الفارغة لا تمسك ملفات المساحة أثناء ترطيب العناقيد. */
export const EMPTY_HOME_HUB_PINS_AGGREGATOR_INPUT: ClusterAggregatorInput = {
    pinnedItems: [],
    lawsuitFiles: EMPTY_SCAN,
    executionFiles: EMPTY_SCAN,
    criminalCases: EMPTY_SCAN,
    urgentCases: EMPTY_SCAN,
    threadingTransactions: EMPTY_SCAN,
    notes: EMPTY_SCAN,
    fieldTasks: EMPTY_SCAN,
};

export function buildHomeHubPinsAggregatorInput(
    pinnedItems: WorkspacePinnedItem[],
    sources: HomeHubPinsScanSlice,
): ClusterAggregatorInput {
    return {
        pinnedItems,
        lawsuitFiles: sources.lawsuitFiles,
        executionFiles: sources.executionFiles,
        criminalCases: sources.criminalCases,
        urgentCases: sources.urgentCases,
        threadingTransactions: sources.threadingTransactions,
        notes: sources.notes,
        fieldTasks: sources.fieldTasks,
    };
}

export function resolveHomeHubPinsAggregatorInput(
    pinnedItems: WorkspacePinnedItem[],
    sources: HomeHubPinsScanSlice,
): ClusterAggregatorInput {
    if (countHomeHubDossierPins(pinnedItems) === 0) {
        return EMPTY_HOME_HUB_PINS_AGGREGATOR_INPUT;
    }
    return buildHomeHubPinsAggregatorInput(pinnedItems, sources);
}
