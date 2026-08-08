import { describe, expect, it } from 'vitest';
import {
    canOpenSeizureRequestsTab,
    buildRestrictedFollowupTabIds,
    computeShowGuarantorInSeizureFollowupTab,
    filterSeizureFromFollowupModalTabs,
    filterSeizureFromFollowupSectionTabOrder,
    resolveOpenSeizureRequestsTabBlockedMessage,
} from '../executionDashboardFollowupSeizureTabs';

describe('executionDashboardFollowupSeizureTabs', () => {
    it('computeShowGuarantorInSeizureFollowupTab returns false for deceased debtor', () => {
        expect(
            computeShowGuarantorInSeizureFollowupTab({
                activeDebtorIsDeceased: true,
                activeDebtorIsEmployee: false,
                viewExecutionData: null,
                followupSpecialization: {
                    hideAllGuarantorPresence: false,
                    isFinancialDebtCollection: true,
                    showFinancialGuarantorRequestOnly: true,
                },
                remainingBalanceForSeizure: 1_000_000,
                settlementGuarantorGate: {
                    settlementBreachTriggeredAt: null,
                    pendingSettlement: null,
                },
            }),
        ).toBe(false);
    });

    it('filterSeizureFromFollowupSectionTabOrder drops seizure_requests when hidden', () => {
        const order = ['personal', 'seizure_requests', 'correspondences'] as const;
        expect(
            filterSeizureFromFollowupSectionTabOrder(order, true, false),
        ).toEqual(['personal', 'correspondences']);
    });

    it('buildRestrictedFollowupTabIds includes coercive when flag allows', () => {
        const ids = buildRestrictedFollowupTabIds({
            specialization: {
                hideFollowupCoerciveTab: false,
                hideFollowupSeizureRequestsTab: true,
                hidePersonalCoerciveFollowupTab: true,
            },
            showPersonalCoerciveFollowupTab: false,
        });
        expect(ids.has('coercive')).toBe(true);
        expect(ids.has('personal')).toBe(false);
        expect(ids.has('seizure_requests')).toBe(false);
    });

    it('filterSeizureFromFollowupModalTabs respects restricted tab ids', () => {
        const tabs = [
            { id: 'coercive', label: 'جبري' },
            { id: 'correspondences', label: 'مخاطبات' },
        ] as const;
        const restricted = new Set(['correspondences', 'admin']);
        expect(
            filterSeizureFromFollowupModalTabs(tabs, false, false, true, restricted),
        ).toEqual([{ id: 'correspondences', label: 'مخاطبات' }]);
    });

    it('canOpenSeizureRequestsTab is false when seizure tab hidden', () => {
        expect(canOpenSeizureRequestsTab({ hideSeizureTab: true }, false)).toBe(false);
        expect(canOpenSeizureRequestsTab({ hideSeizureTab: false }, false)).toBe(true);
    });

    it('resolveOpenSeizureRequestsTabBlockedMessage for government debtor', () => {
        expect(
            resolveOpenSeizureRequestsTabBlockedMessage(false, {
                hideSeizureTab: true,
                ruleId: 'rule_0_government',
            }),
        ).toContain('حكومية');
    });
});
