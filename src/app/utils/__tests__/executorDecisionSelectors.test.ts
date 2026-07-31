import { describe, expect, it } from 'vitest';
import {
    findApprovedBreakInventoryNeedingLedgerFromRows,
    findApprovedCustodianNeedingDetailsFromRows,
    findApprovedFieldVisitNeedingScheduleFromRows,
    getCreditorHeirSubstitutionRequestStatusFromRows,
    getDebtorHeirSubstitutionRequestStatusFromRows,
    hasPendingCreditorDeathOnlyReportFromRows,
    hasPendingCreditorPartyDeathRequestFromRows,
    inferExecutorDispatcherRoute,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    isGuarantorRequestDecisionRow,
    latestExecutorDecisionRow,
    mergeExecutorDecisionRows,
    pickPreferredExecutorDecisionRow,
    sortExecutorDecisionRowsNewestFirst,
} from '@/app/utils/executorDecisionSelectors';
import { stringifyCreditorPartyDeathPayload } from '@/app/utils/creditorPartyDeathPersistence';

describe('executor decision selectors', () => {
    it('classifies guarantor rows and dispatcher routes from explicit and inferred signals', () => {
        expect(
            isGuarantorRequestDecisionRow({
                id: 'guarantor_req_1',
                requestKind: 'guarantor_request',
            }),
        ).toBe(true);

        expect(
            inferExecutorDispatcherRoute({
                dispatcherRoute: 'BreakLocks',
                requestKind: 'seizure',
            }),
        ).toBe('BreakLocks');

        expect(
            inferExecutorDispatcherRoute({
                requestKind: 'seizure',
                title: 'حجز راتب المدين',
                body: 'تفاصيل الحجز',
            }),
        ).toBe('SalaryGarnishment');

        expect(
            inferExecutorDispatcherRoute({
                requestKind: 'special_followup',
                title: 'إخطار',
                body: 'تبليغ المدين',
            }),
        ).toBe('Notification');
    });

    it('distinguishes effective approval from final rejection after appeal state changes', () => {
        expect(
            isExecutorRowEffectivelyApproved({
                executorOutcome: 'approved',
            }),
        ).toBe(true);

        expect(
            isExecutorRowEffectivelyApproved({
                executorOutcome: 'rejected',
                appealResult: 'نقض القرار',
                appealWorkflowState: 'FINAL_ACCEPTED',
            }),
        ).toBe(true);

        expect(
            isExecutorRowRejectedAndFinal({
                executorOutcome: 'rejected',
                appealStatus: 'final',
            }),
        ).toBe(true);
    });

    it('finds pending executor completions from typed row arrays', () => {
        const rows = [
            {
                id: 'ignore-1',
                title: 'طلب لا يهم',
                requestKind: 'special_followup',
                executorOutcome: 'approved',
            },
            {
                id: 'field-1',
                title: 'تحديد موعد الخروج الميداني',
                requestKind: 'eviction_procedure',
                executorOutcome: 'approved',
                evictionWorkflowKey: 'field_visit_or_grace',
                executorScheduleLabel: '',
            },
            {
                id: 'break-1',
                title: 'كسر الأقفال وجرد الأثاث',
                requestKind: 'eviction_procedure',
                executorOutcome: 'approved',
                evictionWorkflowKey: 'break_inventory',
                breakInventoryFurnitureFinalizedAt: '',
            },
            {
                id: 'custodian-1',
                title: 'تنصيب حارس قضائي',
                requestKind: 'eviction_procedure',
                executorOutcome: 'approved',
                evictionWorkflowKey: 'judicial_custodian',
                judicialCustodianDetailsSavedAt: '',
            },
        ] as const;

        expect(findApprovedFieldVisitNeedingScheduleFromRows([...rows])).toEqual({
            decisionId: 'field-1',
            requestTitle: 'تحديد موعد الخروج الميداني',
        });
        expect(findApprovedBreakInventoryNeedingLedgerFromRows([...rows])).toEqual({
            decisionId: 'break-1',
            requestTitle: 'كسر الأقفال وجرد الأثاث',
        });
        expect(findApprovedCustodianNeedingDetailsFromRows([...rows])).toEqual({
            decisionId: 'custodian-1',
            requestTitle: 'تنصيب حارس قضائي',
        });
    });

    it('resolves creditor and debtor heir substitution statuses from typed decision rows', () => {
        const creditorRows = [
            {
                id: 'creditor-1',
                requestKind: 'creditor_party_death',
                creditorPartyDeathPayloadJson: stringifyCreditorPartyDeathPayload({
                    action: 'death_only',
                    creditorNameSnapshot: 'الدائن',
                    heir_names: [],
                }),
                executorOutcome: 'pending',
                date: '2026-07-01',
            },
            {
                id: 'creditor-2',
                requestKind: 'creditor_party_death',
                creditorPartyDeathPayloadJson: stringifyCreditorPartyDeathPayload({
                    action: 'heir_substitution',
                    creditorNameSnapshot: 'الدائن',
                    heir_names: ['وارث 1'],
                }),
                executorOutcome: 'approved',
                resolvedAt: '2026-07-10',
            },
        ];

        const debtorRows = [
            {
                id: 'debtor-1',
                requestKind: 'debtor_party_death',
                debtorPartyDeathPayloadJson: JSON.stringify({
                    action: 'heir_substitution',
                    debtorNameSnapshot: 'المدين',
                    heir_names: [],
                }),
                executorOutcome: 'rejected',
                appealStatus: 'final',
                resolvedAt: '2026-07-11',
                title: 'طلب — إحلال الورثة محل المدين المتوفى',
            },
        ];

        expect(hasPendingCreditorDeathOnlyReportFromRows(creditorRows)).toBe(true);
        expect(hasPendingCreditorPartyDeathRequestFromRows(creditorRows)).toBe(true);
        expect(getCreditorHeirSubstitutionRequestStatusFromRows(creditorRows)).toBe('approved');
        expect(getDebtorHeirSubstitutionRequestStatusFromRows(debtorRows)).toBe('rejected');
    });

    it('chooses and merges the best executor decision rows by resolution and recency', () => {
        const pendingOlder = {
            id: 'row-1',
            title: 'طلب قديم',
            executorOutcome: 'pending',
            date: '2026-07-01',
        };
        const approvedNewer = {
            id: 'row-1',
            title: 'طلب محسوم',
            executorOutcome: 'approved',
            resolvedAt: '2026-07-12',
        };
        const unrelated = {
            id: 'row-2',
            title: 'طلب آخر',
            executorOutcome: 'pending',
            date: '2026-07-05',
        };

        expect(pickPreferredExecutorDecisionRow(pendingOlder, approvedNewer)).toEqual(approvedNewer);
        expect(latestExecutorDecisionRow([pendingOlder, approvedNewer])).toEqual(approvedNewer);
        expect(sortExecutorDecisionRowsNewestFirst([pendingOlder, unrelated, approvedNewer])).toEqual([
            approvedNewer,
            unrelated,
            pendingOlder,
        ]);

        const { mergedRows, touched } = mergeExecutorDecisionRows(
            [pendingOlder],
            [[approvedNewer], [unrelated]],
        );

        expect(touched).toBe(true);
        expect(mergedRows).toEqual([approvedNewer, unrelated]);
    });
});
