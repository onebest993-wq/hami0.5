import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardCoreClaimFinancialLedgerPipeline } from '../useExecutionDashboardCoreClaimFinancialLedgerPipeline';

const useDynamicExpensesMock = vi.fn();
const useFinancialComputedMock = vi.fn();
const useExecutionDashboardClaimFinancialsMock = vi.fn();
const useExecutionDashboardEvictionLawyerFeeBackfillMock = vi.fn();
const useExecutionDashboardSeizureLedgerOutcomeEffectsMock = vi.fn();
const useExecutionDashboardLedgerSyncMock = vi.fn();
const useExecutionDashboardFollowupSeizureTabsMock = vi.fn();
const resolveSeizureMatrixFromExecutionMock = vi.fn();
const resolveIsPersonalStatusExecutionClaimMock = vi.fn();

vi.mock('../../useDynamicExpenses', () => ({
    useDynamicExpenses: (...args: unknown[]) => useDynamicExpensesMock(...args),
}));

vi.mock('../../useFinancialComputed', () => ({
    useFinancialComputed: (...args: unknown[]) => useFinancialComputedMock(...args),
}));

vi.mock('../../usePostEntryHeavyComputeReady', () => ({
    usePostEntryHeavyComputeReady: () => true,
}));

vi.mock('../useExecutionDashboardClaimFinancials', () => ({
    useExecutionDashboardClaimFinancials: (...args: unknown[]) =>
        useExecutionDashboardClaimFinancialsMock(...args),
}));

vi.mock('../useExecutionDashboardDecisionAndEventSync', () => ({
    useExecutionDashboardEvictionLawyerFeeBackfill: (...args: unknown[]) =>
        useExecutionDashboardEvictionLawyerFeeBackfillMock(...args),
}));

vi.mock('../useExecutionDashboardSeizureLedgerOutcomeEffects', () => ({
    useExecutionDashboardSeizureLedgerOutcomeEffects: (...args: unknown[]) =>
        useExecutionDashboardSeizureLedgerOutcomeEffectsMock(...args),
}));

vi.mock('../useExecutionDashboardLedgerSync', () => ({
    useExecutionDashboardLedgerSync: (...args: unknown[]) =>
        useExecutionDashboardLedgerSyncMock(...args),
}));

vi.mock('../useExecutionDashboardFollowupSeizureTabs', () => ({
    useExecutionDashboardFollowupSeizureTabs: (...args: unknown[]) =>
        useExecutionDashboardFollowupSeizureTabsMock(...args),
}));

vi.mock('@/app/utils/seizureMatrix', () => ({
    resolveSeizureMatrixFromExecution: (...args: unknown[]) =>
        resolveSeizureMatrixFromExecutionMock(...args),
}));

vi.mock('../executionDashboardClaimFinancials', () => ({
    resolveIsPersonalStatusExecutionClaim: (...args: unknown[]) =>
        resolveIsPersonalStatusExecutionClaimMock(...args),
}));

