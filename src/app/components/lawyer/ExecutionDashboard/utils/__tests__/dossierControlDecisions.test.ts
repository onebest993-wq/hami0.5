import { describe, expect, it } from 'vitest';
import {
    findDossierControlDecisionRow,
    isDossierControlDecisionSettled,
    resolveDossierControlWorkflowPhase,
    resolveSpecialFollowupStatusLabel,
    shouldShowDossierControlExecutorStrip,
    shouldShowSpecialFollowupExecutorStrip,
} from '../dossierControlDecisions';

describe('dossierControlDecisions settlement', () => {
    it('treats approved row with specialFollowupAppliedAt as settled', () => {
        expect(
            isDossierControlDecisionSettled({
                id: 'sf_1',
                executorOutcome: 'approved',
                specialFollowupAppliedAt: '2026-06-04T12:00:00.000Z',
            })
        ).toBe(true);
    });

    it('treats approved row without appliedAt as not settled when no appeal followup', () => {
        const row = {
            id: 'sf_deleg_1',
            requestKind: 'special_followup',
            title: 'طلب الإنابة التنفيذية',
            executorOutcome: 'approved',
        };
        expect(
            isDossierControlDecisionSettled(row, {
                allDecisions: [row],
            })
        ).toBe(false);
    });

    it('resolveDossierControlWorkflowPhase tracks pending and completed cycles', () => {
        const pending = {
            id: 'sf_1',
            requestKind: 'special_followup',
            title: 'طلب نقل الإضبارة',
            executorOutcome: 'pending',
        };
        const approvedPendingApply = {
            id: 'sf_2',
            requestKind: 'special_followup',
            title: 'طلب نقل الإضبارة',
            executorOutcome: 'approved',
        };
        const completed = {
            id: 'sf_3',
            requestKind: 'special_followup',
            title: 'طلب نقل الإضبارة',
            executorOutcome: 'approved',
            specialFollowupAppliedAt: '2026-06-04T12:00:00.000Z',
        };
        expect(resolveDossierControlWorkflowPhase(pending, { allDecisions: [pending] })).toBe(
            'pending_executor'
        );
        expect(
            resolveDossierControlWorkflowPhase(approvedPendingApply, {
                allDecisions: [approvedPendingApply],
            })
        ).toBe('approved_pending_apply');
        expect(resolveDossierControlWorkflowPhase(completed, { allDecisions: [completed] })).toBe(
            'completed'
        );
    });

    it('findDossierControlDecisionRow ignores settled approved cycles', () => {
        const row = findDossierControlDecisionRow(
            [
                {
                    id: 'sf_unify_1',
                    requestKind: 'special_followup',
                    title: 'طلب توحيد الأضابير',
                    executorOutcome: 'approved',
                    specialFollowupAppliedAt: '2026-06-04T12:00:00.000Z',
                },
            ],
            'unify'
        );
        expect(row).toBeNull();
    });

    it('findDossierControlDecisionRow returns approved row without appliedAt until settled', () => {
        const approved = {
            id: 'sf_transfer_1',
            requestKind: 'special_followup',
            title: 'طلب نقل الإضبارة',
            executorOutcome: 'approved',
        };
        const row = findDossierControlDecisionRow([approved], 'transfer');
        expect(String((row as { id?: string })?.id || '')).toBe('sf_transfer_1');
    });

    it('findDossierControlDecisionRow still returns pending row', () => {
        const row = findDossierControlDecisionRow(
            [
                {
                    id: 'sf_unify_old',
                    requestKind: 'special_followup',
                    title: 'طلب توحيد الأضابير',
                    executorOutcome: 'approved',
                    specialFollowupAppliedAt: '2026-06-04T12:00:00.000Z',
                },
                {
                    id: 'sf_unify_new',
                    requestKind: 'special_followup',
                    title: 'طلب توحيد الأضابير',
                    executorOutcome: 'pending',
                },
            ],
            'unify'
        );
        expect(String((row as { id?: string })?.id || '')).toBe('sf_unify_new');
    });

    it('shouldShowDossierControlExecutorStrip is true for pending delegation request', () => {
        expect(
            shouldShowDossierControlExecutorStrip({
                executionId: 'exec_1',
                actionType: 'delegation',
                decisions: [
                    {
                        id: 'sf_deleg_pending',
                        requestKind: 'special_followup',
                        title: 'طلب الإنابة التنفيذية',
                        executorOutcome: 'pending',
                    },
                ],
            })
        ).toBe(true);
    });

    it('shouldShowDossierControlExecutorStrip is true for approved row awaiting apply', () => {
        expect(
            shouldShowDossierControlExecutorStrip({
                executionId: 'exec_1',
                actionType: 'transfer',
                decisions: [
                    {
                        id: 'sf_transfer_pending_apply',
                        requestKind: 'special_followup',
                        title: 'طلب نقل الإضبارة',
                        executorOutcome: 'approved',
                    },
                ],
            })
        ).toBe(true);
    });

    it('shouldShowDossierControlExecutorStrip is false when cycle settled', () => {
        expect(
            shouldShowDossierControlExecutorStrip({
                executionId: 'exec_1',
                actionType: 'unify',
                decisions: [
                    {
                        id: 'sf_unify_done',
                        requestKind: 'special_followup',
                        title: 'طلب توحيد الأضابير',
                        executorOutcome: 'approved',
                        specialFollowupAppliedAt: '2026-06-04T12:00:00.000Z',
                    },
                ],
            })
        ).toBe(false);
    });

    it('shouldShowSpecialFollowupExecutorStrip is true for pending admin request', () => {
        const row = {
            id: 'sf_admin_1',
            requestKind: 'special_followup',
            title: 'طلب تصحيح خطأ مادي',
            executorOutcome: 'pending',
        };
        expect(
            shouldShowSpecialFollowupExecutorStrip(row, { allDecisions: [row] })
        ).toBe(true);
        expect(resolveSpecialFollowupStatusLabel(row)).toBe('قرار المنفذ — قيد البت');
    });
});
