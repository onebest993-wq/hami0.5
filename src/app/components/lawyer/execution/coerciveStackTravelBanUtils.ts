import { isExecutorDecisionRowEffectivelyEnforced } from '@/app/components/lawyer/ExecutionDashboard/utils/executorRequestEnforceability';

/** تراجع صريح عن طلب منع السفر — لا يُربط بإخلاء سبيل الحبس وحده */
export function isTravelBanRequestWithdrawn(
    ed: { travel_ban_withdrawn_at?: string | null } | null | undefined
): boolean {
    return Boolean(String(ed?.travel_ban_withdrawn_at ?? '').trim());
}

/** تراجع عن دورة الطلب مع إبقاء منع السفر نافذاً حتى السداد */
export function isTravelBanRequestCycleWithdrawn(
    ed: { travel_ban_request_cycle_withdrawn_at?: string | null } | null | undefined
): boolean {
    return Boolean(String(ed?.travel_ban_request_cycle_withdrawn_at ?? '').trim());
}

/** دورة منع السفر منتهية — يُعاد تفعيل تقديم طلب جديد */
export function isTravelBanLaneSettled(
    ed:
        | {
              travel_ban_withdrawn_at?: string | null;
              debtor_travel_ban_active?: boolean;
          }
        | null
        | undefined,
    opts: { travelCycleActive: boolean }
): boolean {
    if (isTravelBanRequestWithdrawn(ed)) return true;
    if (!opts.travelCycleActive) return true;
    if (ed?.debtor_travel_ban_active !== true) return true;
    return false;
}

/** منع سفر نافذ — بعد موافقة المنفذ وانتهاء مسار الطعن الموقِف */
export function isTravelBanEnforceable(
    ed: { debtor_travel_ban_active?: boolean; travel_ban_withdrawn_at?: string | null } | null | undefined,
    opts?: {
        travelDecisionRow?: Record<string, unknown> | null;
        allDecisions?: Record<string, unknown>[];
    }
): boolean {
    if (isTravelBanRequestWithdrawn(ed)) return false;
    if (ed?.debtor_travel_ban_active !== true) return false;
    const row = opts?.travelDecisionRow;
    const all = opts?.allDecisions ?? [];
    if (row && all.length > 0) {
        return isExecutorDecisionRowEffectivelyEnforced(row, all);
    }
    return false;
}