describe('useExecutionDashboardCoreClaimFinancialLedgerPipeline', () => {
    it('wires financial, seizure, and followup tab contracts through explicit typed bridges', () => {
        useDynamicExpensesMock.mockReturnValue({ dynamic: true });
        useFinancialComputedMock.mockReturnValue({
            parsedDebtAmount: 800,
            parsedLawyerFees: 100,
            parsedExecutionFee: 50,
            parsedClientFees: 10,
            parsedCourtFees: 20,
            parsedDirectorateFees: 5,
            total_execution_expenses: 35,
        });

        const setUnifiedLedgerRevision = vi.fn();
        useExecutionDashboardClaimFinancialsMock.mockReturnValue({
            isNonFinancialClaim: false,
            isVisitationClaim: false,
            isMaritalFurnitureClaim: false,
            maritalFurnitureItemsForFollowup: [],
            isAlimonyClaimType: false,
            principalDebtAmount: 800,
            financialPrincipalAmount: 800,
            financialLawyerFeesAmount: 100,
            claimTypeForExecutionModule: 'financial',
            executionModuleStrategy: { useEvictionFieldProcedures: false },
            hasEvictionSignals: false,
            hasEvictionTimelineSignals: false,
            isEvictionExecutionModule: false,
            judicialCustodiansResolved: [],
            judicialCustodianSalariesExpenseIqd: 0,
            evictionCaseExpensesTotalForFinancial: 0,
            evictionLawyerFeesInTotals: 0,
            totalOwed: 900,
            unifiedLedgerRevision: 2,
            setUnifiedLedgerRevision,
            seizureMatrixLedgerParams: { principal_amount: 800 },
            debtorNotifiedForEvictionGrace: false,
            isAlimonyClaim: false,
            isHybridFeesNonMonetary: false,
            monetaryExecutionStrictPathFlag: false,
            monetaryStrictForSummoningEngine: false,
        });

        const settlementGuarantorGate = {
            pendingSettlement: null,
            settlementBreachTriggeredAt: null,
        };
        useExecutionDashboardLedgerSyncMock.mockReturnValue({
            remainingBalanceForSeizure: 700,
            settlementGuarantorGate,
        });

        const openSeizureRequestsTab = vi.fn();
        useExecutionDashboardFollowupSeizureTabsMock.mockReturnValue({
            showGuarantorInSeizureFollowupTab: false,
            effectiveFollowupSectionTabOrder: ['coercive'],
            effectiveFollowupModalTabs: [{ id: 'coercive', label: 'إجراءات' }],
            openSeizureRequestsTab,
        });

        const seizureMatrix = { hideSeizureTab: false };
        resolveSeizureMatrixFromExecutionMock.mockReturnValue(seizureMatrix);
        resolveIsPersonalStatusExecutionClaimMock.mockReturnValue(false);

        const seizureMatrixRef = { current: null };
        const executionData = {
            id: 'exec-1',
            debtors: [{ id: 'debtor-1', name: 'مدين أول' }],
        };
        const showToast = vi.fn();
        const input = {
            executionData,
            viewExecutionData: executionData,
            executionId: 'exec-1',
            claimType: 'مطالبة مالية',
            totalAmount: 1000,
            debtAmount: '800',
            lawyerFeesAmount: '100',
            executionFee: '50',
            clientFeesAmount: '10',
            courtFees: '20',
            directorateFees: '5',
            evictionCaseExpensesSum: 0,
            liabilityGroupTabsMode: false,
            activeLiabilityGroup: null,
            allDebtorRowsForLiability: [],
            activeTimelineEvents: [{ id: 't-1' }],
            decisionsStorageExecutionId: 'exec-1',
            debtorNotificationDate: '2026-07-01',
            effectiveDebtors: executionData.debtors,
            executionFileKey: 'file-key',
            decisionsReloadEpoch: 3,
            persistExecutionMergeRef: { current: null },
            executionDataRef: { current: executionData },
            setThirdPartySeizuresUi: vi.fn(),
            clearThirdPartyFundsDraft: vi.fn(),
            setTimelineEvents: vi.fn(),
            nextTimelineId: () => 'next-1',
            showToast,
            applyThirdPartySeizuresFromPatch: vi.fn(),
            pushTimelineEventRef: { current: null },
            focusSeizurePropertyInlineRef: { current: vi.fn() },
            focusSeizureMovableInlineRef: { current: vi.fn() },
            focusSeizureThirdPartyInlineRef: { current: vi.fn() },
            focusSeizureNoticeInlineRef: { current: vi.fn() },
            openSeizureRequestsTabRef: { current: vi.fn() },
            setShowCoerciveActionForm: vi.fn(),
            setSeizureDetailCompletion: vi.fn(),
            setShowUnifiedExecutionModal: vi.fn(),
            setEvictionAssetsTabUnlocked: vi.fn(),
            seizedAssetsSnapshotRef: { current: [] },
            setSeizedAssets: vi.fn(),
            setFinancialHubAutoOpenMode: vi.fn(),
            setFinancialHubSeizedMovableId: vi.fn(),
            setFinancialHubSeizedPropertyId: vi.fn(),
            openFinancialHubLedger: vi.fn(),
            debtorBrowserTabsMode: true,
            activeWorkspaceDebtorForFollowup: {
                d: executionData.debtors[0],
                key: 'debtor-1',
            },
            activeDebtorIsEmployee: false,
            docType: 'حكم',
            classification: 'financial',
            activeDebtorEntityKind: 'person',
            activeDebtorIsDeceased: false,
            followupSpecialization: {
                hideFollowupSeizureRequestsTab: false,
                hideFollowupCoerciveTab: false,
            },
            followupSectionTabOrder: ['coercive'],
            followupModalTabs: [{ id: 'coercive', label: 'إجراءات' }],
            followupTabsRestricted: false,
            restrictedFollowupTabIds: new Set<string>(),
            setUnifiedModalTab: vi.fn(),
            showUnifiedExecutionModal: true,
            unifiedModalTab: 'coercive',
            hideCoerciveTabsForDebtorAgent: false,
            showPersonalCoerciveFollowupTab: true,
            setShowSolidaryCoerciveTargetModal: vi.fn(),
            setSolidaryCoerciveActionPending: vi.fn(),
            followupModalChipTablistRef: { current: null },
            followupModalDebtorTabsRef: { current: null },
            isSolidaryLiability: false,
            allDebtorsUnified: executionData.debtors,
            seizureMatrixRef,
        };

        const { result } = renderHook(() =>
            useExecutionDashboardCoreClaimFinancialLedgerPipeline(input as never),
        );

        expect(useExecutionDashboardClaimFinancialsMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionData,
                activeTimelineEvents: [{ id: 't-1' }],
                effectiveDebtors: executionData.debtors,
            }),
        );
        expect(useExecutionDashboardSeizureLedgerOutcomeEffectsMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionDataId: 'exec-1',
                decisionsStorageExecutionId: 'exec-1',
                setShowCoerciveActionForm: input.setShowCoerciveActionForm,
            }),
        );
        expect(useExecutionDashboardFollowupSeizureTabsMock).toHaveBeenCalledWith(
            expect.objectContaining({
                remainingBalanceForSeizure: 700,
                settlementGuarantorGate,
                followupSpecialization: input.followupSpecialization,
            }),
        );
        expect(resolveSeizureMatrixFromExecutionMock).toHaveBeenCalledWith({
            remainingBalanceIqd: 700,
            executionData,
            activeDebtor: executionData.debtors[0],
            activeDebtorIsEmployee: false,
        });
        expect(seizureMatrixRef.current).toBe(seizureMatrix);
        expect(result.current.remainingBalanceForSeizure).toBe(700);
        expect(result.current.openSeizureRequestsTab).toBe(openSeizureRequestsTab);
        expect(result.current.isPersonalStatusExecutionClaim).toBe(false);
    });
});
