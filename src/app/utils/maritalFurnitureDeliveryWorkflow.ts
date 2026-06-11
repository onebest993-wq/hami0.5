import type { ExecutorRequestLifecycleSummary } from '@/app/utils/executorRequestLifecycle';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    getGoverningEvictionProcedureRowForBranch,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueue';

export const MARITAL_FURNITURE_DELIVERY_BRANCH = 'Marital Furniture Delivery' as const;
export const MARITAL_FURNITURE_DELIVERY_WORKFLOW_KEY = 'marital_furniture_delivery' as const;

export type MaritalFurnitureDeliveryMode = 'none' | 'unified' | 'legacy';

export function resolveMaritalFurnitureDeliveryState(all: Record<string, unknown>[]): {
    mode: MaritalFurnitureDeliveryMode;
    unifiedRow: Record<string, unknown> | null;
    fieldVisitRow: Record<string, unknown> | null;
    breakInventoryRow: Record<string, unknown> | null;
} {
    const unifiedRow = getGoverningEvictionProcedureRowForBranch(
        all,
        MARITAL_FURNITURE_DELIVERY_BRANCH
    );
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

/** اكتمال خطوة الموعد (منفصلة عن اكتمال المسار الكامل للصف الموحّد) */
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

/** استخراج YMD من صف موعد الخروج الميداني */
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
        outcomeLabel: `موعد تسليم · ${e.outcomeLabel}`,
    }));
    const biEntries = (breakInventory?.entries ?? []).map((e) => ({
        ...e,
        outcomeLabel: `جرد تسليم · ${e.outcomeLabel}`,
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
