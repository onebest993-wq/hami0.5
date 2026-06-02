import { describe, expect, it } from 'vitest';
import {
    createTrialDepositionId,
    normalizeTrialDeposition,
    validateAddTrialDepositionInput,
} from './trialDepositionsEngine';

describe('trialDepositionsEngine', () => {
    it('normalizes deposition with comparisons and cross-exam', () => {
        const row = normalizeTrialDeposition({
            id: 'd1',
            date: '2026-05-01',
            giverType: 'witness',
            witnessName: 'أحمد',
            content: 'شهدت في المحكمة',
            comparisons: [{ id: 'c1', trialText: 'رأيته', investigationText: 'لم أره' }],
            crossExamination: [{ id: 'q1', question: 'أين كنت؟', isAsked: true, liveResponse: 'في البيت' }],
            contentHighlights: [{ start: 0, end: 5, color: 'red' }],
        });
        expect(row?.comparisons?.[0]?.investigationText).toBe('لم أره');
        expect(row?.crossExamination?.[0]?.isAsked).toBe(true);
        expect(row?.contentHighlights?.[0]?.color).toBe('red');
    });

    it('normalizes linked statement comparisons', () => {
        const row = normalizeTrialDeposition({
            id: 'd2',
            date: '2026-05-01',
            giverType: 'witness',
            witnessName: 'أحمد',
            content: 'شهدت في المحكمة',
            comparisons: [
                {
                    id: 'c2',
                    trialExcerpt: 'رأيته',
                    linkedKind: 'statement',
                    linkedId: 'st-inv-1',
                },
            ],
        });
        expect(row?.comparisons?.[0]?.linkedKind).toBe('statement');
        expect(row?.comparisons?.[0]?.linkedId).toBe('st-inv-1');
        expect(row?.comparisons?.[0]?.trialExcerpt).toBe('رأيته');
    });

    it('rejects invalid deposition', () => {
        expect(normalizeTrialDeposition({ id: '', date: 'bad', witnessName: '', content: '' })).toBeNull();
    });

    it('validates add input', () => {
        expect(
            validateAddTrialDepositionInput({
                date: '2026-05-01',
                giverType: 'witness',
                witnessName: 'علي',
                content: 'نص',
            }),
        ).toBeNull();
        expect(
            validateAddTrialDepositionInput({
                date: '',
                giverType: 'witness',
                witnessName: 'علي',
                content: 'نص',
            }),
        ).not.toBeNull();
    });

    it('creates ids', () => {
        expect(createTrialDepositionId()).toBeTruthy();
    });
});
