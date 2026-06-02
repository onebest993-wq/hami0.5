import { useEffect, useMemo } from 'react';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import type { ClusterScanRecord } from './types';

/** إزالة تثبيتات لم يعد لها سجل في المسح — بعد اكتمال تحميل المصادر */
export function useWorkspacePinPrune(scanIndex: ClusterScanRecord[], enabled: boolean): void {
    const pruneMissingPins = useWorkspaceStore((s) => s.pruneMissingPins);

    const validKeys = useMemo(
        () => new Set(scanIndex.map((r) => `${r.type}:${r.id}`)),
        [scanIndex],
    );

    useEffect(() => {
        if (!enabled) return;
        // لا تُفرّغ التثبيتات عند فهرس فارغ (قبل التحميل أو حساب جديد بلا بيانات)
        if (validKeys.size === 0) return;
        pruneMissingPins(validKeys);
    }, [enabled, validKeys, pruneMissingPins]);
}
