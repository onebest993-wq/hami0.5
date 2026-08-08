import { useMemo, useRef } from 'react';
import { buildExecutionViewData } from '@/app/application/execution/dossier/buildExecutionViewData';
import { normalizeExecutionFileRecord } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { resolvePartyStoredName } from '@/app/utils/executionPartyNormalize';
import { isInabaSubFileId } from '@/app/stores/executionDashboardStore';
import type { ExecutionFile } from '@/app/types/execution';
import { maritalFurnitureFinancialContentSignature } from '@/app/utils/maritalFurniture';
import { personalCoercivePersistSignature } from '@/app/components/lawyer/execution/coerciveStackUtils';

/** توقيع محتوى — لتثبيت المرجع ومنع حلقات setState */
export function executionFileContentSignature(file: ExecutionFile | null | undefined): string {
    if (!file) return '';
    try {
        const seizedProps = Array.isArray((file as ExecutionFile).seizedProperties)
            ? (file as ExecutionFile).seizedProperties!
            : [];
        const seizedMov = Array.isArray((file as ExecutionFile).seizedMovables)
            ? (file as ExecutionFile).seizedMovables!
            : [];
        const thirdParty = Array.isArray((file as ExecutionFile).thirdPartySeizures)
            ? (file as ExecutionFile).thirdPartySeizures!
            : [];
        const seized = Array.isArray((file as ExecutionFile).seizedAssets)
            ? (file as ExecutionFile).seizedAssets!
            : [];
        const timelineActive = (file.timelineEvents ?? []).filter((e) => !e.trashedAt);
        return JSON.stringify({
            id: file.id,
            creditors: (file.creditors ?? []).map((p) => ({
                id: p.id,
                n: resolvePartyStoredName(p),
            })),
            debtors: (file.debtors ?? []).map((p) => ({
                id: p.id,
                n: resolvePartyStoredName(p),
                e: (p as { isEmployee?: boolean }).isEmployee,
                o: (p as { occupation?: string }).occupation,
            })),
            directorate: file.directorate,
            fileNumber: file.fileNumber,
            fileYear: file.fileYear,
            updatedAt: file.updatedAt,
            timelineEventCount: timelineActive.length,
            timelineEventIds: timelineActive.map((e) => String(e.id || '')).join(','),
            seizedPropertyIds: seizedProps.map((p) => String((p as { id?: string }).id || '')).join(','),
            seizedMovableIds: seizedMov.map((m) => String((m as { id?: string }).id || '')).join(','),
            thirdPartySeizureIds: thirdParty.map((t) => String((t as { id?: string }).id || '')).join(','),
            seizedAssetIds: seized.map((a) => String((a as { id?: string }).id || '')).join(','),
            maritalFurnitureFin: maritalFurnitureFinancialContentSignature(file),
            notesSig: (() => {
                const notes = file.caseNotesLog;
                if (!Array.isArray(notes) || notes.length === 0) return '';
                const last = notes[0];
                return `${notes.length}:${String((last as { id?: string }).id || '')}:${String((last as { savedAt?: string }).savedAt || '')}`;
            })(),
            tasksSig: (() => {
                const tasks = file.caseTasksPending;
                if (!Array.isArray(tasks) || tasks.length === 0) return '';
                return `${tasks.length}:${String((tasks[0] as { id?: string }).id || '')}`;
            })(),
            ledgerSig: (() => {
                const ledger = file.financialLedger;
                if (!Array.isArray(ledger) || ledger.length === 0) return '';
                return `${ledger.length}:${ledger
                    .map((row) => String((row as { id?: string }).id || ''))
                    .join(',')}`;
            })(),
            otherPartyLogSig: (() => {
                const log = (file as ExecutionFile).other_party_actions_log;
                if (!Array.isArray(log) || log.length === 0) return '';
                return log
                    .map(
                        (row) =>
                            `${String(row.id || '')}:${String(row.savedAt || '')}:${String(row.outcome || '')}:${String(row.decisionRowId || '')}`,
                    )
                    .join('|');
            })(),
            personalCoerciveSig: personalCoercivePersistSignature(
                file as unknown as Record<string, unknown>,
            ),
        });
    } catch {
        return String(file.id ?? '');
    }
}

const stableNormalizedCache = new Map<string, ExecutionFile>();

function stableNormalize(file: ExecutionFile | null): ExecutionFile | null {
    if (!file) return null;
    const sig = executionFileContentSignature(file);
    const cacheKey = `${String(file.id ?? '')}:${sig}`;
    const hit = stableNormalizedCache.get(cacheKey);
    if (hit) return hit;
    const normalized = normalizeExecutionFileRecord(file);
    stableNormalizedCache.set(cacheKey, normalized);
    if (stableNormalizedCache.size > 48) {
        const first = stableNormalizedCache.keys().next().value;
        if (first) stableNormalizedCache.delete(first);
    }
    return normalized;
}

/**
 * مصدر القراءة: `file` من الأب أولاً (يتجنب حلقة currentFile ↔ normalize ↔ setCurrentFile).
 * `currentFile` من المتجر يُستخدم فقط عند غياب `file`.
 * دمج المخزن/الإنابة يمر عبر buildExecutionViewData (application layer).
 */
export function useExecutionData(
    currentFile: ExecutionFile | null,
    file: ExecutionFile | null | undefined,
    executionId: string | undefined,
    executionStorageTick: number,
    /** عند عرض إضبارة الإنابة — المتجر هو مصدر الحقيقة وليس prop الأب */
    preferStoreCurrentFile = false,
) {
    const fileSig = executionFileContentSignature(file ?? null);
    const storeSig = executionFileContentSignature(currentFile);
    const storeId = String(currentFile?.id ?? '').trim();
    const inDelegationView = preferStoreCurrentFile || isInabaSubFileId(storeId);

    return useMemo(() => {
        const resolved = buildExecutionViewData({
            currentFile,
            file,
            executionId,
            executionStorageTick,
            preferStoreCurrentFile,
        });
        return stableNormalize(resolved);
    }, [
        fileSig,
        storeSig,
        executionStorageTick,
        executionId,
        inDelegationView,
        currentFile,
        file,
        preferStoreCurrentFile,
    ]);
}

/** للمزامنة مع المتجر دون إعادة normalize كل render */
export function useStableExecutionFileForStore(file: ExecutionFile | null | undefined): ExecutionFile | null {
    const sig = executionFileContentSignature(file ?? null);
    const ref = useRef<{ sig: string; value: ExecutionFile | null }>({ sig: '', value: null });
    return useMemo(() => {
        if (!file) return null;
        if (ref.current.sig === sig && ref.current.value) return ref.current.value;
        const next = stableNormalize(file as ExecutionFile);
        ref.current = { sig, value: next };
        return next;
    }, [sig, file]);
}
