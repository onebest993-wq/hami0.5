import type { ExecutorRequestLifecycleSummary } from '@/app/utils/executorRequestLifecycle';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { inferExecutorApprovalDecisionType } from '@/app/utils/executorApprovalWorkflow';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import { readExecutorDecisionsUnionAcrossCandidateIds } from '@/app/utils/executionDecisionsNamespace';
import { resolveExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';
import {
    getGoverningEvictionProcedureRowForBranch,
    getGoverningEvictionProcedureRowForMatch,
    isEvictionProcedureHubRow,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueue';

export const MARITAL_FURNITURE_DELIVERY_BRANCH = 'Marital Furniture Delivery' as const;
export const MARITAL_FURNITURE_DELIVERY_WORKFLOW_KEY = 'marital_furniture_delivery' as const;

export type MaritalFurnitureDeliveryMode = 'none' | 'unified' | 'legacy';

function maritalFurnitureDeliveryRowSortKey(row: Record<string, unknown>): string {
    return String(row.resolvedAt ?? row.date ?? '');
}

function isMaritalFurnitureDeliveryHubRow(row: Record<string, unknown>): boolean {
    if (String((row as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') {
        return false;
    }
    if (!isEvictionProcedureHubRow(row)) return false;
    const wf = String((row as { evictionWorkflowKey?: string }).evictionWorkflowKey || '').trim();
    if (wf === MARITAL_FURNITURE_DELIVERY_WORKFLOW_KEY) return true;
    const branch = inferExecutorApprovalDecisionType({
        title: String((row as { title?: string }).title || ''),
        requestKind: 'eviction_procedure',
        evictionWorkflowKey: (row as { evictionWorkflowKey?: string }).evictionWorkflowKey,
    });
    if (branch === MARITAL_FURNITURE_DELIVERY_BRANCH) return true;
    return /╪ز╪│┘┘è┘à ╪ث╪س╪د╪س|╪ث╪س╪د╪س ╪▓┘ê╪ش┘è╪ر|╪ش╪▒╪» ┘ê╪ز╪│┘┘è┘à ┘é╪╖╪╣/i.test(
        String((row as { title?: string }).title || '')
    );
}

/** ┘è╪╣╪س╪▒ ╪╣┘┘ë ╪╡┘ ╪ز╪│┘┘è┘à ╪د┘╪ث╪س╪د╪س ╪ص╪ز┘ë ┘┘ê ┘╪┤┘╪ز ┘┘╪د╪ز╪▒ ┬س╪د┘╪ص╪د┘â┘à┬╗ ظ¤ ┘┘╪╣╪▒╪╢ ┘┘è ┘à╪ص╪╢╪▒ ╪د┘┘à╪ز╪د╪ذ╪╣╪ر */
export function findMaritalFurnitureDeliveryRowLoose(
    all: Record<string, unknown>[]
): Record<string, unknown> | null {
    const hits = all.filter(isMaritalFurnitureDeliveryHubRow);
    if (hits.length === 0) return null;
    return [...hits].sort((a, b) =>
        maritalFurnitureDeliveryRowSortKey(b).localeCompare(
            maritalFurnitureDeliveryRowSortKey(a),
            undefined,
            { numeric: true }
        )
    )[0];
}

export function mergeFollowupDecisionRows(
    fromProp: Record<string, unknown>[] | undefined,
    fromStorage: Record<string, unknown>[]
): Record<string, unknown>[] {
    const byId = new Map<string, Record<string, unknown>>();
    for (const row of fromStorage) {
        const id = String(row.id ?? '').trim();
        if (id) byId.set(id, row);
    }
    for (const row of fromProp ?? []) {
        const id = String(row.id ?? '').trim();
        if (!id) continue;
        const prev = byId.get(id);
        byId.set(id, prev ? { ...prev, ...row } : row);
    }
    return Array.from(byId.values());
}

/** ┘é╪▒╪د╪ة╪ر ┘à┘ê╪ص┘ّ╪»╪ر ┘┘é╪▒╪د╪▒╪د╪ز ┘à╪ص╪╢╪▒ ╪د┘┘à╪ز╪د╪ذ╪╣╪ر ظ¤ ┘┘╪│ ┘à┘╪╖┘é useExecutorDecisions */
export function readFollowupMergedExecutorDecisions(
    decisionsStorageExecutionId: string | undefined,
    executionData?: Record<string, unknown> | null,
    fromProp?: Record<string, unknown>[]
): Record<string, unknown>[] {
    const exId = String(
        decisionsStorageExecutionId ||
            (executionData as { id?: string } | null)?.id ||
            ''
    ).trim();
    if (!exId || exId === 'default') {
        return Array.isArray(fromProp) ? fromProp : [];
    }
    const data = resolveExecutionDataForDomainGate(exId, executionData);
    const canonical = resolveDecisionsStorageExecutionId(exId, data);
    const fromStorage = readExecutorDecisionsUnionAcrossCandidateIds(
        canonical !== 'default' ? canonical : exId,
        data
    );
    return mergeFollowupDecisionRows(fromProp, fromStorage);
}

export function resolveMaritalFurnitureDeliveryState(all: Record<string, unknown>[]): {
    mode: MaritalFurnitureDeliveryMode;
    unifiedRow: Record<string, unknown> | null;
    fieldVisitRow: Record<string, unknown> | null;
    breakInventoryRow: Record<string, unknown> | null;
} {
    const unifiedRow =
        getGoverningEvictionProcedureRowForBranch(all, MARITAL_FURNITURE_DELIVERY_BRANCH) ??
        getGoverningEvictionProcedureRowForMatch(all, {
            evictionWorkflowKey: MARITAL_FURNITURE_DELIVERY_WORKFLOW_KEY,
        }) ??
        getGoverningEvictionProcedureRowForMatch(all, {
            title: '≡اؤïي╕ ╪╖┘╪ذ ╪ز╪│┘┘è┘à ╪ث╪س╪د╪س',
        }) ??
        getGoverningEvictionProcedureRowForMatch(all, {
            title: '╪╖┘╪ذ ╪ز╪│┘┘è┘à ╪ث╪س╪د╪س',
        }) ??
        findMaritalFurnitureDeliveryRowLoose(all);
    if (unifiedRow?.id) {
        return { mode: 'unified', unifiedRow, fieldVisitRow: null, breakInventoryRow: null };
    }
    const fieldVisitRow = getGoverningEvictionProcedureRowForBranch(all, 'Field Visit Date');
    const breakInventoryRow = getGoverningEvictionProcedureRowForBranch(
        all,
        'Lock Breaking & Inventory'
    );
    if (fieldVisitRow?.id || breakInventoryRow?.id) {
        return { mode: 'legacy', unifiedRow: null, fieldVisitRow, breakInventoryRow };
    }
    return { mode: 'none', unifiedRow: null, fieldVisitRow: null, breakInventoryRow: null };
}

/** ╪د┘â╪ز┘à╪د┘ ╪«╪╖┘ê╪ر ╪د┘┘à┘ê╪╣╪» (┘à┘┘╪╡┘╪ر ╪╣┘ ╪د┘â╪ز┘à╪د┘ ╪د┘┘à╪│╪د╪▒ ╪د┘┘â╪د┘à┘ ┘┘╪╡┘ ╪د┘┘à┘ê╪ص┘ّ╪») */
export function isMaritalDeliveryScheduleStepComplete(
    row: Record<string, unknown> | null | undefined
): boolean {
    return Boolean(
        String((row as { executorScheduleLabel?: string } | null)?.executorScheduleLabel || '').trim()
    );
}

export function isMaritalDeliveryInventoryStepComplete(
    row: Record<string, unknown> | null | undefined
): boolean {
    return Boolean(
        String(
            (row as { breakInventoryFurnitureFinalizedAt?: string } | null)
                ?.breakInventoryFurnitureFinalizedAt || ''
        ).trim()
    );
}

export function isMaritalFurnitureDeliveryWorkflowComplete(
    mode: MaritalFurnitureDeliveryMode,
    unifiedRow: Record<string, unknown> | null,
    fieldVisitRow: Record<string, unknown> | null,
    breakInventoryRow: Record<string, unknown> | null
): boolean {
    if (mode === 'unified' && unifiedRow?.id) {
        return isEvictionProcedureRowWorkflowComplete(unifiedRow);
    }
    if (mode === 'legacy') {
        const fvDone =
            !fieldVisitRow?.id ||
            isEvictionProcedureRowWorkflowComplete(fieldVisitRow);
        const biDone =
            !breakInventoryRow?.id ||
            isEvictionProcedureRowWorkflowComplete(breakInventoryRow);
        return fvDone && biDone && Boolean(fieldVisitRow?.id || breakInventoryRow?.id);
    }
    return false;
}

/** ╪د╪│╪ز╪«╪▒╪د╪ش YMD ┘à┘ ╪╡┘ ┘à┘ê╪╣╪» ╪د┘╪«╪▒┘ê╪ش ╪د┘┘à┘è╪»╪د┘┘è */
export function readFieldVisitScheduleYmd(row: Record<string, unknown> | null | undefined): string {
    if (!row) return '';
    const explicit = String((row as { executorScheduleYmd?: string }).executorScheduleYmd || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
    const label = String((row as { executorScheduleLabel?: string }).executorScheduleLabel || '');
    const m = label.match(/(\d{4}-\d{2}-\d{2})/);
    if (m?.[1]) return m[1];
    return '';
}

export function isScheduleYmdReached(scheduleYmd: string, todayYmd = getLocalTodayYmd()): boolean {
    const s = String(scheduleYmd || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    return s <= String(todayYmd || '').trim();
}

export function mergeMaritalDeliveryLifecycleSummaries(
    fieldVisit: ExecutorRequestLifecycleSummary | null | undefined,
    breakInventory: ExecutorRequestLifecycleSummary | null | undefined
): ExecutorRequestLifecycleSummary | null {
    if (!fieldVisit && !breakInventory) return null;
    const fvEntries = (fieldVisit?.entries ?? []).map((e) => ({
        ...e,
        outcomeLabel: `┘à┘ê╪╣╪» ╪ز╪│┘┘è┘à ┬╖ ${e.outcomeLabel}`,
    }));
    const biEntries = (breakInventory?.entries ?? []).map((e) => ({
        ...e,
        outcomeLabel: `╪ش╪▒╪» ╪ز╪│┘┘è┘à ┬╖ ${e.outcomeLabel}`,
    }));
    const entries = [...fvEntries, ...biEntries].sort((a, b) =>
        b.submittedAt.localeCompare(a.submittedAt, undefined, { numeric: true })
    );
    entries.forEach((e, i) => {
        e.cycleNumber = i + 1;
    });
    return {
        submissions: (fieldVisit?.submissions ?? 0) + (breakInventory?.submissions ?? 0),
        approvals: (fieldVisit?.approvals ?? 0) + (breakInventory?.approvals ?? 0),
        rejections: (fieldVisit?.rejections ?? 0) + (breakInventory?.rejections ?? 0),
        pending: (fieldVisit?.pending ?? 0) + (breakInventory?.pending ?? 0),
        entries,
    };
}

/** ┘à╪▓╪د┘à┘╪ر ┘à┘ê╪╣╪» ╪د┘╪ز╪│┘┘è┘à ┘à┘ ┘é╪▒╪د╪▒ ╪د┘┘à┘┘╪░ ╪ح┘┘ë blob ╪د┘╪ح╪╢╪ذ╪د╪▒╪ر ╪ح┘ ┘ê┘╪ش╪» ┘┘è ╪د┘┘é╪▒╪د╪▒ ┘┘é╪╖ */
export function buildMaritalFurnitureDeliveryScheduleBackfillPatch(
    executionData: Record<string, unknown> | null | undefined,
    decisions: Record<string, unknown>[],
): Record<string, string> | null {
    const storedYmd = String(
        (executionData as { maritalFurnitureDeliveryScheduleYmd?: string } | null)
            ?.maritalFurnitureDeliveryScheduleYmd || '',
    ).trim();
    const storedLabel = String(
        (executionData as { maritalFurnitureDeliveryScheduleLabel?: string } | null)
            ?.maritalFurnitureDeliveryScheduleLabel || '',
    ).trim();
    if (storedYmd && storedLabel) return null;

    const state = resolveMaritalFurnitureDeliveryState(decisions);
    const row = state.unifiedRow ?? state.fieldVisitRow;
    if (!row) return null;
    const ymd = readFieldVisitScheduleYmd(row);
    const label = String((row as { executorScheduleLabel?: string }).executorScheduleLabel || '').trim();
    if (!ymd && !label) return null;
    return {
        maritalFurnitureDeliveryScheduleYmd: ymd || storedYmd,
        maritalFurnitureDeliveryScheduleLabel: label || storedLabel || (ymd ? `┘à┘ê╪╣╪» ╪د┘╪ز╪│┘┘è┘à: ${ymd}` : ''),
        maritalFurnitureDeliveryScheduledAt: new Date().toISOString(),
    };
}

export function buildArabicScheduleLabel(ymd: string): string {
    try {
        const [y, m, d] = ymd.split('-').map((x) => Number(x));
        return new Date(y, m - 1, d).toLocaleDateString('ar-IQ', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return ymd;
    }
}
