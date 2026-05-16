import { getPersonalCoerciveSubtypeOutcome } from '@/app/utils/executorSeizureDecisionQueue';

type PersonalCoerciveQueueState = ReturnType<typeof getPersonalCoerciveSubtypeOutcome>;

export function resolvePrimaryDebtorCoerciveStack(args: {
    executionData: any;
    decisionsExecutionId: string | undefined;
    personalCoerciveDecisionBadges: boolean;
    debtorArrested?: boolean;
    forcedAttendancePending?: boolean;
    activeDebtorKey?: string;
    primaryDebtorKey?: string;
}): {
    travelSt: PersonalCoerciveQueueState;
    detentionSt: PersonalCoerciveQueueState;
    arrestSt: PersonalCoerciveQueueState;
    forcedSt: PersonalCoerciveQueueState;
    forcedNeedsOutcome: boolean;
    detentionAbsentia: boolean;
    showArrestWarrantBadge: boolean;
    showForcedAttendance: boolean;
    suppressDebtorAbsence: boolean;
} {
    const ed = args.executionData;
    const pcDecisions = args.personalCoerciveDecisionBadges !== false;
    const decId = args.decisionsExecutionId;
    const travelSt = decId
        ? getPersonalCoerciveSubtypeOutcome(decId, 'travel_ban', {
              debtorKey: args.activeDebtorKey,
              primaryDebtorKey: args.primaryDebtorKey,
          })
        : null;
    const detentionSt = decId
        ? getPersonalCoerciveSubtypeOutcome(decId, 'executive_detention', {
              debtorKey: args.activeDebtorKey,
              primaryDebtorKey: args.primaryDebtorKey,
          })
        : null;
    const arrestSt = decId
        ? getPersonalCoerciveSubtypeOutcome(decId, 'arrest_warrant_investigation', {
              debtorKey: args.activeDebtorKey,
              primaryDebtorKey: args.primaryDebtorKey,
          })
        : null;
    const forcedSt = decId
        ? getPersonalCoerciveSubtypeOutcome(decId, 'forced_bring_in', {
              debtorKey: args.activeDebtorKey,
              primaryDebtorKey: args.primaryDebtorKey,
          })
        : null;
    const detentionAbsentia = ed?.executive_detention_request_in_absentia === true;
    const arrestStage = ed?.personal_arrest_warrant_stage;
    const warrantClearedAfterCustody = ed?.debtor_arrest_warrant_cleared_after_custody === true;

    const imprisonmentPresentSuppressesWarrant =
        !detentionAbsentia &&
        (ed?.debtor_executive_detention_active === true ||
            (pcDecisions && Boolean(detentionSt?.approved)));

    const showArrestWarrantBadge =
        !args.debtorArrested &&
        !imprisonmentPresentSuppressesWarrant &&
        (Boolean(ed?.debtor_wanted_arrest_warrant) ||
            arrestStage === 'pending_court' ||
            arrestStage === 'issued' ||
            (pcDecisions && Boolean(arrestSt?.pending)) ||
            (pcDecisions && Boolean(arrestSt?.approved) && !ed?.debtor_wanted_arrest_warrant)) &&
        !warrantClearedAfterCustody;

    const forcedOutcome = String(ed?.forced_bring_in_personal_outcome ?? '').trim();
    const forcedNeedsOutcome =
        pcDecisions && Boolean(forcedSt?.approved) && !forcedOutcome && ed?.debtorForcedToAttend !== true && ed?.debtorEvaded !== true;

    const showForcedAttendance =
        !showArrestWarrantBadge &&
        (Boolean(args.forcedAttendancePending) ||
            (pcDecisions && Boolean(forcedSt?.pending)) ||
            forcedNeedsOutcome);

    const hasTravelBanUi =
        Boolean(ed?.debtor_travel_ban_active) ||
        (pcDecisions && Boolean(travelSt?.pending)) ||
        (pcDecisions && Boolean(travelSt?.approved) && !ed?.debtor_travel_ban_active);

    const hasDetentionUi =
        Boolean(ed?.debtor_executive_detention_active) ||
        (pcDecisions && Boolean(detentionSt?.pending)) ||
        (pcDecisions && Boolean(detentionSt?.approved));

    const suppressDebtorAbsence =
        showArrestWarrantBadge ||
        showForcedAttendance ||
        Boolean(args.debtorArrested) ||
        hasTravelBanUi ||
        hasDetentionUi;

    return {
        travelSt,
        detentionSt,
        arrestSt,
        forcedSt,
        forcedNeedsOutcome,
        detentionAbsentia,
        showArrestWarrantBadge,
        showForcedAttendance,
        suppressDebtorAbsence,
    };
}
