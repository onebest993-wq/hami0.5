import type { ExecutionFile } from '@/app/types/execution';
import { readExecutionDossierByIdFromCache } from '@/app/infrastructure/execution/ExecutionDossierRepository';
import {
    hasAnyMaritalFurnitureDeliveryRecorded,
    readMaritalFurnitureItems,
    resolveMaritalFurnitureFinancialPrincipal,
    sumUndeliveredMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';
import {
    readExecutionDossierBlob,
    readExecutionDossierBlobScanningScopes,
} from '@/app/utils/executionDossierBlobPersistence';

function parseUpdatedAt(file: { updatedAt?: unknown; createdAt?: unknown } | null | undefined): number {
    if (!file) return 0;
    const raw = file.updatedAt ?? file.createdAt;
    const parsed = raw ? Date.parse(String(raw)) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
}

function readDiskExecutionFile(id: string): ExecutionFile | null {
    try {
        const blob =
            readExecutionDossierBlob(id) ?? readExecutionDossierBlobScanningScopes(id);
        if (blob && typeof blob === 'object') return blob as unknown as ExecutionFile;
    } catch {
        /* ignore */
    }
    return null;
}

function pickRicherMaritalFurnitureExecutionFile(
    cached: ExecutionFile | null,
    disk: ExecutionFile | null,
): ExecutionFile | null {
    if (!cached && !disk) return null;
    if (!cached) return disk;
    if (!disk) return cached;

    const cachedPrincipal = resolveMaritalFurnitureFinancialPrincipal(cached);
    const diskPrincipal = resolveMaritalFurnitureFinancialPrincipal(disk);
    if (cachedPrincipal > diskPrincipal) return cached;
    if (diskPrincipal > cachedPrincipal) return disk;

    const cachedLocked = hasAnyMaritalFurnitureDeliveryRecorded(readMaritalFurnitureItems(cached));
    const diskLocked = hasAnyMaritalFurnitureDeliveryRecorded(readMaritalFurnitureItems(disk));
    if (cachedLocked && !diskLocked) return cached;
    if (diskLocked && !cachedLocked) return disk;

    const cachedTs = parseUpdatedAt(cached);
    const diskTs = parseUpdatedAt(disk);
    return cachedTs >= diskTs ? cached : disk;
}

function readStoredExecutionFile(
    ...candidateIds: Array<string | undefined>
): ExecutionFile | null {
    const seen = new Set<string>();
    let best: ExecutionFile | null = null;
    for (const rawId of candidateIds) {
        const id = String(rawId ?? '').trim();
        if (!id || id === 'undefined' || id === 'default' || seen.has(id)) continue;
        seen.add(id);
        const cached = readExecutionDossierByIdFromCache(id);
        const disk = readDiskExecutionFile(id);
        const candidate = pickRicherMaritalFurnitureExecutionFile(cached, disk);
        if (!candidate) continue;
        if (!best) {
            best = candidate;
            continue;
        }
        best = pickRicherMaritalFurnitureExecutionFile(best, candidate) ?? best;
    }
    return best;
}

function mergeMaritalFurnitureFields(
    view: ExecutionFile,
    stored: ExecutionFile,
): ExecutionFile {
    return {
        ...view,
        maritalFurnitureItems: stored.maritalFurnitureItems ?? view.maritalFurnitureItems,
        debtAmount: stored.debtAmount ?? view.debtAmount,
        totalAmount: stored.totalAmount ?? view.totalAmount,
        maritalFurnitureDeliveryRecordedAt:
            (stored as { maritalFurnitureDeliveryRecordedAt?: string }).maritalFurnitureDeliveryRecordedAt ??
            (view as { maritalFurnitureDeliveryRecordedAt?: string }).maritalFurnitureDeliveryRecordedAt,
    } as ExecutionFile;
}

function shouldPreferStoredMaritalFurniture(
    view: ExecutionFile | Record<string, unknown>,
    stored: ExecutionFile,
): boolean {
    const viewItems = readMaritalFurnitureItems(view);
    const storedItems = readMaritalFurnitureItems(stored);
    const viewPrincipal = resolveMaritalFurnitureFinancialPrincipal(view);
    const storedPrincipal = resolveMaritalFurnitureFinancialPrincipal(stored);
    if (storedPrincipal > viewPrincipal) return true;

    const viewLocked = hasAnyMaritalFurnitureDeliveryRecorded(viewItems);
    const storedLocked = hasAnyMaritalFurnitureDeliveryRecorded(storedItems);
    if (storedLocked && !viewLocked) return true;

    return (
        storedLocked &&
        sumUndeliveredMaritalFurnitureTotal(storedItems) >
            sumUndeliveredMaritalFurnitureTotal(viewItems)
    );
}

/** دمج أغنى نسخة لأثاث زوجية من التخزين عندما يتأخر file prop عن الحفظ */
export function resolveMaritalFurnitureClaimExecutionData(
    viewExecutionData: ExecutionFile | Record<string, unknown> | null | undefined,
    executionId: string | undefined,
    decisionsStorageExecutionId?: string,
): ExecutionFile | Record<string, unknown> | null | undefined {
    if (!viewExecutionData) return viewExecutionData;

    const view = viewExecutionData as ExecutionFile;
    const stored = readStoredExecutionFile(
        executionId,
        view.id,
        decisionsStorageExecutionId,
    );
    if (!stored) return viewExecutionData;

    if (!shouldPreferStoredMaritalFurniture(view, stored)) return viewExecutionData;
    return mergeMaritalFurnitureFields(view, stored);
}

/** المبلغ الفعلي للمركز المالي — يتجاوز scope متأخر أو principalDebtAmount=0 */
export function resolveExecutionFinancialHubPrincipalAmount(input: {
    principalDebtAmount: number;
    executionData: ExecutionFile | Record<string, unknown> | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId?: string;
    claimType?: string;
}): number {
    const fromProp = Math.max(0, Math.round(Number(input.principalDebtAmount) || 0));
    if (fromProp > 0) return fromProp;

    const merged = resolveMaritalFurnitureClaimExecutionData(
        input.executionData as ExecutionFile,
        input.executionId,
        input.decisionsStorageExecutionId,
    );

    const fromItems = resolveMaritalFurnitureFinancialPrincipal(merged);
    if (fromItems > 0) return fromItems;

    const mergedFile = merged as ExecutionFile | null | undefined;
    const items = readMaritalFurnitureItems(mergedFile);
    if (hasAnyMaritalFurnitureDeliveryRecorded(items)) {
        const undelivered = sumUndeliveredMaritalFurnitureTotal(items);
        if (undelivered > 0) return undelivered;
    }

    return Math.max(
        0,
        Math.round(Number(mergedFile?.debtAmount) || 0),
        Math.round(Number(mergedFile?.totalAmount) || 0),
    );
}
