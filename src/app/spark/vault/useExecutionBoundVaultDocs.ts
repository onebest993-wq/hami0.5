import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { useAuth } from '@/app/context/AuthContext';
import { useVaultDocsForClusterScan } from '@/app/workspace/useVaultDocsForClusterScan';
import { resolveVaultDocsBoundToExecution } from '@/app/spark/vault/resolveVaultDocsBoundToExecution';

/** مرفقات الخزنة المربوطة بإضبارة تنفيذ — تجربة OCR → تماسك */
export function useExecutionBoundVaultDocs(
    executionData: ExecutionFile | null | undefined,
    enabled = true,
) {
    const { user } = useAuth();
    const userId = String(user?.id ?? '').trim();
    const vaultDocs = useVaultDocsForClusterScan(userId || undefined, enabled && Boolean(userId));

    return useMemo(() => {
        if (!enabled || !executionData) return [];
        return resolveVaultDocsBoundToExecution(vaultDocs, executionData);
    }, [enabled, executionData, vaultDocs]);
}
