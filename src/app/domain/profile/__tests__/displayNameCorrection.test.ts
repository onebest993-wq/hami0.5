import { describe, expect, it } from 'vitest';
import {
    DISPLAY_NAME_PREVIOUS_VISIBLE_MS,
    normalizeLegalDisplayName,
    previousDisplayNamePublic,
    toDisplayNamePolicy,
} from '../displayNameCorrection';

describe('displayNameCorrection', () => {
    it('يضغط الفراغات ويقصّ الطول', () => {
        expect(normalizeLegalDisplayName('  علي   محمد  ')).toBe('علي محمد');
        expect(normalizeLegalDisplayName(`${'م'.repeat(100)}`).length).toBe(80);
    });

    it('يظهر الاسم السابق ثلاثين يوماً ثم يختفي', () => {
        const correctedAt = '2026-08-01T00:00:00.000Z';
        const during = Date.parse(correctedAt) + 10 * 24 * 60 * 60 * 1000;
        const after = Date.parse(correctedAt) + DISPLAY_NAME_PREVIOUS_VISIBLE_MS + 1;
        expect(previousDisplayNamePublic('أحمد علي', correctedAt, during)).toBe('أحمد علي');
        expect(previousDisplayNamePublic('أحمد علي', correctedAt, after)).toBeNull();
    });

    it('يحسب السياسة: تصحيح واحد ثم يُقفل', () => {
        const open = toDisplayNamePolicy({ fullName: 'علي محمد حسن', corrections: 0 });
        expect(open.canCorrect).toBe(true);
        expect(open.correctionUsed).toBe(false);
        const used = toDisplayNamePolicy({
            fullName: 'علي محمد حسّان',
            previousFullName: 'علي محمد حسن',
            correctedAt: '2026-08-20T00:00:00.000Z',
            corrections: 1,
        }, Date.parse('2026-08-25T00:00:00.000Z'));
        expect(used.canCorrect).toBe(false);
        expect(used.previousFullName).toBe('علي محمد حسن');
    });
});
