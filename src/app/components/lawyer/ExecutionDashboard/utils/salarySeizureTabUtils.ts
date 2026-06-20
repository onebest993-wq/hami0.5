// @ts-nocheck
import type { ExecutionFile, SeizedAsset } from '@/app/types/execution';
import { isSalarySeizureAsset } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRegistryAssets';
import { resolveSalarySeizureSubject } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureDisplayUtils';

function readDecisionRowId(asset: SeizedAsset): string {
    const det =
        typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
            ? (asset.details as Record<string, unknown>)
            : null;
    return String(det?.decisionRowId || '').trim();
}

function subjectKey(
    asset: SeizedAsset,
    executionData: ExecutionFile | null | undefined,
    executionId: string
): string {
    return resolveSalarySeizureSubject(
        asset as Record<string, unknown>,
        executionData,
        executionId
    ).roleLabel;
}

function statusRank(status: string): number {
    if (status === 'seized') return 3;
    if (status === 'pending') return 2;
    if (status === 'released') return 1;
    return 0;
}

function pickPreferredAsset(a: SeizedAsset, b: SeizedAsset): SeizedAsset {
    const ra = statusRank(String(a.status || ''));
    const rb = statusRank(String(b.status || ''));
    if (ra !== rb) return ra > rb ? a : b;
    const da = String(a.seizureDate || '');
    const db = String(b.seizureDate || '');
    return db.localeCompare(da, undefined, { numeric: true }) > 0 ? b : a;
}

/** صف واحد لكل محل حجز (مدين / كفيل) — بدون تكرار مسودة + سجل */
export function buildSalarySeizureTabRows(input: {
    registryAssets: SeizedAsset[];
    seizureDraftsByDecisionId?: Record<string, SeizedAsset>;
    executionData: ExecutionFile | null | undefined;
    executionId: string;
}): SeizedAsset[] {
    const exId = String(input.executionId || '').trim();
    const registeredDecisionIds = new Set<string>();
    for (const a of input.registryAssets) {
        const did = readDecisionRowId(a);
        if (did) registeredDecisionIds.add(did);
    }

    const merged: SeizedAsset[] = [...input.registryAssets];
    const seenIds = new Set(merged.map((a) => String(a.id)));

    for (const draft of Object.values(input.seizureDraftsByDecisionId || {})) {
        if (!isSalarySeizureAsset(draft)) continue;
        const did = readDecisionRowId(draft as SeizedAsset);
        if (did && registeredDecisionIds.has(did)) continue;
        const id = String((draft as SeizedAsset).id || '');
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        merged.push(draft as SeizedAsset);
    }

    const bySubject = new Map<string, SeizedAsset>();
    for (const asset of merged) {
        const key = subjectKey(asset, input.executionData, exId);
        const prev = bySubject.get(key);
        bySubject.set(key, prev ? pickPreferredAsset(prev, asset) : asset);
    }

    return Array.from(bySubject.values()).sort((a, b) => {
        const sa = statusRank(String(a.status || ''));
        const sb = statusRank(String(b.status || ''));
        if (sa !== sb) return sb - sa;
        return String(b.seizureDate || '').localeCompare(String(a.seizureDate || ''), undefined, {
            numeric: true,
        });
    });
}

/** مسار حجز الراتب مشغول — لا يُعرض طلب جديد حتى فك الحجز */
export function isSalarySeizureLaneOccupied(input: {
    seizedAssets: SeizedAsset[] | undefined | null;
    seizureDraftsByDecisionId?: Record<string, SeizedAsset>;
}): boolean {
    const openInAssets = (input.seizedAssets || []).some(
        (a) => isSalarySeizureAsset(a) && String(a.status || '') !== 'released'
    );
    if (openInAssets) return true;
    return Object.values(input.seizureDraftsByDecisionId || {}).some(
        (d) => isSalarySeizureAsset(d) && String((d as SeizedAsset).status || '') !== 'released'
    );
}
