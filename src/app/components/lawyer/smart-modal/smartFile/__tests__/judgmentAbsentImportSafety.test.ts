import { describe, expect, it } from 'vitest';

describe('judgmentTypes ↔ absentJudgmentFlow import safety', () => {
    it('loads both modules without undefined exports (circular import guard)', async () => {
        const judgmentTypes = await import('../judgmentTypes');
        const absentFlow = await import('../absentJudgmentFlow');

        expect(typeof judgmentTypes.shouldShowOpponentAppealRegisterButton).toBe('function');
        expect(typeof absentFlow.canOfferAbsentObjectionToDefendant).toBe('function');
        expect(typeof absentFlow.shouldShowAbsentJudgmentFooter).toBe('function');

        expect(
            judgmentTypes.shouldShowOpponentAppealRegisterButton(
                {
                    isPleadingsClosed: true,
                    stageName: 'اعتراض غيابي',
                    awaitingOpponentAppeal: true,
                },
                'active',
                'وكيل المدعي',
            ),
        ).toBe(true);
    });
});
