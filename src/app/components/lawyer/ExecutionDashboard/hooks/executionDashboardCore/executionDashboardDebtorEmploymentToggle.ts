/** تبديل صفة المدين — منطق خالص قابل للـ dynamic import */
import type { Debtor, ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    buildDebtorEmploymentTogglePatch,
    isDebtorRowEmployee,
    useExecutionDashboardStore,
} from '@/app/stores/executionDashboardStore';
import { getLocalTodayYmd } from './executionDashboardCoreDate';
import type { DebtorWorkspaceEntry } from '../useDebtorWorkspaceEntries';

export type RunDebtorEmploymentToggleInput = {
    executionDataRef: { current: ExecutionFile | null | undefined };
    debtorWorkspaceEntries: DebtorWorkspaceEntry[];
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    setTimelineEvents: (updater: (prev: TimelineEvent[]) => TimelineEvent[]) => void;
    ctx?: { debtorKey: string; isPrimary: boolean };
};

export function runDebtorEmploymentToggle(input: RunDebtorEmploymentToggleInput): void {
    const {
        executionDataRef,
        debtorWorkspaceEntries,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        ctx,
    } = input;
    const base = executionDataRef.current;
    if (!base?.id) return;
    const primaryK = debtorWorkspaceEntries[0]?.key;
    const debtorKeyRaw = String(ctx?.debtorKey ?? primaryK ?? '').trim();
    const debtorKey = debtorKeyRaw !== '' ? debtorKeyRaw : 'primary_debtor';

    const prim = base.debtors?.[0] as Debtor | undefined;
    const primaryKey =
        prim?.id != null && String(prim.id).trim() !== ''
            ? String(prim.id)
            : 'primary_debtor';
    let currentlyEmployee: boolean;
    if (debtorKey === primaryKey) {
        currentlyEmployee = isDebtorRowEmployee(prim);
    } else {
        const ad = base.party_multiplicity?.additionalDebtors?.find(
            (a) => String(a.id) === debtorKey,
        );
        if (!ad) {
            showToast(
                'تعذّر ربط المدين ببيانات تعدّد الخصوم — أعد فتح الإضبارة أو أضف المدين من إعدادات الذمة.',
                'warning',
            );
            return;
        }
        currentlyEmployee = isDebtorRowEmployee(ad);
    }

    const patch = buildDebtorEmploymentTogglePatch(base, debtorKey);
    if (!patch) {
        showToast('تعذّر تبديل الصفة الوظيفية.', 'warning');
        return;
    }

    const iso = getLocalTodayYmd();
    const ts = new Date().toISOString();
    const nextEmp = !currentlyEmployee;
    const event: TimelineEvent = {
        id: nextTimelineId(),
        date: iso,
        timestamp: ts,
        title: nextEmp ? '↩️ إعادة تفعيل الوظيفة' : '📋 تحويل المدين إلى كاسب',
        description: nextEmp
            ? 'أُعيدت صفة المدين إلى موظف — يُتاح حجز الراتب؛ أُلغيت حالة التنفيذ الجبري الشخصي المرتبطة بمسار الكاسب.'
            : 'تغيير الحالة الوظيفية — حجز الراتب لا ينطبق؛ يُتاح التنفيذ الجبري الشخصي وفق المسار.',
        type: 'procedure',
        source: 'إدارة التنفيذ',
        metadata: { timelineDebtorKey: debtorKey },
    };
    setTimelineEvents((prev) => {
        const next = [event, ...(Array.isArray(prev) ? prev : [])];
        const merged = { ...base, ...patch, timelineEvents: next } as ExecutionFile;
        persistExecutionMerge({ ...patch, timelineEvents: next });
        useExecutionDashboardStore.getState().setCurrentFile(merged);
        return next;
    });
    showToast(nextEmp ? 'تمت إعادة صفة الموظف.' : 'تم التحويل إلى كاسب.', 'success');
}
