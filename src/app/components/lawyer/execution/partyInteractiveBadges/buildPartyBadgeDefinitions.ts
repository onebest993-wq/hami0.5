import type {
    ExecutionFile,
    RealEstateSeizureAsset,
    SeizedAsset,
    ThirdPartySeizureAsset,
    StandaloneExecutionMark,
} from '@/app/types/execution';
import { Briefcase } from '@/app/components/ui/icons/Briefcase';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { Lock } from '@/app/components/ui/icons/Lock';
import { PauseCircle } from '@/app/components/ui/icons/PauseCircle';
import { Plane } from '@/app/components/ui/icons/Plane';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';
import { TrendingUp } from '@/app/components/ui/icons/TrendingUp';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import { UserRoundX } from '@/app/components/ui/icons/UserRoundX';
import {
    isExecutiveDetentionBadgeSuppressed,
    isExecutiveDetentionPathEnforceable,
    isExecutiveDetentionPeriodActive,
    isTravelBanEnforceable,
    resolveExecutiveDetentionEffectiveJudgeOutcome,
    resolvePrimaryDebtorCoerciveStack,
} from '../coerciveStackUtils';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { getGoverningPersonalCoerciveAppealRow } from '@/app/utils/personalCoerciveAppealSync';
import {
    formatDateAr,
    findTimelineDate,
    garnishmentOfficeAr,
    isSeizedAssetActiveForBadge,
    linesForSeizedAssetPopover,
} from './badgeDisplayHelpers';
import type {
    AbsenceBadgeInfo,
    MemoBadgeInfo,
    PartyBadgeParty,
    PartyInteractiveBadge,
    TimelineLite,
} from './types';

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
                    v: formatDateAr(ed?.executive_detention_until || undefined),
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
