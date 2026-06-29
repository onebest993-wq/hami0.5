// @ts-nocheck
/** Phase C Slice 17 — دمج/حفظ الإضبارة الأم + فتح تحرير بياناتها */
import { useCallback } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import { useExecutionDashboardStore } from '@/app/stores';
import { useDossierMeta } from '../useDossierMeta';

export type UseExecutionDashboardParentDossierPersistenceParams = {
    parentDossierId: string | undefined;
    parentExecutionFile: ExecutionFile | null | undefined;
    onUpdate: ((file: ExecutionFile) => void) | undefined;
    setExecutionStorageTick: React.Dispatch<React.SetStateAction<number>>;
    showToast: (message: string, type?: string) => void;
};

export function useExecutionDashboardParentDossierPersistence(
    params: UseExecutionDashboardParentDossierPersistenceParams,
) {
    const { parentDossierId, parentExecutionFile, onUpdate, setExecutionStorageTick, showToast } =
        params;

    const persistParentDossierMerge = useCallback(
        (patch: Record<string, unknown>) => {
            const pid = String(parentDossierId || '').trim();
            if (!pid || pid === 'undefined') return;
            const raw = storageCache.get(executionStorageKey(pid));
            const base = ((raw ?? parentExecutionFile) as ExecutionFile | null) ?? null;
            if (!base) return;
            const merged = {
                ...base,
                ...patch,
                updatedAt: new Date().toISOString(),
            } as ExecutionFile;
            storageCache.set(executionStorageKey(pid), merged);
            setExecutionStorageTick((t) => t + 1);
            try {
                const st = useExecutionDashboardStore.getState();
                if (String(st.currentFile?.id) === pid) st.setCurrentFile(merged);
            } catch {
                /* ignore */
            }
            onUpdate?.(merged);
        },
        [parentDossierId, parentExecutionFile, onUpdate, setExecutionStorageTick],
    );

    const parentIsEvictionForExpandedHeader = String(parentExecutionFile?.claimType ?? '').includes(
        'تخلية',
    );

    const { openEditDossierMeta: openParentDossierMetaEdit } = useDossierMeta(
        parentExecutionFile,
        String(parentExecutionFile?.directorate ?? ''),
        String(parentExecutionFile?.fileNumber ?? ''),
        String(parentExecutionFile?.fileYear ?? ''),
        String(parentExecutionFile?.docNumber ?? ''),
        String(parentExecutionFile?.judgmentDate ?? ''),
        String(parentExecutionFile?.classification ?? ''),
        String((parentExecutionFile as { property_number?: string } | null)?.property_number ?? ''),
        String((parentExecutionFile as { district?: string } | null)?.district ?? ''),
        String((parentExecutionFile as { property_type?: string } | null)?.property_type ?? ''),
        String((parentExecutionFile as { full_address?: string } | null)?.full_address ?? ''),
        (parentExecutionFile as { eviction_premises_use?: string } | null)?.eviction_premises_use,
        parentIsEvictionForExpandedHeader,
        persistParentDossierMerge,
        showToast,
    );

    return {
        persistParentDossierMerge,
        parentIsEvictionForExpandedHeader,
        openParentDossierMetaEdit,
    };
}
