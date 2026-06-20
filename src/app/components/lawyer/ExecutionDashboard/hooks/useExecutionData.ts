// @ts-nocheck
import { useMemo, useRef } from 'react';
import { normalizeExecutionFileRecord } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { resolvePartyStoredName } from '@/app/utils/executionPartyNormalize';
import { storageCache } from '@/app/utils/storageCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import {
    isInabaSubFileId,
    inabaSubMetaStorageKey,
    filterTimelineEventsForInabaDossier,
} from '@/app/stores/executionDashboardStore';
import type { ExecutionFile } from '@/app/types/execution';

function parseUpdatedAt(file: { updatedAt?: unknown; createdAt?: unknown } | null): number {
    if (!file) return 0;
    const raw = file.updatedAt ?? file.createdAt;
    const n = raw ? Date.parse(String(raw)) : 0;
    return Number.isFinite(n) ? n : 0;
}

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
            seizedPropertyIds: seizedProps.map((p) => String((p as { id?: string }).id || '')).join(','),
            seizedMovableIds: seizedMov.map((m) => String((m as { id?: string }).id || '')).join(','),
            thirdPartySeizureIds: thirdParty.map((t) => String((t as { id?: string }).id || '')).join(','),
            seizedAssetIds: seized.map((a) => String((a as { id?: string }).id || '')).join(','),
        });
    } catch {
        return String(file.id ?? '');
    }
}

function executionStoredBlobMatchesFileId(
    stored: ExecutionFile | null | undefined,
    fileId: string,
): boolean {
    if (!stored || !fileId) return false;
    const sid = String(stored.id ?? '').trim();
    const fid = String(fileId).trim();
    if (!sid || !fid) return false;
    return sid === fid;
}

