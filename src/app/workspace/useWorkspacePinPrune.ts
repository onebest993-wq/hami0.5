import { useEffect, useMemo } from 'react';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import type { ClusterScanRecord } from './types';
import { buildConservativePruneKeepKeys } from './workspacePinPrunePolicy';

/** إزالة تثبيتات لم يعد لها سجل في المسح — بعد اكتمال تحميل المصادر */
export function useWorkspacePinPrune(scanIndex: ClusterScanRecord[], enabled: boolean): void {
    const pruneMissingPins = useWorkspaceStore((s) => s.pruneMissingPins);
    const pinnedItems = useWorkspaceStore((s) => s.pinnedItems);

    const keepKeys = useMemo(
        () => buildConservativePruneKeepKeys(scanIndex, pinnedItems),
        [scanIndex, pinnedItems],
    );

    useEffect(() => {
        if (!enabled) return;
        // لا تُفرّغ التثبيتات عند فهرس فارغ (قبل التحميل أو حساب جديد بلا بيانات)
        if (scanIndex.length === 0) return;
        pruneMissingPins(keepKeys);
    }, [enabled, keepKeys, pruneMissingPins, scanIndex.length]);
}
