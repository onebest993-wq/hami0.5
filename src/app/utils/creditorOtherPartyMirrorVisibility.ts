// @ts-nocheck
import type { ExecutionFile } from '@/app/types/execution';
import {
    getDossierPresentationOutcome,
    getGoverningDossierPresentationRow,
    getPersonalCoerciveSubtypeOutcome,
    hasActivePersonalCoerciveSubtypeCard,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    isExecutiveDetentionPeriodActive,
    isForcedBringCycleResolved,
    isPersonalCoerciveCycleClosed,
    isTravelBanLaneSettled,
    isTravelBanRequestWithdrawn,
    resolveExecutiveDetentionJudgeUiOutcome,
    resolveForcedBringNeedsOutcomeUi,
    shouldShowInvestigationCourtBlock,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import { resolveAllPersonalCoerciveAppealSync } from '@/app/utils/personalCoerciveAppealSync';
import {
    resolveSeizureMatrixFromExecution,
    type SeizureMatrixButtonKey,
} from '@/app/utils/seizureMatrix';
import {
    shouldListGuarantorRequestInHiddenRequests,
    shouldShowGuarantorRequestInSeizureTab,
    shouldShowHiddenBreakInventoryRequest,
    listHiddenPersonalCoerciveCatalog,
    isEmployeeCoerciveDetentionRestricted,
    isPersonalCoerciveDetentionPathAllowedForDebtor,
    type HiddenFollowupVisibilityInput,
    type HiddenGuarantorContext,
    type HiddenPersonalCoerciveRequestKey,
} from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';
import { isCustodyRemovalExecutionClaim } from '@/app/utils/executionClaimIsolation';
import { hasActiveFinancialGuarantorFollowup } from '@/app/components/lawyer/ExecutionDashboard/components/guarantorExternalUtils';

export interface CreditorMirrorWorkflowContext {
    executionId?: string;
    executionData?: ExecutionFile | null;
    activeDebtorKey?: string;
    primaryDebtorKey?: string;
    forcedSummoningCanForce: boolean;
    hidePersonalForcedBringActivation?: boolean;
    hideDossierJudgePresentation?: boolean;
    personalTabLockedForEmployee?: boolean;
    debtRemainingIqd?: number;
    activeDebtorIsEmployee?: boolean;
    activeDebtorIsDeceased?: boolean;
    showPersonalCoerciveFollowupTab?: boolean;
}

function debtorScope(ctx: CreditorMirrorWorkflowContext) {
    return { debtorKey: ctx.activeDebtorKey, primaryDebtorKey: ctx.primaryDebtorKey };
}

function readCoerciveStates(ctx: CreditorMirrorWorkflowContext) {
    const exId = String(ctx.executionId || '').trim() || undefined;
    const scope = debtorScope(ctx);
    const ed = ctx.executionData;
    const allDecisions = exId ? readExecutorDecisionsArray(exId) : [];
    const appealSync = exId
        ? resolveAllPersonalCoerciveAppealSync({
              executionId: exId,
              allDecisions,
              executionData: ed as Record<string, unknown> | null,
              debtorKey: ctx.activeDebtorKey,
              primaryDebtorKey: ctx.primaryDebtorKey,
          })
        : null;

    const forced = getPersonalCoerciveSubtypeOutcome(exId, 'forced_bring_in', scope);
    const arrest = getPersonalCoerciveSubtypeOutcome(exId, 'arrest_warrant_investigation', scope);
    const travel = getPersonalCoerciveSubtypeOutcome(exId, 'travel_ban', scope);
    const dossier = getDossierPresentationOutcome(exId, scope);

    const outcome = String(ed?.forced_bring_in_personal_outcome ?? '').trim();
    const forcedNeedsOutcomeUi = resolveForcedBringNeedsOutcomeUi({
        forcedApproved: forced.approved,
        forcedPending: forced.pending,
        outcome: ed?.forced_bring_in_personal_outcome ?? null,
        appealBlocksFieldwork: appealSync?.forced_bring_in.blocksFieldwork,
        requestEffectivelyEnforced: appealSync?.forced_bring_in.enforced,
        appealCycleSuperseded: appealSync?.forced_bring_in.cycleSuperseded,
    });

    const forcedShowStartStrip =
        !ctx.hidePersonalForcedBringActivation &&
        !forced.pending &&
        !forced.rejected &&
        !forcedNeedsOutcomeUi &&
        !appealSync?.forced_bring_in.followupBlock &&
        !forced.alternative;

    const forcedHasExpandablePanel =
        forcedNeedsOutcomeUi ||
        forced.pending ||
        forced.rejected ||
        Boolean(appealSync?.forced_bring_in.followupBlock) ||
        Boolean(appealSync?.forced_bring_in.blocksFieldwork);

    const travelBanWithdrawn = isTravelBanRequestWithdrawn(ed);
    const travelCycleActive = hasActivePersonalCoerciveSubtypeCard(exId, 'travel_ban', scope);
    const travelLaneSettled = isTravelBanLaneSettled(ed, { travelCycleActive });
    const travelUiApproved = travel.approved && !travelLaneSettled;
    const travelBanEnforced = !travelBanWithdrawn && ed?.debtor_travel_ban_active === true;
    const debtRemainingIqd = Math.max(0, Number(ctx.debtRemainingIqd ?? 0));

    const travelShowLiftAction =
        travelUiApproved &&
        travelBanEnforced &&
        debtRemainingIqd <= 0 &&
        !travelBanWithdrawn;

    const travelShowInitialSubmit =
        !travel.alternative &&
        !travel.pending &&
        !travelUiApproved &&
        !travelBanEnforced &&
        !(travel.rejected && travelCycleActive);

    const travelShowEnforcedAwaitingDebt =
        travelUiApproved && travelBanEnforced && debtRemainingIqd > 0 && !travelBanWithdrawn;

    const travelPanelHasBody =
        travelShowLiftAction ||
        travelShowEnforcedAwaitingDebt ||
        travelShowInitialSubmit ||
        (travelUiApproved && Boolean(appealSync?.travel_ban.followupBlock)) ||
        (!travelBanWithdrawn && travelCycleActive && (travel.pending || travel.rejected));

    const dossierPhase = ed?.executive_dossier_phase ?? null;
    const fullPersonalCoerciveCycleClosed = isPersonalCoerciveCycleClosed(ed);
    const detentionReleasedAt = String(ed?.executive_detention_released_or_closed_at ?? '').trim();
    const detentionLaneEnded = fullPersonalCoerciveCycleClosed || Boolean(detentionReleasedAt);
    const dossierGoverningRow = getGoverningDossierPresentationRow(exId, scope);
    const dossierCycleActive = Boolean(dossierGoverningRow);
    const detentionActive = isExecutiveDetentionPeriodActive(ed);
    const judgeDetention = resolveExecutiveDetentionJudgeUiOutcome({
        storedOutcome: (ed?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ?? null,
        judgeRow: appealSync?.executive_detention_judge.governingRow ?? null,
    });

    const dossierIdle =
        detentionLaneEnded ||
        !dossierCycleActive ||
        (!dossier.pending &&
            !dossier.rejected &&
            !dossier.approved &&
            !dossier.alternative &&
            !detentionActive &&
            judgeDetention === null &&
            (dossierPhase === null || dossierPhase === undefined));

    const dossierExecutorApproved =
        dossierCycleActive &&
        !detentionLaneEnded &&
        dossier.approved &&
        !dossier.pending &&
        !dossier.rejected &&
        dossierPhase !== null &&
        dossierPhase !== undefined &&
        (dossierPhase === 'handed_to_judge' ||
            dossierPhase === 'judge_decided' ||
            dossierPhase === 'detention_active');

    const custodyRemovalClaimActive = isCustodyRemovalExecutionClaim(
        ed as Record<string, unknown> | null | undefined
    );
    const employeeDetentionRestricted = isEmployeeCoerciveDetentionRestricted({
        activeDebtorIsEmployee: ctx.activeDebtorIsEmployee,
        isCustodyRemovalClaim: custodyRemovalClaimActive,
    });

    const showDossierPresentationCard =
        !ctx.hideDossierJudgePresentation &&
        !employeeDetentionRestricted &&
        (dossier.pending ||
            dossier.rejected ||
            dossier.alternative ||
            dossierIdle ||
            dossierExecutorApproved ||
            (dossier.approved && Boolean(appealSync?.executive_dossier_presentation.followupBlock)));

    const showJudgeDetentionCard =
        !ctx.hideDossierJudgePresentation &&
        !employeeDetentionRestricted &&
        dossierCycleActive &&
        !detentionLaneEnded &&
        dossier.approved &&
        !dossier.pending &&
        !dossier.rejected &&
        dossierPhase !== null &&
        dossierPhase !== undefined &&
        (dossierPhase === 'handed_to_judge' ||
            dossierPhase === 'judge_decided' ||
            dossierPhase === 'detention_active' ||
            detentionActive);

    return {
        forced,
        arrest,
        forcedShowStartStrip,
        forcedHasExpandablePanel,
        travelPanelHasBody,
        showDossierPresentationCard,
        showJudgeDetentionCard,
        investigationLive: shouldShowInvestigationCourtBlock(ed, arrest),
    };
}

function isPersonalInCreditorCatalog(
    key: HiddenPersonalCoerciveRequestKey,
    flags: HiddenFollowupVisibilityInput
): boolean {
    if (flags.suppressHiddenPersonalCoerciveRequests) return false;
    if (
        !isPersonalCoerciveDetentionPathAllowedForDebtor(key, {
            activeDebtorIsEmployee: flags.activeDebtorIsEmployee,
            isCustodyRemovalClaim: flags.isCustodyRemovalClaim,
        })
    ) {
        return false;
    }
    if (key === 'executive_dossier_presentation' || key === 'executive_detention_judge') {
        if (
            flags.hidePersonalJudgePresentation ||
            isEmployeeCoerciveDetentionRestricted(flags)
        ) {
            return false;
        }
    }
    if (flags.showPersonalCoerciveFollowupTab) return true;
    return listHiddenPersonalCoerciveCatalog(flags).some((item) => item.key === key);
}

function isPersonalCoerciveLive(
    key: string,
    ctx: CreditorMirrorWorkflowContext,
    flags: HiddenFollowupVisibilityInput
): boolean {
    const pcKey = key as HiddenPersonalCoerciveRequestKey;
    if (!isPersonalInCreditorCatalog(pcKey, flags)) return false;
    if (ctx.showPersonalCoerciveFollowupTab && ctx.personalTabLockedForEmployee) return false;

    const st = readCoerciveStates(ctx);
    switch (key) {
        case 'forced_bring_in':
            return (
                st.forcedHasExpandablePanel ||
                (st.forcedShowStartStrip && ctx.forcedSummoningCanForce)
            );
        case 'travel_ban':
            return st.travelPanelHasBody;
        case 'arrest_warrant_investigation':
            return st.investigationLive;
        case 'executive_dossier_presentation':
            return st.showDossierPresentationCard;
        case 'executive_detention_judge':
            return st.showJudgeDetentionCard;
        default:
            return false;
    }
}

function isSeizureLive(
    key: SeizureMatrixButtonKey,
    ctx: CreditorMirrorWorkflowContext,
    flags: HiddenFollowupVisibilityInput
): boolean {
    if (flags.hideFollowupSeizureRequestsTab) return false;

    const matrix = resolveSeizureMatrixFromExecution({
        remainingBalanceIqd: Math.max(0, Number(ctx.debtRemainingIqd ?? 0)),
        executionData: ctx.executionData,
        activeDebtorIsEmployee: Boolean(ctx.activeDebtorIsEmployee),
    });

    if (matrix.hideSeizureTab || !matrix.showTabContentButtons || matrix.allSeizureDisabled) {
        return false;
    }

    if (key === 'salary') {
        if (!(ctx.activeDebtorIsEmployee || ctx.activeDebtorIsDeceased)) return false;
        return matrix.remainingBalanceIqd > 0 && Boolean(matrix.buttons.salary);
    }

    if (flags.hideCoerciveSeizureSalaryAndProperty && (key === 'salary' || key === 'property')) {
        return false;
    }

    return Boolean(matrix.buttons[key]);
}

function isGuarantorLive(
    entryId: string,
    flags: HiddenFollowupVisibilityInput,
    guarantorCtx: HiddenGuarantorContext,
    ctx: CreditorMirrorWorkflowContext
): boolean {
    if (entryId === 'gu-request') {
        return (
            shouldShowGuarantorRequestInSeizureTab(flags, guarantorCtx) ||
            shouldListGuarantorRequestInHiddenRequests(flags, guarantorCtx)
        );
    }

    if (!hasActiveFinancialGuarantorFollowup(guarantorCtx.executionData)) return false;
    if (flags.hideGuarantorSeizureSubTab) return false;

    return entryId === 'gu-guarantor_seizure_salary' ||
        entryId === 'gu-guarantor_seizure_property' ||
        entryId === 'gu-guarantor_seizure_movable';
}

function isSpecialFollowupLive(entryId: string, flags: HiddenFollowupVisibilityInput): boolean {
    if (entryId === 'enc-survey') return Boolean(flags.showEncroachmentRemovalRequestCards);
    if (entryId === 'sd-surveyor') return Boolean(flags.showSpecificDeliverySurveyorCard);
    if (entryId === 'sd-conversion') return Boolean(flags.showSpecificDeliveryConversionCard);
    if (entryId === 'break-inventory') return shouldShowHiddenBreakInventoryRequest(flags);
    return false;
}

function isSeizureInCreditorCatalog(
    key: SeizureMatrixButtonKey,
    ctx: CreditorMirrorWorkflowContext,
    flags: HiddenFollowupVisibilityInput
): boolean {
    if (flags.hideFollowupSeizureRequestsTab) return false;

    const matrix = resolveSeizureMatrixFromExecution({
        remainingBalanceIqd: Math.max(0, Number(ctx.debtRemainingIqd ?? 0)),
        executionData: ctx.executionData,
        activeDebtorIsEmployee: Boolean(ctx.activeDebtorIsEmployee),
    });

    if (matrix.hideSeizureTab || !matrix.showTabContentButtons || matrix.allSeizureDisabled) {
        return false;
    }

    if (key === 'salary') {
        if (!(ctx.activeDebtorIsEmployee || ctx.activeDebtorIsDeceased)) return false;
        return matrix.remainingBalanceIqd > 0 && Boolean(matrix.buttons.salary);
    }

    if (flags.hideCoerciveSeizureSalaryAndProperty && (key === 'salary' || key === 'property')) {
        return false;
    }

    return Boolean(matrix.buttons[key]);
}

/**
 * مرآة وكيل المدين — كل خيار يمكن لوكيل الدائن رؤيته في المحضر (تبويب أو طلبات مخفية)
 * وليس فقط ما له زر «نشط» في هذه اللحظة.
 */
export function isCreditorOtherPartyOptionAccessible(input: {
    entryId: string;
    hasRequest: boolean;
    mirrorWorkflow: CreditorMirrorWorkflowContext;
    flags: HiddenFollowupVisibilityInput;
    guarantorCtx: HiddenGuarantorContext;
}): boolean {
    if (input.hasRequest) return true;
    if (isCreditorOtherPartyOptionLiveNow(input)) return true;

    const { entryId, mirrorWorkflow: ctx, flags, guarantorCtx } = input;

    if (entryId.startsWith('pc-')) {
        const pcKey = entryId.slice(3) as HiddenPersonalCoerciveRequestKey;
        if (!isPersonalInCreditorCatalog(pcKey, flags)) return false;
        if (ctx.showPersonalCoerciveFollowupTab && ctx.personalTabLockedForEmployee) return false;

        switch (pcKey) {
            case 'forced_bring_in':
                return !ctx.hidePersonalForcedBringActivation;
            case 'travel_ban':
            case 'arrest_warrant_investigation':
                return true;
            case 'executive_dossier_presentation':
            case 'executive_detention_judge':
                return false;
            default:
                return false;
        }
    }

    if (entryId.startsWith('sz-debtor-')) {
        const key = entryId.slice('sz-debtor-'.length) as SeizureMatrixButtonKey;
        return isSeizureInCreditorCatalog(key, ctx, flags);
    }

    if (entryId.startsWith('gu-')) {
        if (entryId === 'gu-request') {
            return (
                shouldShowGuarantorRequestInSeizureTab(flags, guarantorCtx) ||
                shouldListGuarantorRequestInHiddenRequests(flags, guarantorCtx)
            );
        }
        if (!hasActiveFinancialGuarantorFollowup(guarantorCtx.executionData)) return false;
        if (flags.hideGuarantorSeizureSubTab) return false;
        return (
            entryId === 'gu-guarantor_seizure_salary' ||
            entryId === 'gu-guarantor_seizure_property' ||
            entryId === 'gu-guarantor_seizure_movable'
        );
    }

    return isSpecialFollowupLive(entryId, flags);
}

/** هل يظهر هذا الخيار الآن لوكيل الدائن (وليس مجرد أنه مسموح نظرياً بنوع المطالبة) */
export function isCreditorOtherPartyOptionLiveNow(input: {
    entryId: string;
    hasRequest: boolean;
    mirrorWorkflow: CreditorMirrorWorkflowContext;
    flags: HiddenFollowupVisibilityInput;
    guarantorCtx: HiddenGuarantorContext;
}): boolean {
    if (input.hasRequest) return true;

    const { entryId, mirrorWorkflow, flags, guarantorCtx } = input;

    if (entryId.startsWith('pc-')) {
        const key = entryId.slice(3);
        return isPersonalCoerciveLive(key, mirrorWorkflow, flags);
    }

    if (entryId.startsWith('sz-debtor-')) {
        const key = entryId.slice('sz-debtor-'.length) as SeizureMatrixButtonKey;
        return isSeizureLive(key, mirrorWorkflow, flags);
    }

    if (entryId.startsWith('gu-')) {
        return isGuarantorLive(entryId, flags, guarantorCtx, mirrorWorkflow);
    }

    if (entryId.startsWith('ev-') || entryId.startsWith('enc-') || entryId.startsWith('sd-')) {
        return isSpecialFollowupLive(entryId, flags);
    }

    if (entryId === 'break-inventory') {
        return isSpecialFollowupLive(entryId, flags);
    }

    return false;
}

/** للاختبار — هل دورة الإحضار الجبري مكتملة */
export function isForcedBringMirrorSettled(ed: ExecutionFile | null | undefined): boolean {
    return isForcedBringCycleResolved(ed);
}