function pickRicherExecutionFile(a: ExecutionFile, b: ExecutionFile): ExecutionFile {
    const aNames =
        (a.creditors ?? []).filter((p) => resolvePartyStoredName(p)).length +
        (a.debtors ?? []).filter((p) => resolvePartyStoredName(p)).length;
    const bNames =
        (b.creditors ?? []).filter((p) => resolvePartyStoredName(p)).length +
        (b.debtors ?? []).filter((p) => resolvePartyStoredName(p)).length;
    if (aNames !== bNames) return aNames > bNames ? a : b;
    const aTs = parseUpdatedAt(a);
    const bTs = parseUpdatedAt(b);
    if (aTs !== bTs) return aTs >= bTs ? a : b;
    return a;
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
    const propId = String(file?.id ?? executionId ?? '').trim();
    const inDelegationView = preferStoreCurrentFile || isInabaSubFileId(storeId);
    const fileId = inDelegationView && storeId ? storeId : propId;

    return useMemo(() => {
        let resolved: ExecutionFile | null = null;

        if (inDelegationView && currentFile) {
            resolved = currentFile;
        } else if (file) {
            resolved = file as ExecutionFile;
        } else if (currentFile) {
            resolved = currentFile;
        }

        const parentFromInabaId =
            isInabaSubFileId(storeId) && storeId.includes(':')
                ? storeId.slice(storeId.indexOf(':') + 1).trim()
                : '';
        const parentLink = String(
            (resolved as ExecutionFile | null)?.parentId ||
                (resolved as { parentFileId?: string } | null)?.parentFileId ||
                parentFromInabaId ||
                ''
        ).trim();
        const inabaMetaKey =
            inDelegationView && isInabaSubFileId(storeId) && parentLink
                ? executionStorageKey(inabaSubMetaStorageKey(parentLink, storeId))
                : '';
        const persistKey = inabaMetaKey ? '' : fileId || '';
        const storageKey = inabaMetaKey || (persistKey ? executionStorageKey(persistKey) : '');
        let stored = storageKey ? (storageCache.get(storageKey) as ExecutionFile | null) : null;
        if (stored && persistKey && !executionStoredBlobMatchesFileId(stored, persistKey)) {
            stored = null;
        }

        if (inDelegationView && isInabaSubFileId(storeId) && resolved) {
            const rawTimeline = Array.isArray(stored?.timelineEvents)
                ? stored!.timelineEvents
                : Array.isArray(resolved.timelineEvents)
                  ? resolved.timelineEvents
                  : [];
            const inabaTimeline = filterTimelineEventsForInabaDossier(rawTimeline, storeId);
            resolved = {
                ...resolved,
                fileNumber: String(stored?.fileNumber ?? resolved.fileNumber ?? '').trim(),
                fileYear: String(stored?.fileYear ?? resolved.fileYear ?? '').trim(),
                timelineEvents: inabaTimeline,
                creditors: resolved.creditors?.length
                    ? resolved.creditors
                    : stored?.creditors?.length
                      ? stored.creditors
                      : resolved.creditors,
                debtors: resolved.debtors?.length
                    ? resolved.debtors
                    : stored?.debtors?.length
                      ? stored.debtors
                      : resolved.debtors,
                parties: resolved.parties?.length
                    ? resolved.parties
                    : stored?.parties?.length
                      ? stored.parties
                      : resolved.parties,
                party_multiplicity: resolved.party_multiplicity ?? stored?.party_multiplicity,
                creditor_party_death_case:
                    resolved.creditor_party_death_case ?? stored?.creditor_party_death_case,
                debtor_party_death_case: resolved.debtor_party_death_case ?? stored?.debtor_party_death_case,
                party_death_case: resolved.party_death_case ?? stored?.party_death_case,
                guarantor_followup: stored?.guarantor_followup ?? resolved.guarantor_followup,
                procedural_guarantee: stored?.procedural_guarantee ?? resolved.procedural_guarantee,
                hasGuarantor: stored?.hasGuarantor ?? resolved.hasGuarantor,
            } as ExecutionFile;
        } else if (resolved && stored) {
            const fu = parseUpdatedAt(resolved);
            const su = parseUpdatedAt(stored);
            if (Number.isFinite(su) && su > fu) {
                resolved = pickRicherExecutionFile(stored, resolved);
            } else if (executionStorageTick > 0) {
                try {
                    const pairs: [unknown, unknown][] = [
                        [resolved.creditor_party_death_case ?? null, stored.creditor_party_death_case ?? null],
                        [resolved.debtor_party_death_case ?? null, stored.debtor_party_death_case ?? null],
                        [resolved.party_death_case ?? null, stored.party_death_case ?? null],
                        [resolved.party_multiplicity ?? null, stored.party_multiplicity ?? null],
                        [resolved.debtors ?? null, stored.debtors ?? null],
                        [resolved.guarantor_followup ?? null, stored.guarantor_followup ?? null],
                        [resolved.procedural_guarantee ?? null, stored.procedural_guarantee ?? null],
                        [resolved.hasGuarantor ?? null, stored.hasGuarantor ?? null],
                        [resolved.creditors ?? null, stored.creditors ?? null],
                        [resolved.seizedProperties ?? null, stored.seizedProperties ?? null],
                        [resolved.seizedMovables ?? null, stored.seizedMovables ?? null],
                        [resolved.thirdPartySeizures ?? null, stored.thirdPartySeizures ?? null],
                        [resolved.seizedAssets ?? null, stored.seizedAssets ?? null],
                        [resolved.realEstateSeizureAssets ?? null, stored.realEstateSeizureAssets ?? null],
                        [resolved.other_party_request_tracks ?? null, stored.other_party_request_tracks ?? null],
                        [resolved.other_party_actions_log ?? null, stored.other_party_actions_log ?? null],
                    ];
                    for (const [fp, sp] of pairs) {
                        if (JSON.stringify(fp) !== JSON.stringify(sp)) {
                            resolved = pickRicherExecutionFile(stored, resolved);
                            break;
                        }
                    }
                } catch {
                    /* ignore */
                }
            }
        } else if (!resolved && stored) {
            resolved = stored;
        }

        if (!resolved && executionId && !inDelegationView) {
            const s = storageCache.get(executionStorageKey(executionId)) as ExecutionFile | null;
            if (s && executionStoredBlobMatchesFileId(s, executionId)) resolved = s;
        }

        return stableNormalize(resolved);
    }, [fileId, fileSig, storeSig, executionStorageTick, executionId, inDelegationView, currentFile, file]);
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
