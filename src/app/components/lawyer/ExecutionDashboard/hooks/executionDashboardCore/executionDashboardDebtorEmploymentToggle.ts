import type { Dispatch, SetStateAction } from 'react';
import type { Debtor, ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    buildDebtorEmploymentTogglePatch,
    isDebtorRowEmployee,
    useExecutionDashboardStore,
} from '@/app/stores';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { DebtorWorkspaceEntry } from '../useDebtorWorkspaceEntries';

export type RunDebtorEmploymentToggleParams = {
    base: ExecutionFile | null | undefined;
    debtorWorkspaceEntries: DebtorWorkspaceEntry[];
    ctx?: { debtorKey: string; isPrimary: boolean };
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string) => void;
    setTimelineEvents?: Dispatch<SetStateAction<TimelineEvent[]>>;
};

export function runDebtorEmploymentToggle({
    base,
    debtorWorkspaceEntries,
    ctx,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
}: RunDebtorEmploymentToggleParams): void {
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

    const commit = (nextTimeline: TimelineEvent[]) => {
        const merged = { ...base, ...patch, timelineEvents: nextTimeline } as ExecutionFile;
        persistExecutionMerge({ ...patch, timelineEvents: nextTimeline });
        useExecutionDashboardStore.getState().setCurrentFile(merged);
        showToast(nextEmp ? 'تمت إعادة صفة الموظف.' : 'تم التحويل إلى كاسب.', 'success');
    };

    if (typeof setTimelineEvents === 'function') {
        setTimelineEvents((prev) => {
            const next = [event, ...prev];
            commit(next);
            return next;
        });
        return;
    }

    const prevTimeline = Array.isArray(base.timelineEvents) ? base.timelineEvents : [];
    commit([event, ...prevTimeline]);
}
