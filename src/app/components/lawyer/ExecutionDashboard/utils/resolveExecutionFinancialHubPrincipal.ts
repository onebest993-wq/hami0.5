import type { ExecutionFile } from '@/app/types/execution';
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

function readStoredExecutionFile(
    ...candidateIds: Array<string | undefined>
): ExecutionFile | null {
    const seen = new Set<string>();
    for (const rawId of candidateIds) {
        const id = String(rawId ?? '').trim();
        if (!id || id === 'undefined' || id === 'default' || seen.has(id)) continue;
        seen.add(id);
        try {
            const blob =
                readExecutionDossierBlob(id) ?? readExecutionDossierBlobScanningScopes(id);
            if (blob && typeof blob === 'object') return blob as unknown as ExecutionFile;
        } catch {
            /* ignore */
        }
    }
    return null;
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
