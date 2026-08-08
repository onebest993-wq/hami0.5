import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { buildUnifiedSeizureLogEntries } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntries';
import * as executorQueue from '@/app/utils/executorSeizureDecisionQueue';

describe('buildUnifiedSeizureLogEntries dedup', () => {
    it('skips registry third-party row when ui seizure shares decision id', () => {
        const entries = buildUnifiedSeizureLogEntries({
            viewExecutionData: null,
            activeDebtorIsDeceased: false,
            realEstateSeizureRegistryAssets: [],
            salarySeizureRegistryAssets: [],
            movableSeizureRegistryAssets: [],
            seizedMovablesForSeizureLog: [],
            thirdPartySeizureRegistryAssets: [
                {
                    id: 'reg-1',
                    decisionRowId: 'dec-9',
                    thirdPartyName: 'بنك الرافدين',
                    status: 'waiting',
                },
            ],
            thirdPartySeizuresUi: [
                {
                    id: 'ui-1',
                    decisionRowId: 'dec-9',
                    thirdPartyName: 'بنك الرافدين',
                    status: 'notified',
                },
            ],
        });

        const thirdParty = entries.filter((e) => e.kind === 'third_party');
        expect(thirdParty).toHaveLength(1);
        expect(thirdParty[0]?.id).toBe('third_party_ui:ui-1');
    });

    it('adds movable decision row when no registry or entity exists', () => {
        const entries = buildUnifiedSeizureLogEntries({
            viewExecutionData: { id: 'ex-1' } as any,
            decisionsStorageExecutionId: 'ex-1',
            activeDebtorIsDeceased: false,
            realEstateSeizureRegistryAssets: [],
            salarySeizureRegistryAssets: [],
            movableSeizureRegistryAssets: [],
            seizedMovablesForSeizureLog: [],
            thirdPartySeizureRegistryAssets: [],
            thirdPartySeizuresUi: [],
        });

        expect(entries.some((e) => e.id.startsWith('movable_decision:'))).toBe(false);
    });

    it('includes salary draft from seizureDraftsByDecisionId', () => {
        const entries = buildUnifiedSeizureLogEntries({
            viewExecutionData: {
                id: 'ex-1',
                seizureDraftsByDecisionId: {
                    'dec-salary': {
                        id: 'draft_dec-salary',
                        type: 'طلب حجز راتب (قيد البت)',
                        status: 'pending',
                        seizureDate: '2026-08-01',
                        details: {
                            decisionRowId: 'dec-salary',
                            seizureUiKind: 'salary',
                        },
                    },
                },
            } as any,
            decisionsStorageExecutionId: 'ex-1',
            activeDebtorIsDeceased: false,
            realEstateSeizureRegistryAssets: [],
            salarySeizureRegistryAssets: [],
            movableSeizureRegistryAssets: [],
            seizedMovablesForSeizureLog: [],
            thirdPartySeizureRegistryAssets: [],
            thirdPartySeizuresUi: [],
        });

        expect(entries.some((e) => e.kind === 'salary' && e.id === 'salary:draft_dec-salary')).toBe(
            true,
        );
    });

    it('merges thirdPartySeizures from execution file into log', () => {
        const entries = buildUnifiedSeizureLogEntries({
            viewExecutionData: {
                id: 'ex-1',
                thirdPartySeizures: [
                    {
                        id: 'tps_dec-tp',
                        decisionRowId: 'dec-tp',
                        thirdPartyName: 'مصرف',
                        status: 'pending',
                        replyStatus: 'pending',
                    },
                ],
            } as any,
            decisionsStorageExecutionId: 'ex-1',
            activeDebtorIsDeceased: false,
            realEstateSeizureRegistryAssets: [],
            salarySeizureRegistryAssets: [],
            movableSeizureRegistryAssets: [],
            seizedMovablesForSeizureLog: [],
            thirdPartySeizureRegistryAssets: [],
            thirdPartySeizuresUi: [],
        });

        expect(entries.some((e) => e.id === 'third_party_ui:tps_dec-tp')).toBe(true);
    });

    describe('guarantor seizure decisions', () => {
        beforeEach(() => {
            vi.spyOn(executorQueue, 'readExecutorDecisionsArray').mockImplementation((exId) => {
                if (exId === 'ex-guarantor') {
                    return [
                        {
                            id: 'dec-g-salary',
                            requestKind: 'seizure',
                            seizureTarget: 'guarantor',
                            seizureSubtype: 'salary',
                            executorOutcome: 'approved',
                            title: 'طلب حجز راتب الكفيل',
                            resolvedAt: '2026-08-05',
                        },
                    ];
                }
                return [];
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('adds guarantor_decision entry in salary tab', () => {
            const entries = buildUnifiedSeizureLogEntries({
                viewExecutionData: {
                    id: 'ex-guarantor',
                    guarantor_followup: { guarantor_name: 'أحمد الكفيل' },
                } as any,
                decisionsStorageExecutionId: 'ex-guarantor',
                activeDebtorIsDeceased: false,
                realEstateSeizureRegistryAssets: [],
                salarySeizureRegistryAssets: [],
                movableSeizureRegistryAssets: [],
                seizedMovablesForSeizureLog: [],
                thirdPartySeizureRegistryAssets: [],
                thirdPartySeizuresUi: [],
            });

            const row = entries.find((e) => e.id === 'guarantor_decision:dec-g-salary');
            expect(row).toBeDefined();
            expect(row?.kind).toBe('salary');
            expect(row?.title).toMatch(/أحمد الكفيل|كفيل/);
        });
    });

    it('maps movable workflow statuses to Arabic labels', () => {
        const entries = buildUnifiedSeizureLogEntries({
            viewExecutionData: {
                id: 'ex-m',
                seizedMovables: [
                    { id: 'm1', status: 'no_bidders', movableDescription: 'x', seizedAtIso: '2026-08-01' },
                    { id: 'm2', status: 'initial_award', movableDescription: 'y', seizedAtIso: '2026-08-02' },
                    { id: 'm3', status: 'sold', movableDescription: 'z', seizedAtIso: '2026-08-03' },
                ],
            } as any,
            activeDebtorIsDeceased: false,
            realEstateSeizureRegistryAssets: [],
            salarySeizureRegistryAssets: [],
            movableSeizureRegistryAssets: [],
            seizedMovablesForSeizureLog: [],
            thirdPartySeizureRegistryAssets: [],
            thirdPartySeizuresUi: [],
        });

        expect(entries.find((e) => e.entityId === 'm1')?.statusLabel).toBe('لا راغب');
        expect(entries.find((e) => e.entityId === 'm2')?.statusLabel).toBe('إحالة أولية');
        expect(entries.find((e) => e.entityId === 'm3')?.statusLabel).toBe('مباع');
    });
});
