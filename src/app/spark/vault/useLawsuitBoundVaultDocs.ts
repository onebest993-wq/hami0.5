import { useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useVaultDocsForClusterScan } from '@/app/workspace/useVaultDocsForClusterScan';
import { resolveVaultDocsBoundToLawsuit } from '@/app/spark/vault/resolveVaultDocsBoundToLawsuit';

/** مرفقات الخزنة المربوطة بإضبارة دعوى — OCR → تماسك */
export function useLawsuitBoundVaultDocs(
    file: Record<string, unknown> | null | undefined,
    enabled = true,
) {
    const { user } = useAuth();
    const userId = String(user?.id ?? '').trim();
    const vaultDocs = useVaultDocsForClusterScan(userId || undefined, enabled && Boolean(userId));

    return useMemo(() => {
        if (!enabled || !file) return [];
        return resolveVaultDocsBoundToLawsuit(vaultDocs, file);
    }, [enabled, file, vaultDocs]);
}
