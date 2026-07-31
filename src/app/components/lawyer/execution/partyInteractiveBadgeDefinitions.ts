import type { LucideIcon } from 'lucide-react';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    Briefcase,
    Gavel,
    Lock,
    PauseCircle,
    Plane,
    ShieldAlert,
    TrendingUp,
    Wallet,
    UserRoundX,
} from 'lucide-react';
import type {
    ExecutionFile,
    SeizedAsset,
} from '@/app/types/execution';
import { buildSeizedAssetDetailLines } from '@/app/utils/seizedAssetDisplay';
import {
    isExecutiveDetentionBadgeSuppressed,
    isExecutiveDetentionPathEnforceable,
    isExecutiveDetentionPeriodActive,
    isTravelBanEnforceable,
    resolveExecutiveDetentionEffectiveJudgeOutcome,
    resolvePrimaryDebtorCoerciveStack,
} from './coerciveStackUtils';
import { isSeizureAssetEnforceableForBadge } from '@/app/components/lawyer/ExecutionDashboard/helpers/seizureUtils';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { getGoverningPersonalCoerciveAppealRow } from '@/app/utils/personalCoerciveAppealSync';

export type PartyBadgeParty = 'creditor' | 'debtor';

export type MemoBadgeInfo = {
    anchor: string;
    remaining: number;
    graceExpired: boolean;
};

export type PublicationNoticeBadgeInfo = {
    publicationDateYmd: string;
    deadlineYmd: string;
    remaining: number;
    graceExpired: boolean;
    newspaper1: string;
    newspaper2: string;
    recordedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
};

export type RegularTablighBadgeInfo = {
    noticeDateYmd: string;
    purpose: string;
    recordedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
};

export type AbsenceBadgeInfo = { label: string; className: string };

/** شارة تكليف بالحضور — الغاية والمدة من البطاقة */
export type TaklifAssignmentBadgeInfo = {
    purpose: string;
    notifyDateYmd: string;
    deadlineYmd: string;
    phase: 'active' | 'absent_declared' | 'investigation_pending' | 'warrant_ui';
    /** null إن لا يُحسب أجل */
    remainingDays: number | null;
    cycleGeneration?: number;
    confirmedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
    durationDays?: number;
};

export type EvictionGraceBadgeInfo = {
    startYmd: string;
    endYmd: string;
    daysTotal: number;
    remainingDays: number;
};

export type PoliceAssistanceBadgeInfo = {
    agencyName: string;
    dueYmd?: string;
    remainingDays?: number;
};

export type TimelineLite = {
    title?: string;
    description?: string;
    date?: string;
    timestamp?: string;
};

export type PartyInteractiveBadge = {
    id: string;
    shortLabel: string;
    Icon: LucideIcon;
    tone: 'amber' | 'slate' | 'emerald' | 'sky' | 'rose' | 'orange' | 'indigo' | 'violet';
    /** أسطر التفاصيل داخل الـ popover */
    detailLines: { k: string; v: string }[];
    /** عند النقر يفتح واجهة أخرى (مذكرة / تكليف حضور) */
    onActivate?: () => void;
    onDismiss?: () => void;
    dismissLabel?: string;
    dismissVariant?: 'hide' | 'complete';
    /** إخفاء عبر التخزين المحلي فقط */
    dismissMode: 'local' | 'callback';
};

export const toneRing: Record<PartyInteractiveBadge['tone'], string> = {
    amber: 'bg-amber-900/30 border-amber-500/50 text-amber-300',
    slate: 'bg-slate-900/30 border-slate-500/50 text-slate-300',
    emerald: 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300',
    sky: 'bg-sky-900/30 border-sky-500/50 text-sky-300',
    rose: 'bg-rose-900/30 border-rose-500/50 text-rose-300',
    orange: 'bg-orange-900/30 border-orange-500/50 text-orange-300',
    indigo: 'bg-indigo-900/30 border-indigo-500/50 text-indigo-300',
    violet: 'bg-violet-900/30 border-violet-500/50 text-violet-300',
};

import {
    PARTY_BADGE_ICON_SIZE,
    PARTY_BADGE_PILL_CLASS,
} from './partyBadgeShell';
export { PARTY_BADGE_ICON_SIZE, PARTY_BADGE_PILL_CLASS };

