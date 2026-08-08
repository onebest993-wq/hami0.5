import { useMemo } from 'react';
import { buildClusterScanIndex } from '@/app/workspace/buildClusterScanIndex';
import { findCrossSectionLinks } from '@/app/workspace/clusterMatchRules';
import { enrichPinFromScan } from '@/app/workspace/enrichPinFromScan';
import type { ClusterPinView } from '@/app/workspace/types';
import type { ClusterAggregatorInput } from '@/app/workspace/useClusterAggregator';

const EMPTY_CLUSTER_VIEWS: ClusterPinView[] = [];

/**
 * تجميع عنقودي — يُشغَّل فقط عند تفعيل اللوحة (تبويب التثبيت).
 * عند التعطيل لا يُبنى فهرس المسح ولا تُثرى الدبابيس.
 */
export function useClusterAggregatorGated(
    enabled: boolean,
    input: ClusterAggregatorInput,
): ClusterPinView[] {
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

    const dossierPins = useMemo(
        () => (enabled ? pinnedItems.filter((p) => p.type !== 'hub') : []),
        [enabled, pinnedItems],
    );

    const scanIndex = useMemo(() => {
        if (!enabled || dossierPins.length === 0) return null;
        return buildClusterScanIndex({
            lawsuitFiles,
            executionFiles,
            criminalCases,
            urgentCases,
            threadingTransactions,
            notes,
            fieldTasks,
        });
    }, [
        enabled,
        dossierPins.length,
        lawsuitFiles,
        executionFiles,
        criminalCases,
        urgentCases,
        threadingTransactions,
        notes,
        fieldTasks,
    ]);

    return useMemo(() => {
        if (!enabled || !scanIndex || dossierPins.length === 0) return EMPTY_CLUSTER_VIEWS;
        return dossierPins.map((pin) => {
            const enriched = enrichPinFromScan(pin, scanIndex);
            return {
                pin: enriched,
                related: findCrossSectionLinks({ ...enriched, title: enriched.title }, scanIndex),
            };
        });
    }, [dossierPins, enabled, scanIndex]);
}
