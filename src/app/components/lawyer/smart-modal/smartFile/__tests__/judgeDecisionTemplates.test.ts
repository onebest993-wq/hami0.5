import { describe, expect, it } from 'vitest';
import {
    addJudgeDecisionTemplate,
    normalizeJudgeDecisionTemplate,
    removeJudgeDecisionTemplate,
} from '../judgeDecisionTemplates';

describe('judgeDecisionTemplates', () => {
    it('normalizes and dedupes on add', () => {
        const first = addJudgeDecisionTemplate([], '  تأجيل الدعوى  ');
        expect(first).toEqual(['تأجيل الدعوى']);
        const second = addJudgeDecisionTemplate(first, 'تأجيل الدعوى');
        expect(second).toEqual(['تأجيل الدعوى']);
        const third = addJudgeDecisionTemplate(second, 'قبول الطلب');
        expect(third).toEqual(['قبول الطلب', 'تأجيل الدعوى']);
    });

    it('removes template by normalized text', () => {
        const list = ['أ', 'ب'];
        expect(removeJudgeDecisionTemplate(list, '  أ ')).toEqual(['ب']);
    });

    it('rejects empty templates', () => {
        expect(normalizeJudgeDecisionTemplate('   ')).toBe('');
        expect(addJudgeDecisionTemplate(['x'], '   ')).toEqual(['x']);
    });
});
