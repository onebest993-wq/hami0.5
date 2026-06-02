import { describe, expect, it } from 'vitest';
import type { CriminalCase } from './criminalStore';
import {
    applyProceduralCassationEffects,
    getCassationResultFormOptions,
    isArrestOrSummonProceduralDecision,
    isJudicialLedgerMirrorTimelineCategory,
} from './proceduralCassationResults';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';

function minimalCase(defendants: CriminalCase['defendants'] = []): CriminalCase {
    return {
        id: 'c1',
        caseNumber: '1',
        title: 't',
        stage: 'مرحلة التحقيق',
        crimeType: 'جنحة',
        defendants,
        complainants: [],
        timelineEvents: [],
    } as CriminalCase;
}

describe('proceduralCassationResults', () => {
    it('lists four dispositive options only for dispositive decisions', () => {
        expect(getCassationResultFormOptions('dispositive')).toHaveLength(4);
        expect(getCassationResultFormOptions('dispositive').map((o) => o.value)).not.toContain('procedural_annulment');
    });

    it('detects arrest/summon procedural decisions', () => {
        expect(
            isArrestOrSummonProceduralDecision({
                title: 'إصدار أمر استقدام / قبض',
                proceduralTemplate: 'إصدار أمر استقدام / قبض',
            }),
        ).toBe(true);
    });

    it('flags judicial mirror timeline categories', () => {
        expect(isJudicialLedgerMirrorTimelineCategory('توجيه تمييزي — قرار إجرائي')).toBe(true);
        expect(isJudicialLedgerMirrorTimelineCategory('جلسة مرافعة')).toBe(false);
    });

    it('does not inject duplicate timeline events for remand direction (judicial ledger only)', () => {
        const decision: JudicialDecision = {
            id: 'd1',
            issuedAt: '2026-01-01',
            title: 'قرار توقيف',
            summary: '',
            decisionType: 'preparatory',
            appeals: [],
            isLocked: true,
        };
        const appeal: JudicialDecisionAppeal = {
            id: 'a1',
            appellantType: 'defendant',
            appellantIds: ['def1'],
            cassationStatus: 'concluded',
            cassationDirectives: 'إعادة توجيه التحقيق',
        };
        const out = applyProceduralCassationEffects(minimalCase([{ id: 'def1', fullName: 'أحمد', status: 'موقوف' } as any]), decision, appeal, {
            result: 'procedural_remand_direction',
            cassationDirectives: 'إعادة توجيه التحقيق',
            date: '2026-02-01',
        });
        expect(out.timelineEvents?.length ?? 0).toBe(0);
    });
});
