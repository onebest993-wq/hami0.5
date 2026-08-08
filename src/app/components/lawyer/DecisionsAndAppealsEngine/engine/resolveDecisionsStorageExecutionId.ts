import SecureStoreService from '@/app/services/SecureStoreService';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';

function pushCandidate(out: Set<string>, raw: unknown): void {
    const s = String(raw ?? '').trim();
    if (s && s !== 'default' && s !== 'undefined' && s !== 'null') {
        out.add(s);
    }
}

/** يُصفّر معرّفات وهمية مثل default قبل الحل أو الحفظ */
export function normalizeDecisionsExecutionIdProp(
    executionId: string | undefined
): string | undefined {
    const s = String(executionId ?? '').trim();
    if (!s || s === 'default' || s === 'undefined' || s === 'null') return undefined;
    return s;
}

function extractDossierIdFromDecisionsStorageKey(key: string): string | null {
    const k = String(key || '').trim();
    if (!k.startsWith('execution_') || !k.includes('_decisions')) return null;
    const rest = k.slice('execution_'.length);
    const idx = rest.indexOf('_decisions');
    if (idx <= 0) return null;
    const id = rest.slice(0, idx).trim();
    if (!id || id === 'default' || id === 'undefined') return null;
    return id;
}

const discoverCache = new Map<string, string[]>();

function discoverRelatedDossierIdsFromStore(seedIds: string[]): string[] {
    const seeds = new Set(seedIds.filter(Boolean));
    if (seeds.size === 0) return [];

    const cacheKey = [...seeds].sort().join('|');
    const cached = discoverCache.get(cacheKey);
    if (cached) return cached;

    const discovered = new Set<string>();
    try {
        const keys = SecureStoreService.listKeysSync();
        const dossierIds = new Set<string>();
        for (const key of keys) {
            const id = extractDossierIdFromDecisionsStorageKey(String(key));
            if (id) dossierIds.add(id);
        }

        for (const dossierId of dossierIds) {
            if (seeds.has(dossierId)) {
                discovered.add(dossierId);
                continue;
            }
            const data = readExecutionDataForDomainGate(dossierId);
            const parent = String(data?.parentDossierId ?? data?.parentFileId ?? '').trim();
            const selfId = String(data?.id ?? '').trim();
            for (const seed of seeds) {
                if (seed === dossierId || seed === parent || seed === selfId) {
                    discovered.add(dossierId);
                    break;
                }
            }
        }
    } catch {
        /* ignore */
    }
    const result = [...discovered];
    discoverCache.set(cacheKey, result);
    return result;
}

export function clearDecisionsDiscoverCacheForTests(): void {
    discoverCache.clear();
}

/** معرّف تخزين القرارات — يُفضَّل الأب ثم سياق الإضبارة */
export function resolveDecisionsStorageExecutionId(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null
): string {
    const candidates = [
        executionData?.parentDossierId,
        executionData?.parentFileId,
        executionId,
        executionData?.id,
    ];
    for (const raw of candidates) {
        const s = String(raw ?? '').trim();
        if (s && s !== 'default' && s !== 'undefined' && s !== 'null') {
            return s;
        }
    }
    return 'default';
}

/** كل المفاتيح المحتملة لنفس الإضبارة — لقراءة/دمج دون فقدان عند اختلاف المعرّف */
export function collectDecisionsStorageCandidateIds(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
    extraIds?: string[]
): string[] {
    const out = new Set<string>();
    pushCandidate(out, executionId);
    if (executionData) {
        pushCandidate(out, executionData.parentDossierId);
        pushCandidate(out, executionData.parentFileId);
        pushCandidate(out, executionData.id);
    }
    for (const raw of extraIds ?? []) {
        pushCandidate(out, raw);
    }
    const canonical = resolveDecisionsStorageExecutionId(executionId, executionData);
    if (canonical !== 'default') {
        out.add(canonical);
    }

    for (const related of discoverRelatedDossierIdsFromStore([...out])) {
        out.add(related);
    }

    return [...out];
}

export type DecisionsModalOpenMatchContext = {
    executionDataId?: string | null;
    executionId?: string | null;
    decisionsStorageExecutionId?: string | null;
    executionData?: Record<string, unknown> | null;
};

/** هل حدث فتح مركز القرارات يخص هذه الإضبارة (أب/فرع/تخزين موحّد)؟ */
export function matchesDecisionsModalOpenTarget(
    eventExecutionId: string | undefined,
    ctx: DecisionsModalOpenMatchContext
): boolean {
    const target = String(eventExecutionId ?? '').trim();
    if (!target) return false;
    const seed =
        String(ctx.decisionsStorageExecutionId ?? '').trim() ||
        String(ctx.executionDataId ?? '').trim() ||
        String(ctx.executionId ?? '').trim();
    if (!seed) return false;
    const candidates = collectDecisionsStorageCandidateIds(seed, ctx.executionData ?? undefined);
    return candidates.includes(target);
}
