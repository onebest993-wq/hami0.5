import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import type { EvictionAppealSyncBranch } from '@/app/utils/evictionAppealSync';
import type { EvictionExecutorWorkflowKey } from '@/app/utils/executorApprovalWorkflow';
import type { ExecutorDecisionRowLite } from '@/app/utils/executorDecisionSelectors';

export const BTN_BASE =
    'h-16 w-full flex flex-row-reverse items-center justify-between gap-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-300 group cursor-pointer overflow-hidden text-right px-4';
export const BTN_DISABLED = 'opacity-45 cursor-not-allowed hover:border-white/5';

export const TONE_GRACE = 'bg-sky-500/[0.06] hover:bg-sky-500/[0.10] border-sky-300/15 hover:border-sky-200/25';
export const TONE_FIELD_VISIT = 'bg-amber-500/[0.06] hover:bg-amber-500/[0.10] border-amber-300/15 hover:border-amber-200/25';
export const TONE_POLICE = 'bg-rose-500/[0.06] hover:bg-rose-500/[0.10] border-rose-300/15 hover:border-rose-200/25';
export const TONE_EARLY_END = 'bg-violet-500/[0.06] hover:bg-violet-500/[0.10] border-violet-300/15 hover:border-violet-200/25';
export const TONE_BREAK = 'bg-orange-500/[0.06] hover:bg-orange-500/[0.10] border-orange-300/15 hover:border-orange-200/25';
export const TONE_CUSTODIAN = 'bg-emerald-500/[0.06] hover:bg-emerald-500/[0.10] border-emerald-300/15 hover:border-emerald-200/25';

export const EVICTION_ACTION_BRANCH: Partial<Record<EvictionTimelineActionId, EvictionAppealSyncBranch>> = {
    [EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT]: 'Field Visit Date',
    [EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE]: 'Police Assistance Request',
    [EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY]: 'Lock Breaking & Inventory',
    [EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN]: 'Judicial Custodian',
    [EVICTION_TIMELINE_ACTION_IDS.RESIDENTIAL_GRACE_EARLY_END]: 'Residential Grace Early End',
};

/** صف قرار منفذ ضمن مسار التخلية — مبني على Lite المشترك + حقول الواجهة. */
export type EvictionDecisionRow = ExecutorDecisionRowLite & {
    policeAssistanceSavedAt?: string;
    policeAssistanceAgency?: string;
    breakInventoryFurnitureLedgerAt?: string;
    evictionWorkflowKey?: EvictionExecutorWorkflowKey;
};

export function asEvictionDecisionRows(raw: unknown): EvictionDecisionRow[] {
    return Array.isArray(raw) ? (raw as EvictionDecisionRow[]) : [];
}

/** لواجهات الطابور/المزامنة التي ما زالت تأخذ Record. */
export function asEvictionDecisionRecordRows(raw: unknown): Record<string, unknown>[] {
    return asEvictionDecisionRows(raw) as Record<string, unknown>[];
}
