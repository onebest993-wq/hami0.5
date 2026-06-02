import { describe, expect, it } from 'vitest';
import {
    buildCassationHistoricalBadge,
    getCassationResultFormOptions,
    normalizeCassationAppealResult,
    validateJudicialCassationResultForm,
} from './cassationJudicialForm';

describe('cassationJudicialForm', () => {
    it('normalizes legacy result keys', () => {
        expect(normalizeCassationAppealResult('confirm')).toBe('affirmation');
        expect(normalizeCassationAppealResult('quash')).toBe('quash_dismissal');
    });

    it('requires result and procedural directives for remand direction', () => {
        expect(
            validateJudicialCassationResultForm(
                { result: 'procedural_remand_direction', isObjectiveGrounds: false },
                ['d1'],
                'preparatory',
            ),
        ).toMatch(/توجيهات/);
        expect(
            validateJudicialCassationResultForm(
                {
                    result: 'procedural_remand_direction',
                    isObjectiveGrounds: false,
                    cassationDirectives: 'إعادة النظر',
                },
                ['d1'],
                'preparatory',
            ),
        ).toBeNull();
    });

    it('exposes only two simplified procedural options for preparatory decisions', () => {
        // الواجهة تَعرض «تأييد القرار» و«نقض القرار» فقط — الخيار القديم
        // `procedural_remand_direction` ما زال نوعاً صالحاً للبيانات المُخزَّنة سابقاً
        // لكنه لا يَظهر في القائمة المنسدلة بعد التبسيط.
        const opts = getCassationResultFormOptions('preparatory');
        expect(opts.map((o) => o.value)).toEqual(['procedural_affirmation', 'procedural_annulment']);
        expect(opts.map((o) => o.label)).toEqual(['تأييد القرار', 'نقض القرار']);
    });

    it('rejects dispositive result on preparatory decision type', () => {
        expect(
            validateJudicialCassationResultForm(
                { result: 'quash_dismissal', isObjectiveGrounds: true },
                ['d1'],
                'preparatory',
            ),
        ).toMatch(/تحقيقي/);
    });

    it('builds procedural remand badge with directives', () => {
        const text = buildCassationHistoricalBadge(
            {
                result: 'procedural_remand_direction',
                cassationDirectives: 'إعادة النظر في الكفالة',
            },
            () => '—',
            'قرار توقيف',
        );
        expect(text).toContain('توجيه');
        expect(text).toContain('إعادة النظر في الكفالة');
    });
});
