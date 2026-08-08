/**
 * الموجة 8 — اختبارات صادقة لنجاة البيانات بعد إعادة التحميل.
 * تُحاكي إعادة فتح الإضبارة بمسح الذاكرة المؤقتة ثم إعادة القراءة من القرص.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { storageCache } from '@/app/utils/storageCache';
import {
    persistExecutionDossierBlob,
    readExecutionDossierBlob,
} from '@/app/utils/executionDossierBlobPersistence';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import {
    parseUnifiedLedgerFromStorage,
    storageKey,
} from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import {
    applyExecutionTrashLifecyclePatch,
    mergeExecutionFilesPreservingLifecycle,
} from '@/app/utils/executionLifecycleMutations';
import type { ExecutionFile } from '@/app/types/execution';
import {
    resolveMaritalFurnitureFinancialPrincipal,
    sumMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';
import { buildVisitationScheduleBundle } from '@/app/utils/visitationScheduleEngine';
import type { VisitationScheduleConfig } from '@/app/types/visitationSchedule';

function simulateAppReload(dossierId: string): void {
    storageCache.invalidate(executionStorageKey(dossierId));
}

const visitationConfig = (): VisitationScheduleConfig => ({
    decisionMode: 'viewing_pickup',
    location: 'مديرية التنفيذ',
    startTime: '10:00',
    endTime: '14:00',
    executionStartDate: '2026-06-01',
    anchorDate: '2026-06-04',
    weekDays: [4, 5],
    monthWeeks: [1, 3],
});

describe('execution reload persistence (wave 8)', () => {
    const execId = 'exec_reload_wave8';

    beforeEach(() => {
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        storageCache.clear();
    });

    it('executionPaused and timeline survive cache drop + disk read', () => {
        const timelineEvents = [
            {
                id: 'tl-resume',
                type: 'decision' as const,
                title: '▶️ استئناف التنفيذ',
                date: '2026-08-01',
                timestamp: '2026-08-01T12:00:00.000Z',
            },
        ];

        expect(
            persistExecutionDossierBlob(execId, {
                id: execId,
                executionPaused: false,
                timelineEvents,
                updatedAt: '2026-08-01T12:00:00.000Z',
            }),
        ).toBe(true);

        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.executionPaused).toBe(false);
        expect(reloaded?.timelineEvents).toEqual(timelineEvents);
    });

    it('trash marker survives lifecycle patch across reload', () => {
        persistExecutionDossierBlob(execId, {
            id: execId,
            fileNumber: '101',
            debtors: [{ name: 'مدين' }],
        });

        applyExecutionTrashLifecyclePatch(execId, '2026-07-01T00:00:00.000Z');
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.executionTrashDeletedAt).toBe('2026-07-01T00:00:00.000Z');
        expect(reloaded?.debtors?.[0]?.name).toBe('مدين');
    });

    it('marital furniture financial totals stay consistent after reload', () => {
        const items = [
            { id: 'i1', name: 'كنبة', quantity: 1, unitPriceIqd: 500_000, delivered: false },
            { id: 'i2', name: 'طاولة', quantity: 2, unitPriceIqd: 50_000, delivered: true },
        ];
        const principal = resolveMaritalFurnitureFinancialPrincipal({
            maritalFurnitureItems: items,
            maritalFurnitureDeliveryRecordedAt: '2026-06-06T12:00:00.000Z',
        });
        expect(principal).toBe(500_000);

        persistExecutionDossierBlob(execId, {
            id: execId,
            maritalFurnitureItems: items,
            maritalFurnitureDeliveryRecordedAt: '2026-06-06T12:00:00.000Z',
            furnitureValue: sumMaritalFurnitureTotal(items),
            debtAmount: principal,
            totalAmount: principal,
        });
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(resolveMaritalFurnitureFinancialPrincipal(reloaded ?? {})).toBe(principal);
        expect(reloaded?.debtAmount).toBe(principal);
        expect(reloaded?.totalAmount).toBe(principal);
    });

    it('visitation schedule bundle survives reload', () => {
        const built = buildVisitationScheduleBundle(visitationConfig());
        if ('error' in built) throw new Error(built.error);

        persistExecutionDossierBlob(execId, {
            id: execId,
            visitationSchedule: built.bundle,
        });
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.visitationSchedule?.config?.decisionMode).toBe('viewing_pickup');
        expect(reloaded?.visitationSchedule?.sessions?.length).toBeGreaterThan(0);
    });

    it('stay_of_execution patch survives reload', () => {
        const stay = {
            active: true,
            decision_number: '12',
            court_name: 'محكمة',
            next_hearing_date: '2026-09-01',
        };

        persistExecutionDossierBlob(execId, {
            id: execId,
            stay_of_execution: stay,
        });
        simulateAppReload(execId);

        expect(readExecutionDossierBlob(execId)?.stay_of_execution).toEqual(stay);
    });

    it('marital furniture delivery schedule survives reload', () => {
        persistExecutionDossierBlob(execId, {
            id: execId,
            maritalFurnitureDeliveryScheduleYmd: '2026-08-15',
            maritalFurnitureDeliveryScheduleLabel: 'موعد التسليم: 15 آب',
        });
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.maritalFurnitureDeliveryScheduleYmd).toBe('2026-08-15');
        expect(reloaded?.maritalFurnitureDeliveryScheduleLabel).toContain('15');
    });

    it('financial ledger survives reload', () => {
        const financialLedger = [
            {
                id: 'pay-1',
                date: '2026-08-01',
                type: 'payment' as const,
                amount: 250_000,
                description: 'دفعة جزئية',
                balance: 750_000,
            },
        ];

        persistExecutionDossierBlob(execId, {
            id: execId,
            financialLedger,
            paidDebt: 250_000,
        });
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.financialLedger).toEqual(financialLedger);
        expect(reloaded?.paidDebt).toBe(250_000);
    });

    it('case notes log survives reload', () => {
        const caseNotesLog = [
            {
                id: 'note-1',
                title: 'مذكرة',
                body: 'نص المذكرة',
                createdAt: '2026-08-01T09:00:00.000Z',
            },
        ];

        persistExecutionDossierBlob(execId, {
            id: execId,
            caseNotesLog,
        });
        simulateAppReload(execId);

        expect(readExecutionDossierBlob(execId)?.caseNotesLog).toEqual(caseNotesLog);
    });

    it('caseTasksPending survives reload', () => {
        const caseTasksPending = [
            {
                id: 'task-1',
                title: 'مهمة',
                status: 'pending' as const,
                dueDate: '2026-08-10',
                createdAt: '2026-08-01T09:00:00.000Z',
            },
        ];

        persistExecutionDossierBlob(execId, {
            id: execId,
            caseTasksPending,
        });
        simulateAppReload(execId);

        expect(readExecutionDossierBlob(execId)?.caseTasksPending).toEqual(caseTasksPending);
    });

    it('executionPaused true survives reload', () => {
        persistExecutionDossierBlob(execId, {
            id: execId,
            executionPaused: true,
            pauseReason: 'طلب المدين',
        });
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.executionPaused).toBe(true);
        expect(reloaded?.pauseReason).toBe('طلب المدين');
    });

    it('creditors and debtors patch survives reload', () => {
        persistExecutionDossierBlob(execId, {
            id: execId,
            creditors: [{ name: 'دائن', phone: '07701234567' }],
            debtors: [{ name: 'مدين', phone: '07801234567' }],
        });
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.creditors?.[0]?.name).toBe('دائن');
        expect(reloaded?.debtors?.[0]?.name).toBe('مدين');
    });

    it('resume execution lifecycle (paused false + timeline) survives reload', () => {
        const timelineEvents = [
            {
                id: 'tl-resume-wave8',
                type: 'decision' as const,
                title: '▶️ استئناف التنفيذ',
                description: 'تم استئناف التنفيذ بعد مراجعة الدائن',
                date: '2026-08-01',
                timestamp: '2026-08-01T12:00:00.000Z',
                source: 'التنفيذ',
            },
        ];

        persistExecutionDossierBlob(execId, {
            id: execId,
            executionPaused: false,
            timelineEvents,
        });
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.executionPaused).toBe(false);
        expect(reloaded?.timelineEvents?.[0]?.title).toContain('استئناف');
    });

    it('financial totals and file metadata survive reload', () => {
        persistExecutionDossierBlob(execId, {
            id: execId,
            fileNumber: '2042',
            fileYear: '2026',
            debtAmount: 1_500_000,
            totalAmount: 1_650_000,
            paidDebt: 200_000,
        });
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.fileNumber).toBe('2042');
        expect(reloaded?.fileYear).toBe('2026');
        expect(reloaded?.debtAmount).toBe(1_500_000);
        expect(reloaded?.totalAmount).toBe(1_650_000);
        expect(reloaded?.paidDebt).toBe(200_000);
    });

    it('seized assets registry survives reload', () => {
        const seizedAssets = [
            {
                id: 'asset-1',
                type: 'movable' as const,
                description: 'سيارة',
                estimatedValue: 12_000_000,
                seizureDate: '2026-07-01',
                status: 'seized' as const,
            },
        ];

        persistExecutionDossierBlob(execId, {
            id: execId,
            seizedAssets,
        });
        simulateAppReload(execId);

        expect(readExecutionDossierBlob(execId)?.seizedAssets).toEqual(seizedAssets);
    });

    it('specific delivery items and financialization survive reload', () => {
        const specificDeliveryItems = [
            {
                id: 'sd-1',
                name: 'مستند',
                nature: 'movable' as const,
                status: 'financialized' as const,
                financializedAmount: 500_000,
                financializedAt: '2026-07-10T10:00:00.000Z',
            },
        ];

        persistExecutionDossierBlob(execId, {
            id: execId,
            specificDeliveryItems,
            specificDeliveryFinancialized: true,
            specificDeliveryConvertedAmount: 500_000,
            specificDeliveryFinancializedAt: '2026-07-10T10:00:00.000Z',
        });
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.specificDeliveryItems).toEqual(specificDeliveryItems);
        expect(reloaded?.specificDeliveryFinancialized).toBe(true);
        expect(reloaded?.specificDeliveryConvertedAmount).toBe(500_000);
    });

    it('alimony blob snapshot survives reload', () => {
        const alimony_blob = {
            monthlyRate: 250_000,
            lastPaidYmd: '2026-07-01',
            guarantorRegistered: true,
        };

        persistExecutionDossierBlob(execId, {
            id: execId,
            isAlimony: true,
            alimony_blob,
        });
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.isAlimony).toBe(true);
        expect(reloaded?.alimony_blob).toEqual(alimony_blob);
    });

    it('seized properties registry survives reload', () => {
        const seizedProperties = [
            {
                id: 'prop-1',
                propertyNumber: '123/45',
                propertyGender: 'دار' as const,
                status: 'seized' as const,
                seizedAtIso: '2026-07-01T10:00:00.000Z',
            },
        ];

        persistExecutionDossierBlob(execId, {
            id: execId,
            seizedProperties,
        });
        simulateAppReload(execId);

        expect(readExecutionDossierBlob(execId)?.seizedProperties).toEqual(seizedProperties);
    });

    it('salary garnishment schedule survives reload', () => {
        const salary_garnishment_installment_schedule = {
            monthly_amount_iqd: 150_000,
            start_ymd: '2026-08-01',
            installments_count: 12,
        };

        persistExecutionDossierBlob(execId, {
            id: execId,
            garnishment_target: 'employer' as const,
            salary_garnishment_installment_schedule,
        });
        simulateAppReload(execId);

        const reloaded = readExecutionDossierBlob(execId);
        expect(reloaded?.garnishment_target).toBe('employer');
        expect(reloaded?.salary_garnishment_installment_schedule).toEqual(
            salary_garnishment_installment_schedule,
        );
    });

    it('custody ward delivery bundle survives reload', () => {
        const custodyWardDelivery = {
            wards: [
                {
                    wardKey: 'w1',
                    name: 'محضون',
                    appointmentYmd: '2026-08-15',
                    status: 'scheduled' as const,
                    statusAt: '2026-08-01T09:00:00.000Z',
                },
            ],
        };

        persistExecutionDossierBlob(execId, {
            id: execId,
            custodyWardDelivery,
        });
        simulateAppReload(execId);

        expect(readExecutionDossierBlob(execId)?.custodyWardDelivery).toEqual(custodyWardDelivery);
    });

    it('creditor deceased flag survives reload', () => {
        persistExecutionDossierBlob(execId, {
            id: execId,
            is_creditor_deceased: true,
        });
        simulateAppReload(execId);

        expect(readExecutionDossierBlob(execId)?.is_creditor_deceased).toBe(true);
    });

    it('pending settlement in unified ledger survives cache drop', () => {
        const ledgerKey = storageKey(execId);
        const ledgerStore = {
            lawyerFees: [],
            expenses: [],
            payments: [],
            completed: false,
            garnishment: false,
            seeded: true,
            principalSnapshot: 800_000,
            collectionRequestActive: false,
            collectionRequestedTotal: null,
            evictionLedgerActivated: false,
            pendingSettlement: {
                id: 'stl-wave8',
                amount: 200_000,
                dueDate: '2026-09-01',
                createdAt: '2026-08-01T09:00:00.000Z',
                periodStartYmd: '2026-08-01',
                tracksOngoingAlimony: false,
            },
            settlementBreachTriggeredAt: null,
            alimonyLastAccrualThroughYmd: null,
        };

        storageCache.set(ledgerKey, ledgerStore);
        storageCache.invalidate(ledgerKey);

        const reloaded = parseUnifiedLedgerFromStorage(storageCache.get(ledgerKey));
        expect(reloaded?.pendingSettlement?.amount).toBe(200_000);
        expect(reloaded?.pendingSettlement?.dueDate).toBe('2026-09-01');
    });

    it('unified funds ledger survives cache drop + disk read', () => {
        const ledgerKey = storageKey(execId);
        const ledgerStore = {
            lawyerFees: [{ id: 'lf-1', amount: 50_000, label: 'أتعاب', at: '2026-08-01T09:00:00.000Z' }],
            expenses: [],
            payments: [
                {
                    id: 'pay-1',
                    amount: 100_000,
                    at: '2026-08-01T10:00:00.000Z',
                    kind: 'partial' as const,
                    entryType: 'payment' as const,
                },
            ],
            completed: false,
            garnishment: false,
            seeded: true,
            principalSnapshot: 500_000,
            collectionRequestActive: false,
            collectionRequestedTotal: null,
            evictionLedgerActivated: false,
            pendingSettlement: null,
            settlementBreachTriggeredAt: null,
            alimonyLastAccrualThroughYmd: null,
        };

        storageCache.set(ledgerKey, ledgerStore);
        storageCache.invalidate(ledgerKey);

        const reloaded = parseUnifiedLedgerFromStorage(storageCache.get(ledgerKey));
        expect(reloaded?.payments).toHaveLength(1);
        expect(reloaded?.payments[0]?.amount).toBe(100_000);
        expect(reloaded?.principalSnapshot).toBe(500_000);
    });

    it('in-memory trash wins over stale storage on reconcile reload', () => {
        const inMemory = [
            {
                id: execId,
                executionTrashDeletedAt: '2026-07-15T00:00:00.000Z',
            },
        ] as ExecutionFile[];
        const fromStorage = [{ id: execId, fileNumber: '100' }] as ExecutionFile[];

        const merged = mergeExecutionFilesPreservingLifecycle(inMemory, fromStorage);
        expect(merged).toHaveLength(1);
        expect(merged[0]?.executionTrashDeletedAt).toBe('2026-07-15T00:00:00.000Z');
        expect(merged[0]?.fileNumber).toBe('100');
    });
});
