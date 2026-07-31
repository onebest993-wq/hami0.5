/**
 * تكليف حضور المدين (مسار الموظف): احتساب المدة التقويمية من تاريخ التبليغ بالتكليف.
 */

import type { EmployeeSummonsAssignmentState } from '@/app/types/execution';
import {
    parseLocalNotificationDate,
} from '@/app/utils/executionStateMachine';
import { addCalendarDaysYmd } from '@/app/utils/executionYmdCalendar';

export { addCalendarDaysYmd };

/** شريحة من ملف التنفيذ لقراءة/كتابة تكليفات الموظفين */
export type EmployeeSummonsAssignmentsFileSlice = {
    employee_summons_assignment?: EmployeeSummonsAssignmentState | null;
    employee_summons_assignments_by_debtor?: Record<string, EmployeeSummonsAssignmentState>;
};

function resolvedLegacyDebtorKey(
    leg: EmployeeSummonsAssignmentState,
    primaryDebtorKey: string
): string {
    if (leg.assignedDebtorKey != null && String(leg.assignedDebtorKey).trim() !== '') {
        return String(leg.assignedDebtorKey);
    }
    return String(primaryDebtorKey);
}

/** دمج الحقل القديم مع الخريطة الحالية (بدون طمس مفاتيح موجودة في الخريطة). */
export function materializeEmployeeSummonsAssignmentsMap(
    file: EmployeeSummonsAssignmentsFileSlice,
    primaryDebtorKey: string
): Record<string, EmployeeSummonsAssignmentState> {
    const out: Record<string, EmployeeSummonsAssignmentState> = {
        ...(file.employee_summons_assignments_by_debtor ?? {}),
    };
    const leg = file.employee_summons_assignment;
    if (leg && leg.phase && leg.phase !== 'none') {
        const k = resolvedLegacyDebtorKey(leg, primaryDebtorKey);
        if (!(k in out)) {
            out[k] = { ...leg, assignedDebtorKey: k };
        }
    }
    return out;
}

export function getEmployeeAssignmentForDebtorKey(
    file: EmployeeSummonsAssignmentsFileSlice,
    debtorKey: string,
    primaryDebtorKey: string
): EmployeeSummonsAssignmentState | null {
    const dk = String(debtorKey);
    const map = file.employee_summons_assignments_by_debtor;
    if (map && Object.prototype.hasOwnProperty.call(map, dk)) {
        const v = map[dk];
        if (v == null || !v.phase || v.phase === 'none') return null;
        return v;
    }
    const leg = file.employee_summons_assignment;
    if (!leg || !leg.phase || leg.phase === 'none') return null;
    const k = resolvedLegacyDebtorKey(leg, primaryDebtorKey);
    return k === dk ? leg : null;
}

export function buildEmployeeAssignmentPatchForDebtorKey(
    file: EmployeeSummonsAssignmentsFileSlice,
    debtorKey: string,
    next: EmployeeSummonsAssignmentState | null,
    primaryDebtorKey: string
): {
    employee_summons_assignments_by_debtor: Record<string, EmployeeSummonsAssignmentState>;
    employee_summons_assignment: null;
} {
    const map = materializeEmployeeSummonsAssignmentsMap(file, primaryDebtorKey);
    const dk = String(debtorKey);
    if (next == null) {
        delete map[dk];
    } else {
        map[dk] = { ...next, assignedDebtorKey: dk };
    }
    return {
        employee_summons_assignments_by_debtor: map,
        employee_summons_assignment: null,
    };
}

/** صف قرار منفذ — الحد الأدنى لمزامنة المفاتحة */
export type ExecutorDecisionRowLite = { id: string | number; executorOutcome?: string | null };

/** توحيد قيمة النتيجة (مسافات، حالة الأحرف) كما في بقية مسار القرارات */
export function classifyExecutorOutcomeForInvestigationSync(
    raw: string | null | undefined
): 'pending' | 'approved' | 'other' {
    const s = String(raw ?? '').trim().toLowerCase();
    if (!s || s === 'pending') return 'pending';
    /** قرار بديل لدى المنفذ يُعامل كموافقة عملية لمسار المفاتحة */
    if (s === 'approved' || s === 'alternative') return 'approved';
    return 'other';
}

/**
 * يطبّق نتائج المنفذ على كل تكليف موظف في حالة investigation_pending دفعة واحدة
 * (ذمة مقسومة: أكثر من مدين قد يكون لكل منهم طلب مفاتحة).
 */
export function mergeInvestigationOutcomesIntoEmployeeAssignments(
    file: EmployeeSummonsAssignmentsFileSlice,
    primaryDebtorKey: string,
    rows: ExecutorDecisionRowLite[]
): {
    patch: {
        employee_summons_assignments_by_debtor: Record<string, EmployeeSummonsAssignmentState>;
        employee_summons_assignment: null;
    };
    approvedCount: number;
    rejectedCount: number;
} | null {
    const initialMap = materializeEmployeeSummonsAssignmentsMap(file, primaryDebtorKey);
    const pendingDebtorKeys = Object.entries(initialMap)
        .filter(([, s]) => s.phase === 'investigation_pending' && s.investigationDecisionId)
        .map(([k]) => k)
        .sort();

    if (pendingDebtorKeys.length === 0) return null;

    let working: EmployeeSummonsAssignmentsFileSlice = file;
    let approvedCount = 0;
    let rejectedCount = 0;
    let changed = false;

    for (const debtorKey of pendingDebtorKeys) {
        const state = getEmployeeAssignmentForDebtorKey(working, debtorKey, primaryDebtorKey);
        if (!state || state.phase !== 'investigation_pending' || !state.investigationDecisionId) continue;
        const row = rows.find((r) => String(r.id) === String(state.investigationDecisionId));
        const outcomeCls = classifyExecutorOutcomeForInvestigationSync(row?.executorOutcome);
        if (outcomeCls === 'pending') continue;

        const nextState =
            outcomeCls === 'approved'
                ? {
                      ...state,
                      phase: 'warrant_ui' as const,
                      investigationApproved: true,
                      arrestOrderRecorded: false,
                  }
                : {
                      ...state,
                      phase: 'absent_declared' as const,
                      investigationDecisionId: null as string | null,
                  };

        const patchPart = buildEmployeeAssignmentPatchForDebtorKey(
            working,
            debtorKey,
            nextState,
            primaryDebtorKey
        );
        working = {
            ...working,
            employee_summons_assignments_by_debtor: patchPart.employee_summons_assignments_by_debtor,
            employee_summons_assignment: null,
        };
        changed = true;
        if (outcomeCls === 'approved') approvedCount += 1;
        else rejectedCount += 1;
    }

    if (!changed) return null;
    return {
        patch: {
            employee_summons_assignments_by_debtor: working.employee_summons_assignments_by_debtor!,
            employee_summons_assignment: null,
        },
        approvedCount,
        rejectedCount,
    };
}

