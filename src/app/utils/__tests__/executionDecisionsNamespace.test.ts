import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { executionDecisionsStorageKey } from '@/app/utils/executionStorageKeys';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import {
    buildDecisionsNamespaceSlug,
    clearDecisionsNamespaceForTests,
    ensureDecisionsNamespaceMigrated,
    executionDecisionsNamespaceStorageKey,
    readExecutorDecisionsFromActiveNamespace,
    readExecutorDecisionsUnionForExecution,
    mergeExecutorDecisionsUnionForPersist,
    pruneRedundantDecisionsStorageAliases,
    readExecutorDecisionsUnionAcrossCandidateIds,
    writeExecutorDecisionsArray,
    writeExecutorDecisionsUnionForExecution,
    flushExecutorDecisionsStorageAwait,
} from '../executionDecisionsNamespace';
import { clearDomainReconcileMarker } from '../executionDomainReconcile';

describe('executionDecisionsNamespace', () => {
    let execId: string;

    beforeEach(() => {
        setLiveAuthUserId(null);
        execId = `exec-ns-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
        clearDecisionsNamespaceForTests(execId);
        clearDomainReconcileMarker(execId);
    });

    it('writes decisions to owner-scoped key when session user is present', () => {
        setLiveAuthUserId('owner-decisions-1');
        const financialData = {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        };
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'scoped-1',
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'travel_ban',
                    executorOutcome: 'pending',
                    appealRequestOrigin: 'creditor_side',
                },
            ],
            financialData,
        );
        const finSlug = buildDecisionsNamespaceSlug('financial_debt', 'creditor_agent');
        const logical = executionDecisionsNamespaceStorageKey(execId, finSlug);
        const scoped = `${logical}:u:owner-decisions-1`;
        expect(SecureStoreService.getItemSync(scoped)).toBeTruthy();
        expect(SecureStoreService.getItemSync(logical)).toBeNull();
        const rows = readExecutorDecisionsFromActiveNamespace(execId, financialData);
        expect(rows.some((r) => String(r.id) === 'scoped-1')).toBe(true);
        setLiveAuthUserId(null);
    });

    it('builds stable namespace slug from module and perspective', () => {
        expect(buildDecisionsNamespaceSlug('financial_debt', 'creditor_agent')).toBe(
            'financial_debt__creditor_agent'
        );
        expect(buildDecisionsNamespaceSlug('visitation_personal', 'debtor_agent')).toBe(
            'visitation_personal__debtor_agent'
        );
    });

    it('migrates legacy unified decisions into active namespace bucket', () => {
        const legacyKey = executionDecisionsStorageKey(execId);
        const rows = [
            {
                id: 'sz-legacy',
                requestKind: 'seizure',
                appealRequestOrigin: 'creditor_side',
                executorOutcome: 'pending',
            },
        ];
        SecureStoreService.setItemSync(legacyKey, JSON.stringify(rows));

        const migrated = ensureDecisionsNamespaceMigrated(execId, {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        });
        expect(migrated).toBe(true);

        const active = readExecutorDecisionsFromActiveNamespace(execId, {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        });
        expect(active.map((r) => r.id)).toContain('sz-legacy');
        expect(active[0]?.domainNamespace).toBe('financial_debt__creditor_agent');

        const legacyAfter = JSON.parse(SecureStoreService.getItemSync(legacyKey) || '[]') as unknown[];
        expect(legacyAfter).toEqual([]);
    });

    it('isolates decisions when claim module context changes', () => {
        const financialData = {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        };
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'fin-1',
                    requestKind: 'seizure',
                    appealRequestOrigin: 'creditor_side',
                    executorOutcome: 'pending',
                },
            ],
            financialData
        );

        const visitationData = {
            id: execId,
            claimType: 'مشاهدة',
            classification: 'أحوال شخصية',
            creditors: [{ name: 'أم', isClient: true }],
            debtors: [{ name: 'أب' }],
        };
        const visitationRows = readExecutorDecisionsFromActiveNamespace(execId, visitationData);
        expect(visitationRows).toEqual([]);

        const finSlug = buildDecisionsNamespaceSlug('financial_debt', 'creditor_agent');
        const finKey = executionDecisionsNamespaceStorageKey(execId, finSlug);
        const finStored = JSON.parse(SecureStoreService.getItemSync(finKey) || '[]') as Array<{
            id?: string;
        }>;
        expect(finStored.map((r) => r.id)).toContain('fin-1');
    });

    it('union read merges rows from every namespace bucket for one dossier', () => {
        const financialData = {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        };
        const visitationData = {
            id: execId,
            claimType: 'مشاهدة',
            classification: 'أحوال شخصية',
            creditors: [{ name: 'أم', isClient: true }],
            debtors: [{ name: 'أب' }],
        };

        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'fin-union',
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'travel_ban',
                    executorOutcome: 'pending',
                    appealRequestOrigin: 'creditor_side',
                },
            ],
            financialData
        );
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'vis-union',
                    requestKind: 'case_expense',
                    executorOutcome: 'pending',
                    appealRequestOrigin: 'creditor_side',
                },
            ],
            visitationData
        );

        const union = readExecutorDecisionsUnionForExecution(execId, visitationData);
        expect(union.map((r) => r.id).sort()).toEqual(['fin-union', 'vis-union']);
    });

    it('union write preserves rows across namespace buckets without clobbering', () => {
        const financialData = {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        };
        const visitationData = {
            id: execId,
            claimType: 'مشاهدة',
            classification: 'أحوال شخصية',
            creditors: [{ name: 'أم', isClient: true }],
            debtors: [{ name: 'أب' }],
        };

        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'fin-persist',
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'travel_ban',
                    executorOutcome: 'pending',
                    appealRequestOrigin: 'creditor_side',
                },
            ],
            financialData
        );
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'vis-persist',
                    requestKind: 'case_expense',
                    executorOutcome: 'pending',
                    appealRequestOrigin: 'creditor_side',
                },
            ],
            visitationData
        );

        const merged = readExecutorDecisionsUnionForExecution(execId, financialData);
        const patched = merged.map((r) =>
            r.id === 'fin-persist' ? { ...r, executorOutcome: 'approved', resolvedAt: '2026-06-01' } : r
        );
        writeExecutorDecisionsUnionForExecution(execId, patched, financialData);

        const finSlug = buildDecisionsNamespaceSlug('financial_debt', 'creditor_agent');
        const visSlug = buildDecisionsNamespaceSlug('visitation_personal', 'creditor_agent');
        const finStored = JSON.parse(
            SecureStoreService.getItemSync(executionDecisionsNamespaceStorageKey(execId, finSlug)) || '[]'
        ) as Array<{ id?: string; executorOutcome?: string }>;
        const visStored = JSON.parse(
            SecureStoreService.getItemSync(executionDecisionsNamespaceStorageKey(execId, visSlug)) || '[]'
        ) as Array<{ id?: string }>;

        expect(finStored.map((r) => r.id)).toContain('fin-persist');
        expect(finStored.find((r) => r.id === 'fin-persist')?.executorOutcome).toBe('approved');
        expect(visStored.map((r) => r.id)).toContain('vis-persist');
        expect(readExecutorDecisionsUnionForExecution(execId, financialData).map((r) => r.id).sort()).toEqual(
            ['fin-persist', 'vis-persist']
        );
    });

    it('partial union write does not wipe unrelated namespace buckets', () => {
        const financialData = {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        };
        const visitationData = {
            id: execId,
            claimType: 'مشاهدة',
            classification: 'أحوال شخصية',
            creditors: [{ name: 'أم', isClient: true }],
            debtors: [{ name: 'أب' }],
        };

        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'fin-keep',
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'travel_ban',
                    executorOutcome: 'pending',
                    appealRequestOrigin: 'creditor_side',
                },
            ],
            financialData
        );
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'vis-keep',
                    requestKind: 'case_expense',
                    executorOutcome: 'pending',
                    appealRequestOrigin: 'creditor_side',
                },
            ],
            visitationData
        );

        writeExecutorDecisionsUnionForExecution(
            execId,
            [
                {
                    id: 'fin-keep',
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'travel_ban',
                    executorOutcome: 'approved',
                    appealRequestOrigin: 'creditor_side',
                    resolvedAt: '2026-06-02',
                },
            ],
            financialData
        );

        const visSlug = buildDecisionsNamespaceSlug('visitation_personal', 'creditor_agent');
        const visStored = JSON.parse(
            SecureStoreService.getItemSync(executionDecisionsNamespaceStorageKey(execId, visSlug)) ||
                '[]'
        ) as Array<{ id?: string }>;
        expect(visStored.map((r) => r.id)).toContain('vis-keep');
        expect(readExecutorDecisionsUnionForExecution(execId, visitationData).map((r) => r.id).sort()).toEqual(
            ['fin-keep', 'vis-keep']
        );
    });

    it('union write replaces namespace bucket so removed appeal copies do not reappear on reload', () => {
        const financialData = {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        };
        const parentId = 'parent-coercive';
        const copyId = 'appeal_copy_test';

        writeExecutorDecisionsUnionForExecution(
            execId,
            [
                {
                    id: parentId,
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'forced_bring_in',
                    executorOutcome: 'approved',
                    appealRequestOrigin: 'creditor_side',
                    activeAppealCopyId: copyId,
                },
                {
                    id: copyId,
                    appealSourceDecisionId: parentId,
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'forced_bring_in',
                    executorOutcome: 'approved',
                    appealRequestOrigin: 'creditor_side',
                    appealStatus: 'tamyeez_filed',
                    appealMethod: 'tamyeez',
                    appealActor: 'lawyer',
                    tamyeezDecisionNumber: 'TMZ-1',
                },
            ],
            financialData
        );

        writeExecutorDecisionsUnionForExecution(
            execId,
            [
                {
                    id: parentId,
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'forced_bring_in',
                    executorOutcome: 'approved',
                    appealRequestOrigin: 'creditor_side',
                    activeAppealCopyId: null,
                    appealStatus: 'final',
                    appealResult: 'تصديق القرار',
                    appealMethod: 'tamyeez',
                    appealActor: 'lawyer',
                    tamyeezDecisionNumber: 'TMZ-1',
                },
            ],
            financialData
        );

        const finSlug = buildDecisionsNamespaceSlug('financial_debt', 'creditor_agent');
        const finStored = JSON.parse(
            SecureStoreService.getItemSync(executionDecisionsNamespaceStorageKey(execId, finSlug)) ||
                '[]'
        ) as Array<{ id?: string; appealStatus?: string; appealResult?: string }>;
        const union = readExecutorDecisionsUnionForExecution(execId, financialData);

        expect(finStored.map((r) => r.id)).toEqual([parentId]);
        expect(union.map((r) => r.id)).toEqual([parentId]);
        expect(union[0]?.appealStatus).toBe('final');
        expect(union[0]?.appealResult).toBe('تصديق القرار');
    });

    it('merge persist keeps follow-up rows when hub saves only a new manual decision (stale React state)', () => {
        const financialData = {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        };
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'followup-seizure-1',
                    requestKind: 'seizure',
                    seizureSubtype: 'movable',
                    appealRequestOrigin: 'creditor_side',
                    executorOutcome: 'approved',
                    title: 'طلب حجز منقولات',
                },
            ],
            financialData
        );

        const manualOnly = [
            {
                id: 'manual-new-1',
                title: 'قرار منفذ يدوي',
                manualExecutorLedgerEntry: true,
                executorDecisionStatusFlag: 1,
                appealStatus: 'pending',
                date: '2026-06-25',
            },
        ];
        const merged = mergeExecutorDecisionsUnionForPersist(execId, manualOnly, financialData);
        writeExecutorDecisionsUnionForExecution(execId, merged, financialData);

        const union = readExecutorDecisionsUnionForExecution(execId, financialData);
        expect(union.map((r) => r.id).sort()).toEqual(['followup-seizure-1', 'manual-new-1']);
    });

    it('merge persist applies same-date field patches (manual appeal filing)', () => {
        const financialData = {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        };
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'manual-appeal-1',
                    title: 'قرار منفذ',
                    manualExecutorLedgerEntry: true,
                    executorDecisionStatusFlag: 1,
                    appealStatus: 'pending',
                    date: '2026-06-01',
                },
            ],
            financialData
        );

        const patched = [
            {
                id: 'manual-appeal-1',
                title: 'قرار منفذ',
                manualExecutorLedgerEntry: true,
                executorDecisionStatusFlag: 2,
                manualExecutorWorkflowPhase: 'grievance_pending',
                manualExecutorAppealKind: 'tadhallum',
                appealStatus: 'pending',
                date: '2026-06-01',
            },
        ];
        const merged = mergeExecutorDecisionsUnionForPersist(execId, patched, financialData);
        writeExecutorDecisionsUnionForExecution(execId, merged, financialData);

        const union = readExecutorDecisionsUnionForExecution(execId, financialData);
        const row = union.find((r) => r.id === 'manual-appeal-1');
        expect(row?.executorDecisionStatusFlag).toBe(2);
        expect(row?.manualExecutorWorkflowPhase).toBe('grievance_pending');
    });

    it('merge persist keeps concurrently stored row when reconcile snapshot is partial', () => {
        const financialData = {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        };
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'followup-seizure-1',
                    requestKind: 'seizure',
                    executorOutcome: 'approved',
                    appealRequestOrigin: 'creditor_side',
                    date: '2026-06-01',
                },
            ],
            financialData
        );
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'manual-new-2',
                    manualExecutorLedgerEntry: true,
                    executorDecisionStatusFlag: 1,
                    date: '2026-06-02',
                },
            ],
            financialData
        );

        const partialReconcile = [
            {
                id: 'followup-seizure-1',
                requestKind: 'seizure',
                executorOutcome: 'approved',
                appealRequestOrigin: 'creditor_side',
                date: '2026-06-01',
                appealStatus: 'pending',
            },
        ];
        const merged = mergeExecutorDecisionsUnionForPersist(execId, partialReconcile, financialData);
        writeExecutorDecisionsUnionForExecution(execId, merged, financialData);

        const union = readExecutorDecisionsUnionForExecution(execId, financialData);
        expect(union.map((r) => r.id).sort()).toEqual(['followup-seizure-1', 'manual-new-2']);
    });

    it('mergeExecutorDecisionsUnionForPersist يقرأ صفوفاً محفوظة تحت معرّف فرعي عند الحفظ بالأب', () => {
        const parentId = 'parent-merge-test';
        const childId = 'child-merge-test';
        clearDecisionsNamespaceForTests(parentId);
        clearDecisionsNamespaceForTests(childId);

        writeExecutorDecisionsArray(
            childId,
            [
                {
                    id: 'seizure_req_child',
                    title: 'حجز راتب',
                    requestKind: 'seizure',
                    executorOutcome: 'pending',
                    date: '2026-06-25',
                },
            ],
            { id: childId, parentDossierId: parentId }
        );

        const merged = mergeExecutorDecisionsUnionForPersist(
            parentId,
            [
                {
                    id: 'manual-new-parent',
                    title: 'قرار يدوي',
                    manualExecutorLedgerEntry: true,
                    date: '2026-06-25',
                },
            ],
            { id: childId, parentDossierId: parentId }
        );

        expect(merged.map((r) => r.id).sort()).toEqual(['manual-new-parent', 'seizure_req_child']);
    });

    it('pruneRedundantDecisionsStorageAliases removes child bucket when subset of parent union', () => {
        const parentId = `parent-prune-${Date.now()}`;
        const childId = `child-prune-${Date.now()}`;
        clearDecisionsNamespaceForTests(parentId);
        clearDecisionsNamespaceForTests(childId);

        const ctx = {
            id: childId,
            parentDossierId: parentId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
        };

        writeExecutorDecisionsArray(
            childId,
            [
                {
                    id: 'seizure_prune_child',
                    requestKind: 'seizure',
                    executorOutcome: 'pending',
                    date: '2026-06-25',
                },
            ],
            ctx
        );

        const childOnly = readExecutorDecisionsUnionForExecution(childId, ctx);
        expect(childOnly.map((r) => r.id)).toContain('seizure_prune_child');

        const merged = mergeExecutorDecisionsUnionForPersist(
            parentId,
            [
                {
                    id: 'manual_prune_parent',
                    manualExecutorLedgerEntry: true,
                    date: '2026-06-25',
                },
            ],
            ctx
        );
        writeExecutorDecisionsUnionForExecution(parentId, merged, ctx);

        const { prunedDossierIds } = pruneRedundantDecisionsStorageAliases(parentId, ctx);
        expect(prunedDossierIds).toContain(childId);

        const childAfter = readExecutorDecisionsUnionForExecution(childId, ctx);
        expect(childAfter).toEqual([]);

        const parentUnion = readExecutorDecisionsUnionAcrossCandidateIds(parentId, ctx);
        expect(parentUnion.map((r) => r.id).sort()).toEqual(['manual_prune_parent', 'seizure_prune_child']);
    });

    it('flushExecutorDecisionsStorageAwait awaits IndexedDB setItem for decision keys', async () => {
        const financialData = {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        };
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'admin-followup-1',
                    requestKind: 'special_followup',
                    title: 'طلب يدوي',
                    executorOutcome: 'pending',
                    payloadJson: JSON.stringify({ kind: 'manual_followup', source: 'followup_admin' }),
                },
            ],
            financialData,
        );
        const setItemSpy = vi.spyOn(SecureStoreService, 'setItem');
        await flushExecutorDecisionsStorageAwait(execId, financialData);
        expect(
            setItemSpy.mock.calls.some(([key]) => String(key).includes('_decisions_ns_')),
        ).toBe(true);
    });
});
