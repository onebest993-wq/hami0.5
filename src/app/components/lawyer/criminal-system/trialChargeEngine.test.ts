import { describe, expect, it } from 'vitest';
import {
    formatAccusationArticleBadge,
    inferCaseStageFromAccusationArticle,
    normalizeChargeModifications,
    resolveAppealCaseStage,
    validateModifyTrialChargeInput,
} from './trialChargeEngine';

describe('trialChargeEngine', () => {
    it('formats article badge label', () => {
        expect(formatAccusationArticleBadge('413')).toBe('المادة 413 عقوبات');
        expect(formatAccusationArticleBadge('المادة 405')).toBe('المادة 405 عقوبات');
    });

    it('infers misdemeanor from article 413 and felony from 405', () => {
        expect(inferCaseStageFromAccusationArticle('413', { caseStage: 'felony' })).toBe('misdemeanor');
        expect(inferCaseStageFromAccusationArticle('405', { caseStage: 'misdemeanor' })).toBe('felony');
    });

    it('switches appeal routing stage when accusation article changes', () => {
        expect(resolveAppealCaseStage('felony', '405', 'جناية')).toBe('felony');
        expect(resolveAppealCaseStage('felony', '413', 'جناية')).toBe('misdemeanor');
    });

    it('normalizes charge modifications', () => {
        const rows = normalizeChargeModifications([
            {
                id: 'm1',
                date: '2026-06-01',
                oldArticle: '405',
                newArticle: '413',
                legalReason: 'تعديل وصف — م 187',
            },
            { id: '', date: 'bad', oldArticle: '', newArticle: '', legalReason: '' },
        ]);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.newArticle).toBe('413');
    });

    it('validates modify input', () => {
        expect(
            validateModifyTrialChargeInput({ newArticle: '413', legalReason: 'قرار إعدادي' }),
        ).toBeNull();
        expect(validateModifyTrialChargeInput({ newArticle: '', legalReason: 'x' })).not.toBeNull();
    });
});
