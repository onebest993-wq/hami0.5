import type { LegalSubTask, LegalTask } from '@/app/types/TaskEngine';

/** صف في العرض الميداني — المهمة الأم أو فرع لها بموقع محدد */
export type FieldViewRow =
    | { kind: 'parent'; task: LegalTask }
    | { kind: 'sub'; task: LegalTask; subTask: LegalSubTask };

export type FieldGroupingResult = {
    byLocation: Record<string, FieldViewRow[]>;
    /** لا موقع للأم ولا لأي فرع ناشط */
    needsLocationTasks: LegalTask[];
};

/**
 * Phase 36 — تجميع الميدان من موقع المهمة **وجميع الفروع** غير المنجزة.
 */
export function buildFieldGrouping(pendingTasks: LegalTask[]): FieldGroupingResult {
    const nonFatal = pendingTasks.filter((t) => !t.isFatalDeadline);
    const byLocation = new Map<string, FieldViewRow[]>();

    const push = (loc: string, row: FieldViewRow) => {
        const key = loc.trim();
        if (!key) return;
        const arr = byLocation.get(key) ?? [];
        arr.push(row);
        byLocation.set(key, arr);
    };

    for (const t of nonFatal) {
        const main = t.location?.trim();
        if (main) push(main, { kind: 'parent', task: t });

        for (const st of t.subTasks) {
            if (st.isCompleted) continue;
            const sl = st.location?.trim();
            if (sl) push(sl, { kind: 'sub', task: t, subTask: st });
        }
    }

    const keys = [...byLocation.keys()].sort((a, b) => a.localeCompare(b, 'ar'));
    const sortedRecord: Record<string, FieldViewRow[]> = {};
    for (const k of keys) {
        sortedRecord[k] = byLocation.get(k) ?? [];
    }

    const needsLocationTasks = nonFatal.filter((t) => {
        const hasMain = !!t.location?.trim();
        const hasActiveSubLocation = t.subTasks.some(
            (st) => !st.isCompleted && !!st.location?.trim(),
        );
        return !hasMain && !hasActiveSubLocation;
    });

    return { byLocation: sortedRecord, needsLocationTasks };
}
