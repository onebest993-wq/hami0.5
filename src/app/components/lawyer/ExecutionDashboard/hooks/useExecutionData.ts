import { useMemo } from 'react';
import { storageCache } from '@/app/utils/storageCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import type { ExecutionFile } from '@/app/types/execution';

export function useExecutionData(
    currentFile: ExecutionFile | null,
    file: any,
    executionId: string | undefined,
    executionStorageTick: number,
) {
    return useMemo(() => {
        if (currentFile) return currentFile;

        const idRaw = file?.id ?? executionId;
        const persistKey =
            idRaw != null && String(idRaw) !== '' && String(idRaw) !== 'undefined' ? String(idRaw) : '';
        const storageKey = persistKey ? executionStorageKey(persistKey) : '';
        const stored = storageKey ? storageCache.get(storageKey) : null;

        if (file && stored) {
            const fu = file.updatedAt ? Date.parse(String(file.updatedAt)) : 0;
            const su = stored.updatedAt ? Date.parse(String(stored.updatedAt)) : 0;
            if (Number.isFinite(su) && Number.isFinite(fu) && su > fu) {
                return stored as ExecutionFile;
            }
            if (Number.isFinite(su) && !Number.isFinite(fu) && su > 0) {
                return stored as ExecutionFile;
            }
            if (executionStorageTick > 0) {
                try {
                    const f = file as ExecutionFile;
                    const s = stored as ExecutionFile;
                    const pairs: [unknown, unknown][] = [
                        [f.party_death_case ?? null, s.party_death_case ?? null],
                        [f.party_multiplicity ?? null, s.party_multiplicity ?? null],
                        [f.debtors ?? null, s.debtors ?? null],
                        [f.guarantor_followup ?? null, s.guarantor_followup ?? null],
                        [f.hasGuarantor ?? null, s.hasGuarantor ?? null],
                        [f.creditors ?? null, s.creditors ?? null],
                    ];
                    for (const [fp, sp] of pairs) {
                        if (JSON.stringify(fp) !== JSON.stringify(sp)) {
                            return s;
                        }
                    }
                } catch {
                    /* ignore */
                }
            }
        }

        if (file) return file;
        if (executionId) {
            const s = storageCache.get(executionStorageKey(executionId));
            if (s) return s as ExecutionFile;
        }
        return null;
    }, [file, executionId, file?.updatedAt, executionStorageTick, currentFile]);
}
