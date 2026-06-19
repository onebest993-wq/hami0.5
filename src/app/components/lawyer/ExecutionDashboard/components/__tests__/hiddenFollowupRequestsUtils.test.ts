import { describe, expect, it } from 'vitest';
import {
    hasAnyHiddenFollowupContent,
    isEmployeeCoerciveDetentionRestricted,
    isPersonalCoerciveDetentionPathAllowedForDebtor,
    listHiddenGuarantorCatalog,
    listHiddenPersonalCoerciveCatalog,
    shouldAlwaysShowHiddenRequestsToggle,
    shouldShowGuarantorRequestEntryCard,
    shouldShowGuarantorRequestInSeizureTab,
} from '../hiddenFollowupRequestsUtils';

const baseFlags = {
    isFinancialDebtCollection: false,
    hidePersonalCoerciveFollowupTab: false,
    hideFollowupCoerciveTab: false,
    hidePersonalJudgePresentation: false,
    hidePersonalForcedBringActivation: false,
    hideGuarantorSeizureSubTab: false,
    hideAllGuarantorPresence: false,
    forceSettlementBuriedOnly: false,
    showFinancialGuarantorRequestOnly: false,
    hideCoerciveGraceNoticeBanner: false,
    hideCoerciveFinancialBanners: false,
    hideCoerciveSeizureSalaryAndProperty: false,
    hideEncroachmentEvictionProcedureItems: false,
    showEncroachmentRemovalRequestCards: false,
    showSpecificDeliverySurveyorCard: false,
    showSpecificDeliveryConversionCard: false,
    hideEvictionCustodianProcedure: false,
    showSpecificDeliveryBreakInventoryCard: false,
    showHiddenBreakInventoryRequest: false,
    showSpecificDeliveryFieldProcedures: false,
    suppressHiddenPersonalCoerciveRequests: false,
    hideDossierFinancialTools: false,
    hideFollowupSeizureRequestsTab: false,
    showPersonalCoerciveFollowupTab: true,
    showGuarantorInSeizureTab: false,
};

const guarantorCtx = {
    executionData: null,
    financialCenterTotalIqd: 500_000,
    settlementBreachTriggeredAt: '2026-01-01',
    ledgerPendingSettlement: null,
    activeDebtorIsDeceased: false,
};

