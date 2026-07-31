import type { ExecutionFile } from '@/app/types/execution';
import {
    filterTimelineEventsForInabaDossier,
    isInabaSubFileId,
} from '@/app/domain/execution/dossier/ExecutionDossierScope';
import {
    readExecutionDossierByIdFromCache,
    readScopedExecutionDossierFromCache,
} from '@/app/infrastructure/execution/ExecutionDossierRepository';
import { normalizeExecutionFileArrays } from './normalizeExecutionFileArrays';
import { recordHasPartyDeathMarkers } from '@/app/utils/partyDeathPersistGuards';

type ExecutionFileLegacyShape = ExecutionFile & {
    parentId?: string;
    parentFileId?: string;
    parties?: unknown[];
    creditor_party_death_case?: unknown;
    debtor_party_death_case?: unknown;
    party_death_case?: unknown;
    is_creditor_deceased?: boolean;
    is_debtor_deceased?: boolean;
    guarantor_followup?: unknown;
    procedural_guarantee?: unknown;
    hasGuarantor?: boolean;
    seizedProperties?: unknown;
    seizedMovables?: unknown;
    thirdPartySeizures?: unknown;
    realEstateSeizureAssets?: unknown;
    other_party_request_tracks?: unknown;
    other_party_actions_log?: unknown;
};

function parseUpdatedAt(file: { updatedAt?: unknown; createdAt?: unknown } | null): number {
    if (!file) return 0;
    const raw = file.updatedAt ?? file.createdAt;
    const parsed = raw ? Date.parse(String(raw)) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
}

/** عند فوز فهرس القائمة على blob، لا تُفقد حقول السند/الحكم المحفوظة في المخزن */
function fillMissingInstrumentFields(
    target: ExecutionFileLegacyShape,
    source: ExecutionFileLegacyShape | null | undefined,
): ExecutionFileLegacyShape {
    if (!source) return target;
    const keys = [
        'docType',
        'docNumber',
        'judgmentDate',
        'claimType',
        'classification',
        'executionType',
        'chequeNumber',
        'chequeIssueDate',
        'shariaDeedNumber',
        'shariaIssueDate',
        'shariaRegisterNumber',
        'shariaIssuingCourt',
    ] as const;
    let next: ExecutionFileLegacyShape | null = null;
    for (const key of keys) {
        const fromTarget = String((target as Record<string, unknown>)[key] ?? '').trim();
        const fromSource = String((source as Record<string, unknown>)[key] ?? '').trim();
        if (!fromTarget && fromSource) {
            if (!next) next = { ...target };
            (next as Record<string, unknown>)[key] = (source as Record<string, unknown>)[key];
        }
    }
    return next ?? target;
}

export type BuildExecutionViewDataInput = {
    currentFile: ExecutionFile | null;
    file: ExecutionFile | null | undefined;
    executionId: string | undefined;
    executionStorageTick: number;
    preferStoreCurrentFile?: boolean;
};

export function buildExecutionViewData({
    currentFile,
    file,
    executionId,
    executionStorageTick,
    preferStoreCurrentFile = false,
}: BuildExecutionViewDataInput): ExecutionFile | null {
    const storeId = String(currentFile?.id ?? '').trim();
    const propId = String(file?.id ?? executionId ?? '').trim();
    const inDelegationView = preferStoreCurrentFile || isInabaSubFileId(storeId);
    const fileId = inDelegationView && storeId ? storeId : propId;

    let resolved: ExecutionFileLegacyShape | null = null;

    if (inDelegationView && currentFile) {
        resolved = currentFile as ExecutionFileLegacyShape;
    } else if (file && currentFile && String(currentFile.id ?? '').trim() === String(file.id ?? '').trim()) {
        // بعد persist المحلي يكون currentFile أحدث من prop الأب حتى يصل onUpdate.
        const storeTs = parseUpdatedAt(currentFile);
        const fileTs = parseUpdatedAt(file);
        resolved = (
            Number.isFinite(storeTs) && storeTs > fileTs ? currentFile : file
        ) as ExecutionFileLegacyShape;
    } else if (file) {
        resolved = file as ExecutionFileLegacyShape;
    } else if (currentFile) {
        resolved = currentFile as ExecutionFileLegacyShape;
    }

    const parentFromInabaId =
        isInabaSubFileId(storeId) && storeId.includes(':') ? storeId.slice(storeId.indexOf(':') + 1).trim() : '';
    const parentLink = String(
        resolved?.parentId ||
            resolved?.parentFileId ||
            parentFromInabaId ||
            '',
    ).trim();

    const stored = readScopedExecutionDossierFromCache({
        fileId,
        storeId,
        parentLink,
        inDelegationView,
    }) as ExecutionFileLegacyShape | null;

    if (inDelegationView && isInabaSubFileId(storeId) && resolved) {
        const rawTimeline = Array.isArray(stored?.timelineEvents)
            ? stored.timelineEvents
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
            creditor_party_death_case: resolved.creditor_party_death_case ?? stored?.creditor_party_death_case,
            debtor_party_death_case: resolved.debtor_party_death_case ?? stored?.debtor_party_death_case,
            party_death_case: resolved.party_death_case ?? stored?.party_death_case,
            guarantor_followup: stored?.guarantor_followup ?? resolved.guarantor_followup,
            procedural_guarantee: stored?.procedural_guarantee ?? resolved.procedural_guarantee,
            hasGuarantor: stored?.hasGuarantor ?? resolved.hasGuarantor,
        } as ExecutionFileLegacyShape;
    } else if (resolved && stored) {
        const fileUpdatedAt = parseUpdatedAt(resolved);
        const storedUpdatedAt = parseUpdatedAt(stored);
        const resolvedDeath = recordHasPartyDeathMarkers(
            resolved as unknown as Record<string, unknown>,
        );
        const storedDeath = recordHasPartyDeathMarkers(
            stored as unknown as Record<string, unknown>,
        );
        if (Number.isFinite(storedUpdatedAt) && storedUpdatedAt > fileUpdatedAt) {
            resolved = stored;
        } else if (
            storedDeath &&
            !resolvedDeath &&
            Number.isFinite(storedUpdatedAt) &&
            storedUpdatedAt >= fileUpdatedAt
        ) {
            // حتى عند tick=0: لا تتجاهل وفاة في الـ blob لصالح فهرس/prop بلا وفاة.
            resolved = stored;
        } else if (
            // لا تستبدل تعديلاً أحدث في المتجر/الواجهة بنسخة كاش أقدم بعد persist محلي.
            executionStorageTick > 0 &&
            Number.isFinite(storedUpdatedAt) &&
            storedUpdatedAt >= fileUpdatedAt
        ) {
            try {
                const pairs: [unknown, unknown][] = [
                    [resolved.is_creditor_deceased ?? null, stored.is_creditor_deceased ?? null],
                    [resolved.is_debtor_deceased ?? null, stored.is_debtor_deceased ?? null],
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
                for (const [fromFile, fromStore] of pairs) {
                    if (JSON.stringify(fromFile) !== JSON.stringify(fromStore)) {
                        resolved = stored;
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
        resolved = readExecutionDossierByIdFromCache(executionId);
    }

    if (resolved && stored) {
        resolved = fillMissingInstrumentFields(resolved, stored);
    }

    if (!resolved) return null;
    return normalizeExecutionFileArrays(resolved as ExecutionFile);
}
