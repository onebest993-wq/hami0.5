import { describe, expect, it } from 'vitest';
import { shouldShowGuarantorRequestInSeizureTab } from '@/app/domain/execution/followup/hiddenFollowupRequestsUtils';
import {
    canOpenSeizureRequestsTab,
    buildRestrictedFollowupTabIds,
    computeShowGuarantorInSeizureFollowupTab,
    filterSeizureFromFollowupModalTabs,
    filterSeizureFromFollowupSectionTabOrder,
    resolveOpenSeizureRequestsTabBlockedMessage,
} from '../executionDashboardFollowupSeizureTabs';

describe('executionDashboardFollowupSeizureTabs', () => {
    const approvedGuarantorData = {
        guarantor_followup: {
            executor_approved: true,
            details_saved: true,
            channel: 'financial' as const,
        },
    };

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

    it('hides guarantor from the seizure tab for financial employees even with an active guarantor', () => {
        expect(
            computeShowGuarantorInSeizureFollowupTab({
                activeDebtorIsDeceased: false,
                activeDebtorIsEmployee: true,
                viewExecutionData: approvedGuarantorData as never,
                followupSpecialization: {
                    hideAllGuarantorPresence: true,
                    isFinancialDebtCollection: true,
                    showFinancialGuarantorRequestOnly: false,
                },
                remainingBalanceForSeizure: 4_000_000,
                settlementGuarantorGate: {
                    settlementBreachTriggeredAt: '2026-01-01',
                    pendingSettlement: null,
                },
            }),
        ).toBe(false);
    });

    /**
     * **كان اسمه «keeps the kasib guarantor block on the seizure tab after the guarantor is approved»
     * ويتوقّع `true` — ولم يعد صادقاً.** تلك الكتلةُ لا تُرسم منذ `f2fdef53`: بوّابتُها
     * `shouldShowGuarantorRequestInSeizureTab` صارت `false` («مسار الكفيل أصبح شارة تسوية فقط»)، فكان
     * التوكيدُ يصف تبويباً لا يراه المحامي، والقائمةُ المخفية تُخفي حجوزَ الكفيل بناءً عليه.
     *
     * **فالتوكيدُ الآن نسبيّ:** العلَمُ هو بوّابةُ التبويب نفسُها، أُطفئت أم فُتحت — ويسقط إن عادت
     * هنا نسخةٌ مستقلّة. **وما كان يحرسه** (أن يبلغ الكاسبُ حجوزَ كفيله بعد الاعتماد) يحرسه
     * `guarantorSeizureFollowupReachability.test.tsx` باللوحتين الحقيقيتين.
     */
    it('follows the seizure-tab guarantor gate for an approved kasib guarantor', () => {
        const input = {
            activeDebtorIsDeceased: false,
            activeDebtorIsEmployee: false,
            viewExecutionData: approvedGuarantorData as never,
            followupSpecialization: {
                hideAllGuarantorPresence: false,
                isFinancialDebtCollection: true,
                showFinancialGuarantorRequestOnly: true,
            },
            remainingBalanceForSeizure: 4_000_000,
            settlementGuarantorGate: {
                settlementBreachTriggeredAt: '2026-01-01',
                pendingSettlement: null,
            },
        };
        const seizureTabGate = shouldShowGuarantorRequestInSeizureTab(
            input.followupSpecialization as Parameters<typeof shouldShowGuarantorRequestInSeizureTab>[0],
            {
                executionData: input.viewExecutionData,
                financialCenterTotalIqd: input.remainingBalanceForSeizure,
                settlementBreachTriggeredAt: input.settlementGuarantorGate.settlementBreachTriggeredAt,
                ledgerPendingSettlement: input.settlementGuarantorGate.pendingSettlement,
                activeDebtorIsDeceased: input.activeDebtorIsDeceased,
                activeDebtorIsEmployee: input.activeDebtorIsEmployee,
            },
        );
        expect(computeShowGuarantorInSeizureFollowupTab(input)).toBe(seizureTabGate);
    });

    it('does not show the amount-guarantor request for a financial kasib before settlement breach', () => {
        expect(
            computeShowGuarantorInSeizureFollowupTab({
                activeDebtorIsDeceased: false,
                activeDebtorIsEmployee: false,
                viewExecutionData: null,
                followupSpecialization: {
                    hideAllGuarantorPresence: false,
                    isFinancialDebtCollection: true,
                    showFinancialGuarantorRequestOnly: true,
                },
                remainingBalanceForSeizure: 4_000_000,
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