describe('hiddenFollowupRequestsUtils', () => {
    it('allows detention paths for employee on custody removal only', () => {
        expect(
            isEmployeeCoerciveDetentionRestricted({
                activeDebtorIsEmployee: true,
                isCustodyRemovalClaim: false,
            })
        ).toBe(true);
        expect(
            isEmployeeCoerciveDetentionRestricted({
                activeDebtorIsEmployee: true,
                isCustodyRemovalClaim: true,
            })
        ).toBe(false);
        expect(
            isPersonalCoerciveDetentionPathAllowedForDebtor('executive_detention_judge', {
                activeDebtorIsEmployee: true,
                isCustodyRemovalClaim: true,
            })
        ).toBe(true);
        expect(
            isPersonalCoerciveDetentionPathAllowedForDebtor('executive_detention_judge', {
                activeDebtorIsEmployee: true,
                isCustodyRemovalClaim: false,
            })
        ).toBe(false);
    });

    it('always shows toggle except for deceased debtor', () => {
        expect(shouldAlwaysShowHiddenRequestsToggle()).toBe(true);
        expect(shouldAlwaysShowHiddenRequestsToggle({ activeDebtorIsDeceased: true })).toBe(false);
    });

    it('lists personal coercive when tab is hidden', () => {
        const items = listHiddenPersonalCoerciveCatalog({
            ...baseFlags,
            showPersonalCoerciveFollowupTab: false,
        });
        expect(items.map((x) => x.key)).toContain('travel_ban');
    });

    it('hides personal coercive from buried list when main tab is visible', () => {
        const items = listHiddenPersonalCoerciveCatalog({
            ...baseFlags,
            showPersonalCoerciveFollowupTab: true,
        });
        expect(items).toHaveLength(0);
    });

    it('keeps forced bring in in buried list when other personal coercive suppressed for employee', () => {
        const items = listHiddenPersonalCoerciveCatalog({
            ...baseFlags,
            showPersonalCoerciveFollowupTab: false,
            suppressHiddenPersonalCoerciveRequests: true,
        });
        expect(items.map((x) => x.key)).toEqual(['forced_bring_in']);
    });

    it('excludes detention and investigation paths for employee debtor in buried list', () => {
        const items = listHiddenPersonalCoerciveCatalog({
            ...baseFlags,
            showPersonalCoerciveFollowupTab: false,
            activeDebtorIsEmployee: true,
            showHiddenExecutiveDossierPresentation: true,
        });
        const keys = items.map((x) => x.key);
        expect(keys).toContain('forced_bring_in');
        expect(keys).not.toContain('arrest_warrant_investigation');
        expect(keys).not.toContain('executive_dossier_presentation');
        expect(keys).not.toContain('executive_detention_judge');
    });

    it('includes full personal coercive paths for employee on custody removal claim', () => {
        const items = listHiddenPersonalCoerciveCatalog({
            ...baseFlags,
            showPersonalCoerciveFollowupTab: false,
            activeDebtorIsEmployee: true,
            isCustodyRemovalClaim: true,
            showHiddenExecutiveDossierPresentation: true,
        });
        const keys = items.map((x) => x.key);
        expect(keys).toContain('forced_bring_in');
        expect(keys).toContain('travel_ban');
        expect(keys).toContain('arrest_warrant_investigation');
        expect(keys).toContain('executive_dossier_presentation');
        expect(keys).toContain('executive_detention_judge');
    });

    it('hides guarantor seizure from buried list when shown in seizure tab (employee)', () => {
        const items = listHiddenGuarantorCatalog(
            {
                ...baseFlags,
                hideAllGuarantorPresence: true,
                showGuarantorInSeizureTab: true,
            },
            {
                ...guarantorCtx,
                executionData: {
                    guarantor_followup: { executor_approved: true, details_saved: true },
                } as never,
            }
        );
        expect(items.map((x) => x.key)).not.toContain('guarantor_seizure_salary');
        expect(items.map((x) => x.key)).not.toContain('guarantor_seizure_property');
        expect(items.map((x) => x.key)).not.toContain('guarantor_seizure_movable');
    });

    it('lists personal guarantor in hidden requests for employee debtor only', () => {
        const employeeFlags = {
            ...baseFlags,
            hideAllGuarantorPresence: true,
            isAlimonyClaim: true,
            showPersonalCoerciveFollowupTab: true,
        };
        const nonEmployeeFlags = {
            ...employeeFlags,
            hideAllGuarantorPresence: false,
        };

        expect(shouldShowGuarantorRequestEntryCard(employeeFlags, guarantorCtx)).toBe(false);
        expect(
            listHiddenGuarantorCatalog(nonEmployeeFlags, { ...guarantorCtx, activeDebtorIsEmployee: false }).map(
                (x) => x.key
            )
        ).not.toContain('guarantor_request');
        expect(
            shouldShowGuarantorRequestInSeizureTab(nonEmployeeFlags, {
                ...guarantorCtx,
                activeDebtorIsEmployee: false,
            })
        ).toBe(true);

        const employeeItems = listHiddenGuarantorCatalog(employeeFlags, {
            ...guarantorCtx,
            activeDebtorIsEmployee: true,
        });
        expect(employeeItems.map((x) => x.key)).toContain('guarantor_request');
        expect(employeeItems.filter((x) => x.key === 'guarantor_request')).toHaveLength(1);
        expect(
            shouldShowGuarantorRequestInSeizureTab(employeeFlags, {
                ...guarantorCtx,
                activeDebtorIsEmployee: true,
            })
        ).toBe(false);
        expect(hasAnyHiddenFollowupContent(employeeFlags, { ...guarantorCtx, activeDebtorIsEmployee: true })).toBe(
            true
        );
    });

    it('lists guarantor for employee when hidden from main UI', () => {
        const items = listHiddenGuarantorCatalog(
            {
                ...baseFlags,
                hideAllGuarantorPresence: true,
            },
            guarantorCtx
        );
        expect(items.map((x) => x.key)).toContain('guarantor_request');
        expect(items.filter((x) => x.key === 'guarantor_request')).toHaveLength(1);
    });

    it('detects hidden break inventory for specific delivery immovable', () => {
        expect(
            hasAnyHiddenFollowupContent(
                {
                    ...baseFlags,
                    showHiddenBreakInventoryRequest: true,
                },
                guarantorCtx
            )
        ).toBe(true);
    });

    it('detects hidden content for employee financial path', () => {
        expect(
            hasAnyHiddenFollowupContent(
                {
                    ...baseFlags,
                    isFinancialDebtCollection: true,
                    hidePersonalCoerciveFollowupTab: true,
                    hideAllGuarantorPresence: true,
                    showPersonalCoerciveFollowupTab: false,
                },
                guarantorCtx
            )
        ).toBe(true);
    });
});
