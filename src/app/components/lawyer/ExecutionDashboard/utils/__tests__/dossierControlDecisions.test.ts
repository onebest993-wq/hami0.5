import { describe, expect, it } from 'vitest';
import {
    findDossierControlDecisionRow,
    isDossierControlDecisionSettled,
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

    it('treats approved row without appliedAt as settled when no appeal followup', () => {
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
        ).toBe(true);
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

    it('findDossierControlDecisionRow ignores approved rows without appliedAt', () => {
        const approved = {
            id: 'sf_transfer_1',
            requestKind: 'special_followup',
            title: 'طلب نقل الإضبارة',
            executorOutcome: 'approved',
        };
        const row = findDossierControlDecisionRow([approved], 'transfer');
        expect(row).toBeNull();
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
