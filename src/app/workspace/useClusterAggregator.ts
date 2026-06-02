import { useMemo } from 'react';
import { buildClusterScanIndex } from './buildClusterScanIndex';
import { findCrossSectionLinks } from './clusterMatchRules';
import { enrichPinFromScan } from './enrichPinFromScan';
import type { ClusterPinView, WorkspacePinnedItem } from './types';

export type ClusterAggregatorInput = {
    pinnedItems: WorkspacePinnedItem[];
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases: unknown[];
    urgentCases: unknown[];
    threadingTransactions?: unknown[];
    notes?: unknown[];
    fieldTasks?: unknown[];
};

/** مسح عنقودي للقراءة فقط — روابط بين أقسام مختلفة فقط */
export function useClusterAggregator(input: ClusterAggregatorInput): ClusterPinView[] {
    const {
        pinnedItems,
        lawsuitFiles,
        executionFiles,
        criminalCases,
        urgentCases,
        threadingTransactions,
        notes,
        fieldTasks,
    } = input;

    const scanIndex = useMemo(
        () =>
            buildClusterScanIndex({
                lawsuitFiles,
                executionFiles,
                criminalCases,
                urgentCases,
                threadingTransactions,
                notes,
                fieldTasks,
            }),
        [lawsuitFiles, executionFiles, criminalCases, urgentCases, threadingTransactions, notes, fieldTasks],
    );

    return useMemo(() => {
        if (pinnedItems.length === 0) return [];
        return pinnedItems.map((pin) => {
            const enriched = enrichPinFromScan(pin, scanIndex);
            return {
                pin: enriched,
                related: findCrossSectionLinks({ ...enriched, title: enriched.title }, scanIndex),
            };
        });
    }, [pinnedItems, scanIndex]);
}