/** ترتيب ثابت للشارات — المهل والسياق القانوني أولاً، ثم الجبري الشخصي، ثم المالي */
const BADGE_DISPLAY_ORDER: Record<string, number> = {
    stay_of_execution: 10,
    employment_termination: 18,
    memo_notice: 22,
    publication_notice: 23,
    debtor_absence: 24,
    summons_attendance: 26,
    taklif_attendance: 27,
    executive_detention: 32,
    executive_detention_pending_confirm: 33,
    debtor_arrested: 36,
    arrest_warrant: 38,
    forced_attendance: 40,
    eviction_grace: 41,
    eviction_police_assistance: 42,
    travel_ban: 44,
    salary_garnishment: 55,
    seizure_sold_row: 60,
};

export function badgeSortOrder(id: string): number {
    if (BADGE_DISPLAY_ORDER[id] != null) return BADGE_DISPLAY_ORDER[id];
    if (id.startsWith('seizure_sold_')) return BADGE_DISPLAY_ORDER.seizure_sold_row;
    return 75;
}

function storageKeyHidden(executionId: string) {
    return `hami_party_badges_hidden_${executionId}`;
}

export function loadHidden(executionId: string): string[] {
    try {
        const raw = SecureStoreService.getItemSync(storageKeyHidden(executionId));
        if (!raw) return [];
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p.filter((x) => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

export function saveHidden(executionId: string, ids: string[]) {
    try {
        SecureStoreService.setItemSync(storageKeyHidden(executionId), JSON.stringify(ids));
    } catch {
        /* ignore */
    }
}

export function formatDateAr(isoOrYmd: string | undefined | null): string {
    if (!isoOrYmd) return '—';
    const d = new Date(isoOrYmd);
    return Number.isNaN(d.getTime()) ? String(isoOrYmd) : d.toLocaleDateString('ar-IQ');
}

function findTimelineDate(events: TimelineLite[] | undefined, needles: string[]): string {
    if (!events?.length) return '—';
    for (const e of events) {
        const t = `${e.title || ''} ${e.description || ''}`;
        if (needles.some((n) => t.includes(n))) {
            return formatDateAr(e.timestamp || e.date);
        }
    }
    return '—';
}

function garnishmentOfficeAr(target: ExecutionFile['garnishment_target']): string {
    if (target === 'national_retirement_board') return 'الهيئة الوطنية للتقاعد';
    if (target === 'employer') return 'جهة عمل المدين';
    return '—';
}

function isSeizedAssetActiveForBadge(a: SeizedAsset, decisionsExecutionId?: string): boolean {
    return isSeizureAssetEnforceableForBadge(a, decisionsExecutionId);
}

/** تفاصيل محجوز للشارة: تسميات عربية + تواريخ مقروءة */
function linesForSeizedAssetPopover(a: SeizedAsset): { k: string; v: string }[] {
    const raw = buildSeizedAssetDetailLines(a);
    const prio = ['تاريخ الحجز', 'تاريخ المزايدة', 'سعر البيع', 'تاريخ فك الحجز', 'الوصف'];
    const sorted = [...raw].sort((x, y) => {
        const ix = prio.indexOf(x.k);
        const iy = prio.indexOf(y.k);
        return (ix === -1 ? 999 : ix) - (iy === -1 ? 999 : iy);
    });
    return sorted.map(({ k, v }) => ({
        k,
        v:
            k === 'تاريخ الحجز' || k === 'تاريخ المزايدة' || k === 'تاريخ فك الحجز'
                ? formatDateAr(v)
                : v,
    }));
}

export function buildPartyBadgeDefinitions(args: {
    party: PartyBadgeParty;
    isPrimaryDebtor: boolean;
    executionData: ExecutionFile | null | undefined;
    seizedAssets: SeizedAsset[];
    timelineEvents: TimelineLite[];
    debtorArrested?: boolean;
    forcedAttendancePending?: boolean;
    /**
     * كاسب فقط: شارات طلبات التنفيذ الجبري الشخصي من «القرارات».
     * الموظف لا يُظهر له طلبات سفر/حبس/قبض من هذا المسار.
     */
    personalCoerciveDecisionBadges?: boolean;
    /** لقراءة طلبات التنفيذ الجبري الشخصي من التخزين (تحديث الشارات عند القرارات) */
    decisionsExecutionId?: string;
    /** المدين موظف — حجز الراتب يظهر للموظف فقط (لا يُخلط مع راتب الكفيل للكاسب) */
    debtorIsEmployee?: boolean;
    /** يتغيّر عند إعادة تحميل قرارات المنفذ */
    decisionsReloadEpoch?: number;
    activeDebtorKey?: string;
    primaryDebtorKey?: string;
    onWithdrawTravelBan?: () => void;
}): PartyInteractiveBadge[] {
    void args.decisionsReloadEpoch;
    const ed = args.executionData;
    const out: PartyInteractiveBadge[] = [];
    const activeSeized = args.seizedAssets.filter((a) =>
        isSeizedAssetActiveForBadge(a, args.decisionsExecutionId)
    );
    const pcDecisions = args.personalCoerciveDecisionBadges !== false;
    const decId = args.decisionsExecutionId;
    const debtorPrimary = args.party === 'debtor' && args.isPrimaryDebtor;
    const coerciveStack = debtorPrimary
        ? resolvePrimaryDebtorCoerciveStack({
              executionData: ed,
              decisionsExecutionId: decId,
              personalCoerciveDecisionBadges: pcDecisions,
              debtorArrested: args.debtorArrested,
              forcedAttendancePending: args.forcedAttendancePending,
              activeDebtorKey: args.activeDebtorKey,
              primaryDebtorKey: args.primaryDebtorKey,
          })
        : null;
    const detentionAbsentia = Boolean(
        coerciveStack?.detentionAbsentia ?? ed?.executive_detention_request_in_absentia
    );
    const detentionBadgeSuppressed = isExecutiveDetentionBadgeSuppressed(ed);
    const allDecisions = decId
        ? (readExecutorDecisionsArray(decId) as Record<string, unknown>[])
        : [];
    const appealScope = {
        debtorKey: args.activeDebtorKey,
        primaryDebtorKey: args.primaryDebtorKey,
    };
    const travelDecisionRow = decId
        ? getGoverningPersonalCoerciveAppealRow({
              executionId: decId,
              subtype: 'travel_ban',
              allDecisions,
              executionData: (ed as unknown as Record<string, unknown> | null | undefined) ?? undefined,
              ...appealScope,
          })
        : null;
    const judgeDecisionRow = decId
        ? getGoverningPersonalCoerciveAppealRow({
              executionId: decId,
              subtype: 'executive_detention_judge',
              allDecisions,
              executionData: (ed as unknown as Record<string, unknown> | null | undefined) ?? undefined,
              ...appealScope,
          })
        : null;
    const effectiveJudgeOutcome = decId
        ? resolveExecutiveDetentionEffectiveJudgeOutcome({
              executionData: ed,
              decisionsExecutionId: decId,
          })
        : ((ed?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ?? null);
    const detentionPathEnforceable = isExecutiveDetentionPathEnforceable(
        ed,
        detentionBadgeSuppressed,
        effectiveJudgeOutcome,
        { judgeDecisionRow, allDecisions }
    );
    const travelBanEnforceable = isTravelBanEnforceable(ed, {
        travelDecisionRow,
        allDecisions,
    });

    const stay = ed?.stay_of_execution;
    if (stay?.active) {
        if (args.party === 'creditor' || args.isPrimaryDebtor) {
            out.push({
                id: 'stay_of_execution',
                shortLabel: 'استئخار التنفيذ',
                Icon: PauseCircle,
                tone: 'amber',
                dismissMode: 'local',
                detailLines: [
                    { k: 'المحكمة', v: stay.court_name?.trim() || '—' },
                    { k: 'الجلسة القادمة', v: formatDateAr(stay.next_hearing_date) },
                    { k: 'القرار', v: stay.decision_number?.trim() || '—' },
                ],
            });
        }
    }

    const emp = ed?.employment_termination;
    if (emp && args.party === 'debtor' && args.isPrimaryDebtor) {
        out.push({
            id: 'employment_termination',
            shortLabel: 'تم إنهاء حالته الوظيفية (ليس له راتب)',
            Icon: Briefcase,
            tone: 'violet',
            dismissMode: 'local',
            detailLines: [{ k: 'التاريخ', v: formatDateAr(emp.effective_date) }],
        });
    }

    const sched = ed?.salary_garnishment_installment_schedule;
    const debtorIsEmployee = args.debtorIsEmployee === true;
    const salarySeizedAsset = debtorIsEmployee
        ? activeSeized.find((a) => /راتب|salary|خُمس|خمس/i.test(String(a.type)))
        : undefined;
    const salaryAction = debtorIsEmployee && Boolean(salarySeizedAsset || sched?.startDate);
    if (salaryAction && args.party === 'debtor' && args.isPrimaryDebtor) {
        let salarySub = salarySeizedAsset ? linesForSeizedAssetPopover(salarySeizedAsset) : [];
        const hasSeizDate = salarySub.some((l) => l.k === 'تاريخ الحجز');
        if (!hasSeizDate && (sched?.startDate || sched?.createdAt)) {
            salarySub = [
                { k: 'تاريخ الحجز', v: formatDateAr(sched?.startDate || sched?.createdAt) },
                ...salarySub,
            ];
        }
        out.push({
            id: 'salary_garnishment',
            shortLabel: 'حجز راتب',
            Icon: Wallet,
            tone: 'emerald',
            dismissMode: 'local',
            detailLines: [{ k: 'جهة الحجز', v: garnishmentOfficeAr(ed?.garnishment_target) }, ...salarySub],
        });
    }

    if (isExecutiveDetentionPeriodActive(ed) && args.party === 'debtor' && args.isPrimaryDebtor) {
        out.push({
            id: 'executive_detention',
            shortLabel: detentionAbsentia ? 'حبس تنفيذي (غيابي)' : 'حبس تنفيذي',
            Icon: Lock,
            tone: 'orange',
            dismissMode: 'local',
            detailLines: [
                {
                    k: 'النوع',
                    v: detentionAbsentia ? 'حبس تنفيذي — غيابي' : 'حبس تنفيذي — حضوري',
                },
                {
                    k: 'تاريخ الحبس / الانتهاء',
                    v: formatDateAr(ed.executive_detention_until || undefined),
                },
            ],
        });
    } else if (
        detentionPathEnforceable &&
        !isExecutiveDetentionPeriodActive(ed) &&
        args.party === 'debtor' &&
        args.isPrimaryDebtor
    ) {
        out.push({
            id: 'executive_detention_pending_confirm',
            shortLabel: detentionAbsentia ? 'حبس تنفيذي (غيابي)' : 'حبس تنفيذي',
            Icon: Lock,
            tone: 'orange',
            dismissMode: 'local',
            detailLines: [
                {
                    k: 'الحالة',
                    v: detentionAbsentia
                        ? 'مسار حبس غيابي نافذ — ثبّت المدة من محضر المتابعة.'
                        : 'مسار حبس تنفيذي نافذ — ثبّت المدة من محضر المتابعة.',
                },
            ],
        });
    }

    if (
        travelBanEnforceable &&
        args.party === 'debtor' &&
        args.isPrimaryDebtor
    ) {
        const issued = findTimelineDate(args.timelineEvents, ['منع سفر', 'سفر']);
        out.push({
            id: 'travel_ban',
            shortLabel: 'منع سفر',
            Icon: Plane,
            tone: 'sky',
            dismissMode: args.onWithdrawTravelBan ? 'callback' : 'local',
            dismissLabel: args.onWithdrawTravelBan ? 'التراجع عن الطلب' : undefined,
            onDismiss: args.onWithdrawTravelBan,
            detailLines: [{ k: 'تاريخ الإصدار', v: issued !== '—' ? issued : 'راجع السجل الزمني' }],
        });
    }

    if (args.debtorArrested && args.party === 'debtor' && args.isPrimaryDebtor) {
        out.push({
            id: 'debtor_arrested',
            shortLabel: 'قُبض على المدين',
            Icon: UserRoundX,
            tone: 'slate',
            dismissMode: 'local',
            detailLines: [
                { k: 'الحالة', v: 'تم تأمين القبض أو تسجيله في مسار التنفيذ' },
            ],
        });
    }

    if (debtorPrimary && coerciveStack?.showArrestWarrantBadge) {
        out.push({
            id: 'arrest_warrant',
            shortLabel: 'مذكرة قبض',
            Icon: ShieldAlert,
            tone: 'rose',
            dismissMode: 'local',
            detailLines: [
                {
                    k: 'الحالة',
                    v: 'صدرت مذكرة قبض — مطلوب تأمين الإحضار.',
                },
            ],
        });
    }

    if (debtorPrimary && coerciveStack?.showForcedAttendance) {
        out.push({
            id: 'forced_attendance',
            shortLabel: 'إحضار جبري',
            Icon: Gavel,
            tone: 'rose',
            dismissMode: 'local',
            detailLines: [
                {
                    k: 'الحالة',
                    v: coerciveStack.forcedNeedsOutcome
                        ? 'بانتظار تسجيل نتيجة الإحضار'
                        : 'مسار إحضار جبري نافذ',
                },
            ],
        });
    }

    const lockedSold = args.seizedAssets.filter(
        (a) => a.seizure_record_locked && String(a.status) === 'sold'
    );
    for (const a of lockedSold) {
        if (args.party === 'debtor' && args.isPrimaryDebtor) {
            out.push({
                id: `seizure_sold_${a.id}`,
                shortLabel: 'تمت المزايدة',
                Icon: TrendingUp,
                tone: 'violet',
                dismissMode: 'local',
                detailLines: linesForSeizedAssetPopover(a),
            });
        }
    }

    return out;
}
