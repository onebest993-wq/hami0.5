// @ts-nocheck
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    formatNumberInput,
    parseAmount,
} from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';
import {
    BADGE_POPOVER_Z_INDEX,
    computeFixedPopoverLayout,
    refinePopoverLayoutWithMeasuredHeight,
    type FixedPopoverLayout,
} from './anchoredPopoverPosition';
import type {
    ExecutionFile,
    RealEstateSeizureAsset,
    SeizedAsset,
    ThirdPartySeizureAsset,
    StandaloneExecutionMark,
} from '@/app/types/execution';
import {
    Briefcase,
    Bell,
    Calendar,
    CheckCircle,
    Gavel,
    EyeOff,
    FileText,
    Lock,
    Newspaper,
    PauseCircle,
    Plane,
    Shield,
    ShieldAlert,
    Timer,
    TrendingUp,
    UserX,
    X,
    Wallet,
    UserRoundX,
    Pin,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { buildSeizedAssetDetailLines } from '@/app/utils/seizedAssetDisplay';
import { parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import SecureStoreService from '@/app/services/SecureStoreService';
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

type TimelineLite = {
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

const toneRing: Record<PartyInteractiveBadge['tone'], string> = {
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

/** ترتيب ثابت للشارات — المهل والسياق القانوني أولاً، ثم الجبري الشخصي، ثم المالي */
const BADGE_DISPLAY_ORDER: Record<string, number> = {
    stay_of_execution: 10,
    death_creditor: 15,
    death_debtor: 16,
    employment_termination: 18,
    memo_notice: 22,
    publication_notice: 23,
    debtor_absence: 24,
    summons_attendance: 26,
    taklif_attendance: 27,
    executive_detention: 32,
    executive_detention_pending_confirm: 33,
    executive_detention_request: 34,
    debtor_arrested: 36,
    arrest_warrant: 38,
    forced_attendance: 40,
    eviction_grace: 41,
    eviction_police_assistance: 42,
    travel_ban: 44,
    travel_ban_pending: 45,
    travel_ban_approved_inactive: 46,
    salary_garnishment: 55,
    real_estate_seizure: 56,
    property_seizure: 56,
    vehicle_seizure: 57,
    movable_seizure: 58,
    seizure_released_row: 59,
    seizure_sold_row: 60,
};

function badgeSortOrder(id: string): number {
    if (BADGE_DISPLAY_ORDER[id] != null) return BADGE_DISPLAY_ORDER[id];
    if (id.startsWith('seizure_released_')) return BADGE_DISPLAY_ORDER.seizure_released_row;
    if (id.startsWith('seizure_sold_')) return BADGE_DISPLAY_ORDER.seizure_sold_row;
    return 75;
}

function storageKeyHidden(executionId: string) {
    return `hami_party_badges_hidden_${executionId}`;
}

function loadHidden(executionId: string): string[] {
    try {
        const raw = SecureStoreService.getItemSync(storageKeyHidden(executionId));
        if (!raw) return [];
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p.filter((x) => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

function saveHidden(executionId: string, ids: string[]) {
    try {
        SecureStoreService.setItemSync(storageKeyHidden(executionId), JSON.stringify(ids));
    } catch {
        /* ignore */
    }
}

function formatDateAr(isoOrYmd: string | undefined | null): string {
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
    activeCoerciveActions: string[];
    seizedAssets: SeizedAsset[];
    realEstateSeizureAssets?: RealEstateSeizureAsset[];
    thirdPartySeizureAssets?: ThirdPartySeizureAsset[];
    standaloneExecutionMarks?: StandaloneExecutionMark[];
    timelineEvents: TimelineLite[];
    hasGuarantor: boolean;
    memoBadge: MemoBadgeInfo | null;
    absenceBadge: AbsenceBadgeInfo | null;
    showSummonsBadge: boolean;
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
              executionData: ed ?? undefined,
              ...appealScope,
          })
        : null;
    const judgeDecisionRow = decId
        ? getGoverningPersonalCoerciveAppealRow({
              executionId: decId,
              subtype: 'executive_detention_judge',
              allDecisions,
              executionData: ed ?? undefined,
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

export type ExecutionPartyInteractiveBadgesProps = {
    executionId: string;
    party: PartyBadgeParty;
    isPrimaryDebtor: boolean;
    executionData: ExecutionFile | null | undefined;
    activeCoerciveActions: string[];
    seizedAssets: SeizedAsset[];
    realEstateSeizureAssets?: RealEstateSeizureAsset[];
    thirdPartySeizureAssets?: ThirdPartySeizureAsset[];
    standaloneExecutionMarks?: StandaloneExecutionMark[];
    timelineEvents: TimelineLite[];
    hasGuarantor: boolean;
    memoBadge: MemoBadgeInfo | null;
    publicationNoticeBadge?: PublicationNoticeBadgeInfo | null;
    onPublicationNoticeActivate?: () => void;
    onMemoActivate?: () => void;
    absenceBadge: AbsenceBadgeInfo | null;
    onDismissAbsence?: () => void;
    showSummonsBadge: boolean;
    onSummonsActivate?: () => void;
    regularTablighBadge?: RegularTablighBadgeInfo | null;
    onDismissRegularTablighBadge?: () => void;
    debtorArrested?: boolean;
    forcedAttendancePending?: boolean;
    /** افتراضياً true؛ عيّن false للمدين الموظف (لا شارات طلبات التنفيذ الجبري الشخصي من القرارات) */
    personalCoerciveDecisionBadges?: boolean;
    /** المدين موظف — شارة «حجز راتب» للمدين فقط (الكفيل له مسار منفصل) */
    debtorIsEmployee?: boolean;
    /** يزيد عند تحديث قرارات المنفذ المحلية لتمرير الشارات */
    decisionsReloadEpoch?: number;
    activeDebtorKey?: string;
    primaryDebtorKey?: string;
    /** بعد موافقة المنفذ على طلب الكفيل — حفظ بيانات الكفيل في الملف */
    onPersistGuarantorFollowup?: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: { salaryIqd: number | null; deductionIqd: number | null }
    ) => void;
    taklifAssignmentBadge?: TaklifAssignmentBadgeInfo | null;
    onTaklifAssignmentActivate?: () => void;
    onDismissTaklifAssignmentBadge?: () => void;
    onDismissPublicationNoticeBadge?: () => void;
    evictionGracePinned?: boolean;
    onToggleEvictionGracePinned?: () => void;
    evictionGraceBadge?: EvictionGraceBadgeInfo | null;
    onEvictionGraceActivate?: () => void;
    onCompleteEvictionGrace?: () => void;
    policeAssistanceBadge?: PoliceAssistanceBadgeInfo | null;
    onPoliceAssistanceActivate?: () => void;
    onCompletePoliceAssistance?: () => void;
    /** تراجع عن منع السفر — إخفاء الشارة وإعادة دورة الطلب */
    onWithdrawTravelBan?: () => void;
    /** معاينة تاريخية — منع فتح الشارات والتعديل */
    isHistoricalMode?: boolean;
    /** داخل صف موحّد مع شارات المحجوزات — بدون غلاف flex منفصل */
    embeddedInRow?: boolean;
    /** حالة حضور محلية — تسبق executionData عند التسجيل الفوري */
    debtorAttendedVoluntarily?: boolean;
    voluntaryAttendanceCount?: number;
};

export const ExecutionPartyInteractiveBadges: React.FC<ExecutionPartyInteractiveBadgesProps> = ({
    executionId,
    party,
    isPrimaryDebtor,
    executionData,
    activeCoerciveActions,
    seizedAssets,
    realEstateSeizureAssets = [],
    thirdPartySeizureAssets = [],
    standaloneExecutionMarks = [],
    timelineEvents,
    hasGuarantor,
    memoBadge,
    publicationNoticeBadge = null,
    onPublicationNoticeActivate,
    onMemoActivate,
    absenceBadge,
    onDismissAbsence,
    showSummonsBadge,
    onSummonsActivate,
    regularTablighBadge = null,
    onDismissRegularTablighBadge,
    debtorArrested,
    forcedAttendancePending,
    personalCoerciveDecisionBadges = true,
    decisionsReloadEpoch = 0,
    activeDebtorKey,
    primaryDebtorKey,
    onPersistGuarantorFollowup,
    taklifAssignmentBadge = null,
    onTaklifAssignmentActivate,
    onDismissTaklifAssignmentBadge,
    onDismissPublicationNoticeBadge,
    evictionGracePinned = false,
    onToggleEvictionGracePinned,
    evictionGraceBadge = null,
    onEvictionGraceActivate,
    onCompleteEvictionGrace,
    policeAssistanceBadge = null,
    onPoliceAssistanceActivate,
    onCompletePoliceAssistance,
    onWithdrawTravelBan,
    isHistoricalMode = false,
    debtorIsEmployee = false,
    embeddedInRow = false,
    debtorAttendedVoluntarily: debtorAttendedVoluntarilyProp,
    voluntaryAttendanceCount: voluntaryAttendanceCountProp,
}) => {
    const [hiddenLocal, setHiddenLocal] = useState<string[]>(() => loadHidden(executionId));
    const [openId, setOpenId] = useState<string | null>(null);
    const [guarantorNameDraft, setGuarantorNameDraft] = useState('');
    const [guarantorWorkplaceDraft, setGuarantorWorkplaceDraft] = useState('');
    const [guarantorSalaryDraft, setGuarantorSalaryDraft] = useState('');
    const [guarantorDeductionDraft, setGuarantorDeductionDraft] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const guarantorNameInputRef = useRef<HTMLInputElement>(null);
    const guarantorWorkInputRef = useRef<HTMLInputElement>(null);
    const guarantorSalaryInputRef = useRef<HTMLInputElement>(null);
    const guarantorDeductionInputRef = useRef<HTMLInputElement>(null);
    const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [popoverPos, setPopoverPos] = useState<FixedPopoverLayout | null>(null);

    useEffect(() => {
        setHiddenLocal(loadHidden(executionId));
    }, [executionId]);

    const lastRegularTablighKeyRef = useRef<string>('');
    const lastPublicationKeyRef = useRef<string>('');
    const lastTaklifKeyRef = useRef<string>('');

    useEffect(() => {
        const k = regularTablighBadge
            ? `${regularTablighBadge.noticeDateYmd}|${regularTablighBadge.purpose}`
            : '';
        if (!k) {
            lastRegularTablighKeyRef.current = '';
            return;
        }
        if (lastRegularTablighKeyRef.current && lastRegularTablighKeyRef.current !== k) {
            setHiddenLocal((prev) => {
                const next = prev.filter((id) => id !== 'summons_attendance');
                saveHidden(executionId, next);
                return next;
            });
        }
        lastRegularTablighKeyRef.current = k;
    }, [executionId, regularTablighBadge]);

    useEffect(() => {
        const k = publicationNoticeBadge
            ? `${publicationNoticeBadge.publicationDateYmd}|${publicationNoticeBadge.deadlineYmd}`
            : '';
        if (!k) {
            lastPublicationKeyRef.current = '';
            return;
        }
        if (lastPublicationKeyRef.current && lastPublicationKeyRef.current !== k) {
            setHiddenLocal((prev) => {
                const next = prev.filter((id) => id !== 'publication_notice');
                saveHidden(executionId, next);
                return next;
            });
        }
        lastPublicationKeyRef.current = k;
    }, [executionId, publicationNoticeBadge]);

    useEffect(() => {
        const k = taklifAssignmentBadge
            ? `${taklifAssignmentBadge.notifyDateYmd}|${taklifAssignmentBadge.deadlineYmd}|${taklifAssignmentBadge.phase}|${
                  taklifAssignmentBadge.cycleGeneration ?? 0
              }`
            : '';
        if (!k) {
            lastTaklifKeyRef.current = '';
            return;
        }
        if (lastTaklifKeyRef.current && lastTaklifKeyRef.current !== k) {
            setHiddenLocal((prev) => {
                const next = prev.filter((id) => id !== 'taklif_attendance');
                saveHidden(executionId, next);
                return next;
            });
        }
        lastTaklifKeyRef.current = k;
    }, [executionId, taklifAssignmentBadge]);

    useEffect(() => {
        if (openId !== 'guarantor_followup') return;
        const g = executionData?.guarantor_followup;
        setGuarantorNameDraft(g?.guarantor_name?.trim() ?? '');
        setGuarantorWorkplaceDraft(g?.guarantor_workplace?.trim() ?? '');
        setGuarantorSalaryDraft(
            g?.guarantor_salary_iqd != null && !Number.isNaN(Number(g.guarantor_salary_iqd))
                ? String(g.guarantor_salary_iqd)
                : ''
        );
        setGuarantorDeductionDraft(
            g?.guarantor_deduction_iqd != null && !Number.isNaN(Number(g.guarantor_deduction_iqd))
                ? String(g.guarantor_deduction_iqd)
                : ''
        );
    }, [openId, executionData?.guarantor_followup]);

    useEffect(() => {
        if (openId !== 'guarantor_followup') return;
        const timer = window.setTimeout(() => {
            if (!guarantorNameDraft.trim()) {
                guarantorNameInputRef.current?.focus();
                return;
            }
            if (!guarantorWorkplaceDraft.trim()) {
                guarantorWorkInputRef.current?.focus();
                return;
            }
            if (!guarantorSalaryDraft.trim()) {
                guarantorSalaryInputRef.current?.focus();
                return;
            }
            if (!guarantorDeductionDraft.trim()) {
                guarantorDeductionInputRef.current?.focus();
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [
        openId,
        guarantorNameDraft,
        guarantorWorkplaceDraft,
        guarantorSalaryDraft,
        guarantorDeductionDraft,
    ]);

    const baseDefs = useMemo(
        () =>
            buildPartyBadgeDefinitions({
                party,
                isPrimaryDebtor,
                executionData,
                activeCoerciveActions,
                seizedAssets,
                realEstateSeizureAssets,
                thirdPartySeizureAssets,
                standaloneExecutionMarks,
                timelineEvents,
                hasGuarantor,
                memoBadge: null,
                absenceBadge: null,
                showSummonsBadge: false,
                debtorArrested,
                forcedAttendancePending,
                personalCoerciveDecisionBadges,
                decisionsExecutionId: executionId,
                decisionsReloadEpoch,
                activeDebtorKey,
                primaryDebtorKey,
                onWithdrawTravelBan: isHistoricalMode ? undefined : onWithdrawTravelBan,
                debtorIsEmployee,
            }),
        [
            party,
            isPrimaryDebtor,
            executionData,
            debtorIsEmployee,
            activeCoerciveActions,
            seizedAssets,
            realEstateSeizureAssets,
            thirdPartySeizureAssets,
            standaloneExecutionMarks,
            timelineEvents,
            hasGuarantor,
            isHistoricalMode,
            onWithdrawTravelBan,
            debtorArrested,
            forcedAttendancePending,
            personalCoerciveDecisionBadges,
            executionId,
            decisionsReloadEpoch,
            activeDebtorKey,
            primaryDebtorKey,
        ]
    );

    const extraDefs = useMemo(() => {
        const extra: PartyInteractiveBadge[] = [];
        const nowMs = Date.now();
        const isAttendedGlobal =
            Boolean(debtorAttendedVoluntarilyProp ?? executionData?.debtorAttendedVoluntarily) ||
            (voluntaryAttendanceCountProp ?? executionData?.voluntaryAttendanceCount ?? 0) > 0;
        const dossierUpdatedAt = String(executionData?.updatedAt ?? '').trim();
        const isOneDayPassedFrom = (isoOrYmd: string): boolean => {
            const s = String(isoOrYmd || '').trim();
            if (!s) return false;
            const d = s.includes('T') ? new Date(s) : parseLocalNotificationDate(s);
            if (Number.isNaN(d.getTime())) return false;
            return nowMs - d.getTime() >= 24 * 60 * 60 * 1000;
        };
        const hasNewRequestSince = (periodEndedAt?: string): boolean => {
            const p = String(periodEndedAt ?? '').trim();
            if (!p || !dossierUpdatedAt) return false;
            const a = new Date(dossierUpdatedAt);
            const b = new Date(p);
            if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
            return a.getTime() - b.getTime() > 2000;
        };
        const shouldShowStrict = (opts: {
            isAttended: boolean;
            isPeriodEnded: boolean;
            periodEndedAt?: string;
            isBadgeManuallyHidden: boolean;
            isOneDayPassed: boolean;
        }): boolean => {
            if (opts.isAttended) return false;
            if (opts.isPeriodEnded) return !hasNewRequestSince(opts.periodEndedAt);
            if (opts.isBadgeManuallyHidden) return false;
            if (opts.isOneDayPassed) return false;
            return true;
        };
        const suppressAbsenceCoercive =
            party === 'debtor' && isPrimaryDebtor
                ? resolvePrimaryDebtorCoerciveStack({
                      executionData,
                      decisionsExecutionId: executionId,
                      personalCoerciveDecisionBadges,
                      debtorArrested,
                      forcedAttendancePending,
                      activeDebtorKey,
                      primaryDebtorKey,
                  }).suppressDebtorAbsence
                : false;
        if (party === 'debtor' && isPrimaryDebtor && memoBadge) {
            extra.push({
                id: 'memo_notice',
                shortLabel: 'تبليغ بالمذكرة',
                Icon: FileText,
                tone: memoBadge.graceExpired ? 'amber' : 'emerald',
                dismissMode: 'local',
                onActivate: onMemoActivate,
                detailLines: [
                    { k: 'مرجع التاريخ', v: memoBadge.anchor },
                    {
                        k: 'المتبقي',
                        v: memoBadge.graceExpired ? 'انتهت المهلة' : `${memoBadge.remaining} يوماً`,
                    },
                ],
            });
        }
        if (party === 'debtor' && publicationNoticeBadge) {
            const isPeriodEnded = Boolean(String(publicationNoticeBadge.periodEndedAt ?? '').trim());
            const isBadgeManuallyHidden = Boolean(String(publicationNoticeBadge.badgeHiddenAt ?? '').trim());
            const recordedAt = String(publicationNoticeBadge.recordedAt ?? '').trim();
            const isOneDayPassed = recordedAt ? isOneDayPassedFrom(recordedAt) : false;
            if (
                shouldShowStrict({
                    isAttended: false,
                    isPeriodEnded,
                    periodEndedAt: publicationNoticeBadge.periodEndedAt,
                    isBadgeManuallyHidden,
                    isOneDayPassed,
                })
            ) {
                extra.push({
                    id: 'publication_notice',
                    shortLabel: 'مُبلَّغ بالصحف',
                    Icon: Newspaper,
                    tone: publicationNoticeBadge.graceExpired ? 'amber' : 'violet',
                    dismissMode: 'callback',
                    onDismiss: onDismissPublicationNoticeBadge,
                    onActivate: onPublicationNoticeActivate,
                    detailLines: [
                        { k: 'تاريخ النشر', v: publicationNoticeBadge.publicationDateYmd },
                        { k: 'الجريدة ١', v: publicationNoticeBadge.newspaper1 },
                        { k: 'الجريدة ٢', v: publicationNoticeBadge.newspaper2 },
                        {
                            k: 'آخر يوم للمدة',
                            v: publicationNoticeBadge.deadlineYmd,
                        },
                        {
                            k: 'المتبقي',
                            v: publicationNoticeBadge.graceExpired
                                ? 'انتهت المدة'
                                : `${publicationNoticeBadge.remaining} يوماً`,
                        },
                    ],
                });
            }
        }
        if (
            party === 'debtor' &&
            isPrimaryDebtor &&
            absenceBadge &&
            !suppressAbsenceCoercive &&
            !isAttendedGlobal
        ) {
            extra.push({
                id: 'debtor_absence',
                shortLabel: 'عدم حضور المدين',
                Icon: UserX,
                tone: 'rose',
                dismissMode: 'callback',
                onDismiss: onDismissAbsence,
                detailLines: [
                    {
                        k: 'الوصف',
                        v: 'بعد إعلان انتهاء المدة الرضائية دون حضور — راجع مسار التبليغ اللاحق',
                    },
                ],
            });
        }
        if (party === 'debtor' && showSummonsBadge && regularTablighBadge) {
            const isPeriodEnded = Boolean(String(regularTablighBadge.periodEndedAt ?? '').trim());
            const isBadgeManuallyHidden = Boolean(String(regularTablighBadge.badgeHiddenAt ?? '').trim());
            const recordedAt = String(regularTablighBadge.recordedAt ?? '').trim();
            const isOneDayPassed = recordedAt ? isOneDayPassedFrom(recordedAt) : false;
            if (
                shouldShowStrict({
                    isAttended: false,
                    isPeriodEnded,
                    periodEndedAt: regularTablighBadge.periodEndedAt,
                    isBadgeManuallyHidden,
                    isOneDayPassed,
                })
            ) {
                extra.push({
                    id: 'summons_attendance',
                    shortLabel: 'مُبلَّغ',
                    Icon: Bell,
                    tone: 'indigo',
                    dismissMode: 'callback',
                    onDismiss: onDismissRegularTablighBadge,
                    onActivate: onSummonsActivate,
                    detailLines: [
                        {
                            k: 'تاريخ التبليغ',
                            v: formatDateAr(regularTablighBadge.noticeDateYmd),
                        },
                        { k: 'الغاية', v: regularTablighBadge.purpose.trim() || 'تبليغ' },
                    ],
                });
            }
        }
        if (party === 'debtor' && taklifAssignmentBadge) {
            const tb = taklifAssignmentBadge;
            const isPeriodEnded =
                Boolean(String(tb.periodEndedAt ?? '').trim()) || tb.phase === 'absent_declared';
            const isBadgeManuallyHidden = Boolean(String(tb.badgeHiddenAt ?? '').trim());
            const confirmedAt = String(tb.confirmedAt ?? '').trim();
            const isOneDayPassed = confirmedAt ? isOneDayPassedFrom(confirmedAt) : false;
            if (
                shouldShowStrict({
                    isAttended: false,
                    isPeriodEnded,
                    periodEndedAt: tb.periodEndedAt,
                    isBadgeManuallyHidden,
                    isOneDayPassed,
                })
            ) {
                const phaseAr =
                    tb.phase === 'active'
                        ? 'تكليف سارٍ'
                        : tb.phase === 'absent_declared'
                          ? 'عدم حضور — متابعة مفاتحة/تنفيذ'
                          : tb.phase === 'investigation_pending'
                            ? 'مفاتحة التحقيق قيد البتّ'
                            : 'أمر قبض — إحضار أو إنهاء';
                const remAr =
                    tb.remainingDays === null
                        ? '—'
                        : tb.remainingDays === 0
                          ? 'انتهت المدة التقويمية'
                          : `${tb.remainingDays} يوماً`;
                extra.push({
                    id: 'taklif_attendance',
                    shortLabel: 'مكلف بالحضور',
                    Icon: Calendar,
                    tone: 'amber',
                    dismissMode: 'callback',
                    onDismiss: onDismissTaklifAssignmentBadge,
                    onActivate: onTaklifAssignmentActivate,
                    detailLines: [
                        { k: 'الغاية', v: tb.purpose.trim() || '—' },
                        { k: 'تاريخ التكليف', v: formatDateAr(tb.notifyDateYmd) },
                        { k: 'آخر أجل للمدة', v: formatDateAr(tb.deadlineYmd) },
                        { k: 'المتبقي', v: remAr },
                        { k: 'المرحلة', v: phaseAr },
                        ...(typeof tb.durationDays === 'number' && tb.durationDays > 0
                            ? [{ k: 'المدة', v: `${tb.durationDays} يوماً` }]
                            : []),
                        ...(typeof tb.cycleGeneration === 'number' && tb.cycleGeneration > 0
                            ? [{ k: 'دورة التكليف', v: String(tb.cycleGeneration) }]
                            : []),
                    ],
                });
            }
        }

        if (party === 'debtor' && isPrimaryDebtor && evictionGraceBadge) {
            extra.push({
                id: 'eviction_grace',
                shortLabel: 'المهلة',
                Icon: Timer,
                tone: 'sky',
                dismissMode: 'callback',
                dismissLabel: 'إتمام المهلة',
                dismissVariant: 'complete',
                onDismiss: onCompleteEvictionGrace,
                onActivate: onEvictionGraceActivate,
                detailLines: [
                    { k: 'من', v: evictionGraceBadge.startYmd },
                    { k: 'إلى', v: evictionGraceBadge.endYmd },
                    { k: 'المدة', v: `${evictionGraceBadge.daysTotal} يوماً` },
                    { k: 'المتبقي', v: `${Math.max(0, evictionGraceBadge.remainingDays)} يوماً` },
                ],
            });
        }

        if (party === 'debtor' && isPrimaryDebtor && policeAssistanceBadge) {
            extra.push({
                id: 'eviction_police_assistance',
                shortLabel: 'القوة الجبرية',
                Icon: Shield,
                tone: 'amber',
                dismissMode: 'callback',
                dismissLabel: 'إتمام الطلب',
                dismissVariant: 'complete',
                onDismiss: onCompletePoliceAssistance,
                onActivate: onPoliceAssistanceActivate,
                detailLines: [
                    { k: 'الجهة المرافقة', v: policeAssistanceBadge.agencyName || '—' },
                    ...(policeAssistanceBadge.dueYmd
                        ? [{ k: 'تاريخ المتابعة', v: policeAssistanceBadge.dueYmd }]
                        : []),
                    ...(typeof policeAssistanceBadge.remainingDays === 'number'
                        ? [{ k: 'المتبقي', v: `${Math.max(0, policeAssistanceBadge.remainingDays)} يوماً` }]
                        : []),
                ],
            });
        }
        return extra;
    }, [
        party,
        isPrimaryDebtor,
        memoBadge,
        publicationNoticeBadge,
        absenceBadge,
        showSummonsBadge,
        onMemoActivate,
        onPublicationNoticeActivate,
        onSummonsActivate,
        onDismissPublicationNoticeBadge,
        onDismissRegularTablighBadge,
        onDismissTaklifAssignmentBadge,
        onDismissAbsence,
        evictionGraceBadge,
        onEvictionGraceActivate,
        onCompleteEvictionGrace,
        policeAssistanceBadge,
        onPoliceAssistanceActivate,
        onCompletePoliceAssistance,
        executionData,
        executionId,
        debtorAttendedVoluntarilyProp,
        voluntaryAttendanceCountProp,
        personalCoerciveDecisionBadges,
        debtorArrested,
        forcedAttendancePending,
        taklifAssignmentBadge,
        onTaklifAssignmentActivate,
        activeDebtorKey,
        primaryDebtorKey,
    ]);

    const allDefs = useMemo(() => [...extraDefs, ...baseDefs], [extraDefs, baseDefs]);

    const visible = useMemo(() => {
        const dossierControlled = new Set(['summons_attendance', 'taklif_attendance', 'publication_notice']);
        const v = allDefs.filter((b) => (dossierControlled.has(b.id) ? true : !hiddenLocal.includes(b.id)));
        return [...v].sort((a, b) => {
            const pa = badgeSortOrder(a.id);
            const pb = badgeSortOrder(b.id);
            if (pa !== pb) return pa - pb;
            return a.shortLabel.localeCompare(b.shortLabel, 'ar');
        });
    }, [allDefs, hiddenLocal]);

    const hideBadge = useCallback(
        (b: PartyInteractiveBadge) => {
            if (b.dismissMode === 'callback') {
                b.onDismiss?.();
                setOpenId(null);
                return;
            }
            setHiddenLocal((prev) => {
                const next = prev.includes(b.id) ? prev : [...prev, b.id];
                saveHidden(executionId, next);
                return next;
            });
            setOpenId(null);
        },
        [executionId]
    );

    const updatePopoverPosition = useCallback(() => {
        if (!openId) {
            setPopoverPos(null);
            return;
        }
        const btn = btnRefs.current[openId];
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        const openBadgeHit = visible.find((x) => x.id === openId);
        const lineCount = openBadgeHit?.detailLines?.length ?? 0;
        const isGuarantorForm = openId === 'guarantor_followup';
        const estimatedHeight = isGuarantorForm ? 320 : Math.min(280, 88 + lineCount * 22);
        const base = computeFixedPopoverLayout(r, {
            preferredWidth: 272,
            estimatedHeight,
            gap: 4,
        });
        const el = popoverRef.current;
        if (el) {
            setPopoverPos(refinePopoverLayoutWithMeasuredHeight(base, r, el.offsetHeight, 4));
        } else {
            setPopoverPos(base);
        }
    }, [openId, visible]);

    useLayoutEffect(() => {
        if (!openId) return;
        updatePopoverPosition();
        const id = requestAnimationFrame(() => updatePopoverPosition());
        return () => cancelAnimationFrame(id);
    }, [openId, updatePopoverPosition, visible]);

    useEffect(() => {
        if (!openId) return;
        const onScrollResize = () => updatePopoverPosition();
        window.addEventListener('scroll', onScrollResize, true);
        window.addEventListener('resize', onScrollResize);
        return () => {
            window.removeEventListener('scroll', onScrollResize, true);
            window.removeEventListener('resize', onScrollResize);
        };
    }, [openId, updatePopoverPosition]);

    useEffect(() => {
        if (!openId) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpenId(null);
        };
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (rootRef.current?.contains(t)) return;
            if (popoverRef.current?.contains(t)) return;
            setOpenId(null);
        };
        const onTouch = (e: TouchEvent) => {
            const t = e.target as Node;
            if (rootRef.current?.contains(t)) return;
            if (popoverRef.current?.contains(t)) return;
            setOpenId(null);
        };
        document.addEventListener('mousedown', onDoc, true);
        document.addEventListener('touchstart', onTouch, true);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('mousedown', onDoc, true);
            document.removeEventListener('touchstart', onTouch, true);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [openId]);

    useEffect(() => {
        if (isHistoricalMode) setOpenId(null);
    }, [isHistoricalMode]);

    const openBadge = openId ? visible.find((x) => x.id === openId) : null;

    if (!executionId || visible.length === 0) return null;

    const popoverPortal =
        !isHistoricalMode &&
        openBadge &&
        popoverPos &&
        typeof document !== 'undefined' &&
        createPortal(
            <div
                ref={popoverRef}
                className="rounded-2xl border border-indigo-500/35 bg-[#0B1120]/98 backdrop-blur-xl shadow-2xl p-3.5 text-right"
                style={{
                    position: 'fixed',
                    top: popoverPos.top,
                    left: popoverPos.left,
                    width: popoverPos.width,
                    maxHeight: popoverPos.maxHeight,
                    overflowY: 'auto',
                    zIndex: BADGE_POPOVER_Z_INDEX,
                }}
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="mb-1 inline-flex rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                    onClick={() => setOpenId(null)}
                    aria-label="إغلاق"
                >
                    <X size={14} />
                </button>
                {openBadge.id === 'guarantor_followup' && onPersistGuarantorFollowup ? (
                    <div className="space-y-2 mb-3 text-right">
                        <div className="space-y-1.5">
                            <label className="block text-[9px] text-slate-500 mb-1">اسم الكفيل</label>
                            <input
                                ref={guarantorNameInputRef}
                                type="text"
                                value={guarantorNameDraft}
                                onChange={(e) => setGuarantorNameDraft(e.target.value)}
                                className="w-full rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600"
                                placeholder="اسم الكفيل"
                                dir="rtl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[9px] text-slate-500 mb-1">مكان العمل</label>
                            <input
                                ref={guarantorWorkInputRef}
                                type="text"
                                value={guarantorWorkplaceDraft}
                                onChange={(e) => setGuarantorWorkplaceDraft(e.target.value)}
                                className="w-full rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600"
                                placeholder="جهة / مكان العمل"
                                dir="rtl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[9px] text-slate-500 mb-1">الراتب (د.ع) إن وُجد</label>
                            <input
                                ref={guarantorSalaryInputRef}
                                type="text"
                                inputMode="decimal"
                                value={guarantorSalaryDraft}
                                onChange={(e) => setGuarantorSalaryDraft(formatNumberInput(e.target.value))}
                                className="w-full rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 font-mono text-right"
                                placeholder="اختياري"
                                dir="ltr"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[9px] text-slate-500 mb-1">الاستقطاع من الراتب (د.ع)</label>
                            <input
                                ref={guarantorDeductionInputRef}
                                type="text"
                                inputMode="decimal"
                                value={guarantorDeductionDraft}
                                onChange={(e) => setGuarantorDeductionDraft(formatNumberInput(e.target.value))}
                                className="w-full rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-600 font-mono text-right"
                                placeholder="اختياري"
                                dir="ltr"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const n = guarantorNameDraft.trim();
                                const w = guarantorWorkplaceDraft.trim();
                                if (!n || !w) return;
                                const parseIqd = (s: string): number | null => {
                                    const n = parseAmount(s);
                                    return Number.isFinite(n) ? n : null;
                                };
                                onPersistGuarantorFollowup(n, w, {
                                    salaryIqd: parseIqd(guarantorSalaryDraft),
                                    deductionIqd: parseIqd(guarantorDeductionDraft),
                                });
                                setOpenId(null);
                            }}
                            className="w-full rounded-lg border border-indigo-400/45 bg-gradient-to-r from-indigo-950/70 to-indigo-900/65 py-2.5 text-[10px] font-extrabold text-indigo-100 hover:from-indigo-900/80 hover:to-indigo-800/80"
                        >
                            تثبيت بجانب المدين
                        </button>
                    </div>
                ) : (
                    <ul className="space-y-1.5 text-[10px] text-slate-300 mb-3">
                        {openBadge.detailLines.map((line, li) => (
                            <li key={`${openBadge.id}-${li}-${line.k}`} className="leading-snug">
                                <span className="text-slate-500">{line.k}: </span>
                                <span className="text-slate-100">{line.v}</span>
                            </li>
                        ))}
                    </ul>
                )}
                {openBadge.onActivate &&
                    (openBadge.id === 'memo_notice' ||
                        openBadge.id === 'summons_attendance' ||
                        openBadge.id === 'taklif_attendance' ||
                        openBadge.id === 'publication_notice' ||
                        openBadge.id === 'eviction_grace' ||
                        openBadge.id === 'eviction_police_assistance') && (
                        <button
                            type="button"
                            onClick={() => {
                                openBadge.onActivate?.();
                                setOpenId(null);
                            }}
                            className="w-full mb-2 rounded-lg border border-indigo-500/35 bg-indigo-950/45 py-2 text-[10px] font-bold text-indigo-100 hover:bg-indigo-950/60"
                        >
                            {openBadge.id === 'memo_notice'
                                ? 'إدارة تواريخ المذكرة'
                                : openBadge.id === 'publication_notice'
                                  ? 'فتح مركز التبليغ والتكليف'
                                : openBadge.id === 'taklif_attendance'
                                  ? 'فتح مركز التبليغ والتكليف'
                                  : openBadge.id === 'eviction_grace'
                                    ? 'فتح المهلة'
                                    : openBadge.id === 'eviction_police_assistance'
                                      ? 'فتح القوة الجبرية'
                                      : 'مراجعة التكليف والغاية'}
                        </button>
                    )}
                {openBadge.id === 'eviction_grace' && onToggleEvictionGracePinned ? (
                    <button
                        type="button"
                        onClick={() => {
                            onToggleEvictionGracePinned();
                            setOpenId(null);
                        }}
                        className="w-full mb-2 flex flex-row-reverse items-center justify-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-950/35 py-2 text-[10px] font-bold text-amber-100 hover:bg-amber-950/50"
                    >
                        <Pin size={14} strokeWidth={2} />
                        {evictionGracePinned ? 'إلغاء تثبيت المهلة' : 'تثبيت المهلة في الحاوية'}
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={() => hideBadge(openBadge)}
                    className={`w-full flex flex-row-reverse items-center justify-center gap-1.5 rounded-lg border py-2 text-[10px] font-bold hover:brightness-110 ${
                        openBadge.dismissVariant === 'complete'
                            ? 'border-emerald-500/35 bg-emerald-950/35 text-emerald-100'
                            : 'border-rose-500/35 bg-rose-950/40 text-rose-100 hover:bg-rose-950/55'
                    }`}
                >
                    {openBadge.dismissVariant === 'complete' ? (
                        <CheckCircle size={14} strokeWidth={2} />
                    ) : (
                        <EyeOff size={14} strokeWidth={2} />
                    )}
                    {openBadge.dismissLabel || 'إخفاء الشارة من البطاقة'}
                </button>
            </div>,
            document.body
        );

    return (
        <>
            <div
                ref={rootRef}
                className={
                    embeddedInRow
                        ? `contents${isHistoricalMode ? ' pointer-events-none opacity-60' : ''}`
                        : `flex min-w-0 flex-1 flex-row-reverse flex-wrap content-start items-center justify-start gap-2${
                              isHistoricalMode ? ' pointer-events-none opacity-60' : ''
                          }`
                }
            >
                {visible.map((b) => {
                    const Icon = b.Icon;
                    return (
                        <div key={b.id} className="relative shrink-0">
                            <button
                                type="button"
                                ref={(el) => {
                                    btnRefs.current[b.id] = el;
                                }}
                                disabled={isHistoricalMode}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isHistoricalMode) return;
                                    setOpenId((id) => (id === b.id ? null : b.id));
                                }}
                                className={`${PARTY_BADGE_PILL_CLASS} ${toneRing[b.tone]}`}
                            >
                                <Icon size={PARTY_BADGE_ICON_SIZE} className="shrink-0 opacity-90" strokeWidth={2} />
                                <span className="whitespace-nowrap">{b.shortLabel}</span>
                            </button>
                        </div>
                    );
                })}
            </div>
            {popoverPortal}
        </>
    );
};
