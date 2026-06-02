import { describe, expect, it } from 'vitest';
import type { JudicialDecision } from '@/app/types/criminal';
import {
    isActiveDetentionCard,
    isDetentionEndReached,
    isDetentionPeriodActive,
    isLatestBindingDetentionForParties,
    validateDetentionDateRange,
    validateDetentionExtensionEnd,
} from './detentionEngine';

function detentionDecision(partial: Partial<JudicialDecision>): JudicialDecision {
    return {
        id: 'jd1',
        issuedAt: '2026-05-01',
        title: 'قرار توقيف المتهم',
        summary: '—',
        decisionType: 'preparatory',
        appeals: [],
        isLocked: true,
        proceduralTemplate: 'قرار توقيف المتهم',
        detentionStartDate: '2026-05-01',
        detentionEndDate: '2026-05-10',
        defendantIds: ['d1'],
        ...partial,
    };
}

describe('detentionEngine', () => {
    it('validates detention date range', () => {
        expect(validateDetentionDateRange('', '2026-05-10')).toMatch(/بدء/);
        expect(validateDetentionDateRange('2026-05-12', '2026-05-10')).toMatch(/الانتهاء/);
        expect(validateDetentionDateRange('2026-05-01', '2026-05-10')).toBeNull();
    });

    it('validates extension end must exceed previous end', () => {
        expect(validateDetentionExtensionEnd('2026-05-10', '2026-05-09')).toMatch(/يتجاوز/);
        expect(validateDetentionExtensionEnd('2026-05-10', '2026-05-15')).toBeNull();
    });

    it('detects active vs ended detention period', () => {
        expect(isDetentionPeriodActive('2099-12-31', '2026-05-01')).toBe(true);
        expect(isDetentionEndReached('2026-05-01', '2026-05-01')).toBe(true);
        expect(isDetentionEndReached('2099-12-31', '2026-05-01')).toBe(false);
    });

    it('flags latest binding detention per parties', () => {
        const older = detentionDecision({ id: 'jd-old', issuedAt: '2026-04-01' });
        const newer = detentionDecision({ id: 'jd-new', issuedAt: '2026-05-15' });
        const all = [older, newer];
        expect(isActiveDetentionCard(newer)).toBe(true);
        expect(isLatestBindingDetentionForParties(newer, all)).toBe(true);
        expect(isLatestBindingDetentionForParties(older, all)).toBe(false);
    });
});