/** أول تكليف قيد انتظار قرار مفاتحة (اختبارات / استعلام بسيط). */
export function findInvestigationPendingEmployeeAssignment(
    file: EmployeeSummonsAssignmentsFileSlice,
    primaryDebtorKey: string
): { debtorKey: string; state: EmployeeSummonsAssignmentState } | null {
    const map = file.employee_summons_assignments_by_debtor;
    if (map) {
        for (const [k, v] of Object.entries(map)) {
            if (v?.phase === 'investigation_pending' && v.investigationDecisionId) {
                return { debtorKey: k, state: v };
            }
        }
    }
    const leg = file.employee_summons_assignment;
    if (leg?.phase === 'investigation_pending' && leg.investigationDecisionId) {
        return {
            debtorKey: resolvedLegacyDebtorKey(leg, primaryDebtorKey),
            state: leg,
        };
    }
    return null;
}

/** نهاية المدة = (تاريخ التبليغ + 1) + N أيام تقويمية */
export function computeTaklifDeadlineYmd(
    notifyDateYmd: string,
    durationDays: number = 4
): string {
    const start = addCalendarDaysYmd(notifyDateYmd, 1);
    return addCalendarDaysYmd(start, durationDays);
}

/** إخفاء تلقائي بعد مرور يوم كامل على انتهاء المهلة (عند بقاء المرحلة active بدون متابعة). */
export function isAssignmentAutoHideEligible(deadlineYmd: string): boolean {
    const cutoff = addCalendarDaysYmd(deadlineYmd, 1);
    if (!cutoff) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const c = parseLocalNotificationDate(cutoff);
    if (Number.isNaN(c.getTime())) return false;
    c.setHours(0, 0, 0, 0);
    return today >= c;
}

export function isAssignmentDeadlinePassed(deadlineYmd: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseLocalNotificationDate(deadlineYmd);
    if (Number.isNaN(end.getTime())) return false;
    end.setHours(0, 0, 0, 0);
    return today > end;
}

/** عدد الأيام المتبقية حتى آخر يوم للمدة (0 = اليوم هو آخر يوم أو انتهت). */
export function daysRemainingUntilDeadline(deadlineYmd: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseLocalNotificationDate(deadlineYmd);
    if (Number.isNaN(end.getTime())) return 0;
    end.setHours(0, 0, 0, 0);
    const ms = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(ms / 86400000));
}

/** نفس أصناف شارة التكليف في لوحة التبليغ — لكل مدين وفق بياناته */
const EMPLOYEE_ASSIGNMENT_DEBTOR_CHIP_CLASS =
    'backdrop-blur-sm bg-amber-500/20 text-amber-100 px-2 py-0.5 rounded-lg text-[9px] border border-amber-400/35 font-bold';

export function getEmployeeAssignmentDebtorChipForDebtorKey(
    file: EmployeeSummonsAssignmentsFileSlice,
    debtorKey: string,
    primaryDebtorKey: string
): { label: string; className: string } | null {
    const a = getEmployeeAssignmentForDebtorKey(file, debtorKey, primaryDebtorKey);
    if (!a) return null;
    const className = EMPLOYEE_ASSIGNMENT_DEBTOR_CHIP_CLASS;
    if (a.phase === 'investigation_pending') {
        return { label: 'تكليف حضور: مفاتحة التحقيق قيد البتّ', className };
    }
    if (a.phase === 'warrant_ui') {
        return {
            label: a.arrestOrderRecorded
                ? 'تكليف: أمر قبض — سجّل الإحضار أو أنهِ التكليف'
                : 'تكليف: موافقة مفاتحة — سجّل صدور أمر القبض',
            className,
        };
    }
    if (a.phase === 'absent_declared') {
        return { label: 'تكليف: عدم حضور — مفاتحة أو إنهاء', className };
    }
    if (a.phase === 'active') {
        const dl =
            a.notifyDate != null && a.notifyDate !== ''
                ? computeTaklifDeadlineYmd(a.notifyDate, a.durationDays ?? 1)
                : a.deadlineDate || '';
        if (dl) {
            if (isAssignmentDeadlinePassed(dl) && isAssignmentAutoHideEligible(dl)) {
                return null;
            }
            if (!isAssignmentDeadlinePassed(dl)) {
                const rem = daysRemainingUntilDeadline(dl);
                return { label: `تكليف حضور — متبقٍ ${rem} يوماً`, className };
            }
            return { label: 'تكليف حضور — انتهت المدة', className };
        }
        return { label: 'تكليف حضور — سارٍ', className };
    }
    return null;
}
