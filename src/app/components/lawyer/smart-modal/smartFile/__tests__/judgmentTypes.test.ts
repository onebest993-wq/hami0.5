import { describe, expect, it } from 'vitest';
import {
    addDaysYmd,
    isSulhJudgmentType,
    JUDGMENT_TYPE_SULH,
    JUDGMENT_TYPE_SULH_LEGACY,
    parseJudgmentDateInput,
    str,
} from '../judgmentTypes';

describe('judgmentTypes helpers', () => {
    it('str coerces unknown values', () => {
        expect(str('abc')).toBe('abc');
        expect(str(42)).toBe('');
        expect(str(null, 'x')).toBe('x');
    });

    it('parseJudgmentDateInput accepts YMD strings', () => {
        const d = parseJudgmentDateInput('2026-05-10');
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(4);
        expect(d.getDate()).toBe(10);
    });

    it('addDaysYmd adds calendar days', () => {
        const base = parseJudgmentDateInput('2026-05-10');
        expect(addDaysYmd(base, 15)).toBe('2026-05-25');
    });

    it('isSulhJudgmentType accepts current and legacy labels', () => {
        expect(isSulhJudgmentType(JUDGMENT_TYPE_SULH)).toBe(true);
        expect(isSulhJudgmentType(JUDGMENT_TYPE_SULH_LEGACY)).toBe(true);
        expect(isSulhJudgmentType('إبطال')).toBe(false);
    });
});
