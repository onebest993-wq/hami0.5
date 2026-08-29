import { describe, expect, it } from 'vitest';
import { buildOtherPartyCreditorMirrorProps } from '../executionDashboardOtherPartyMirror';

const baseFollowupFlags = {
    hidePersonalCoerciveFollowupTab: false,
    hideFollowupCoerciveTab: false,
    hideFollowupSeizureRequestsTab: false,
    hideAllGuarantorPresence: false,
    isFinancialDebtCollection: false,
    showFinancialGuarantorRequestOnly: false,
    hidePersonalJudgePresentation: false,
    hidePersonalForcedBringActivation: false,
} as const;

describe('buildOtherPartyCreditorMirrorProps', () => {
    it('returns null when not representing debtor', () => {
        expect(
            buildOtherPartyCreditorMirrorProps({
                isRepresentingDebtor: false,
                decisionsStorageExecutionId: 'ex-1',
                executionId: 'ex-1',
                claimType: 'debt',
                followupSpecializationEffective: baseFollowupFlags,
                followupSpecialization: baseFollowupFlags,
                showPersonalCoerciveFollowupTab: true,
                showGuarantorInSeizureFollowupTab: false,
                isPersonalStatusExecutionClaim: false,
                isAlimonyClaimType: false,
                activeDebtorIsEmployee: false,
                custodyRemovalClaimActive: false,
                employeeCoerciveDetentionRestricted: false,
                remainingBalanceForSeizure: 500_000,
                viewExecutionData: null,
                settlementGuarantorGate: {
                    settlementBreachTriggeredAt: null,
                    pendingSettlement: null,
                },
                activeDebtorIsDeceased: false,
                activeDebtorKey: 'd1',
                primaryDebtorKeyResolved: 'd1',
                forcedSummoningCanForce: true,
                personalTabLockedForEmployee: false,
                remaining: 500_000,
            }),
        ).toBeNull();
    });

    it('builds mirror props with dossier presentation when balance remains', () => {
        const result = buildOtherPartyCreditorMirrorProps({
            isRepresentingDebtor: true,
            decisionsStorageExecutionId: 'ex-99',
            executionId: 'ex-99',
            claimType: 'financial',
            followupSpecializationEffective: baseFollowupFlags,
            followupSpecialization: baseFollowupFlags,
            showPersonalCoerciveFollowupTab: true,
            showGuarantorInSeizureFollowupTab: true,
            isPersonalStatusExecutionClaim: false,
            isAlimonyClaimType: false,
            activeDebtorIsEmployee: false,
            custodyRemovalClaimActive: false,
            employeeCoerciveDetentionRestricted: false,
            remainingBalanceForSeizure: 1_000_000,
            viewExecutionData: { id: 'ex-99' } as never,
            settlementGuarantorGate: {
                settlementBreachTriggeredAt: null,
                pendingSettlement: null,
            },
            activeDebtorIsDeceased: false,
            activeDebtorKey: 'debtor-a',
            primaryDebtorKeyResolved: 'debtor-a',
            forcedSummoningCanForce: false,
            personalTabLockedForEmployee: false,
            remaining: 750_000,
        });

        expect(result?.executionId).toBe('ex-99');
        expect(result?.guarantorCtx.executionData).toEqual({ id: 'ex-99' });
        expect(result?.flags.showHiddenExecutiveDossierPresentation).toBe(true);
        expect(result?.mirrorWorkflow.debtRemainingIqd).toBe(750_000);
        expect(result?.debtorAgentManualTrack).toBe(true);
    });

    it('hides dossier presentation when employee detention restricted', () => {
        const result = buildOtherPartyCreditorMirrorProps({
            isRepresentingDebtor: true,
            decisionsStorageExecutionId: undefined,
            executionId: 'ex-2',
            claimType: 'debt',
            followupSpecializationEffective: baseFollowupFlags,
            followupSpecialization: baseFollowupFlags,
            showPersonalCoerciveFollowupTab: false,
            showGuarantorInSeizureFollowupTab: false,
            isPersonalStatusExecutionClaim: true,
            isAlimonyClaimType: false,
            activeDebtorIsEmployee: true,
            custodyRemovalClaimActive: false,
            employeeCoerciveDetentionRestricted: true,
            remainingBalanceForSeizure: 200_000,
            viewExecutionData: null,
            settlementGuarantorGate: {
                settlementBreachTriggeredAt: null,
                pendingSettlement: null,
            },
            activeDebtorIsDeceased: false,
            activeDebtorKey: undefined,
            primaryDebtorKeyResolved: undefined,
            forcedSummoningCanForce: true,
            personalTabLockedForEmployee: true,
            remaining: 200_000,
        });

        expect(result?.flags.showHiddenExecutiveDossierPresentation).toBe(false);
        expect(result?.mirrorWorkflow.personalTabLockedForEmployee).toBe(true);
    });
});
