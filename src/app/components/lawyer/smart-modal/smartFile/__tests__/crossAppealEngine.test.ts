import { describe, expect, it } from 'vitest';
import type { CaseStage, Party } from '../../../LawyerShared';
import {
    classifyCrossAppealFiling,
    resolveCrossAppealEligibility,
    resolveFirstInstanceNotificationAnchor,
} from '../crossAppealEngine';

function party(overrides: Partial<Party> & { id: number | string; name: string }): Party {
    return {
        role: '',
        ...overrides,
    } as Party;
}

describe('crossAppealEngine (disabled product surface)', () => {
    it('never shows cross-appeal button — superseded by independent dossier', () => {
        const firstInstance = {
            id: 's1',
            stageName: 'البداءة',
            finalDecision: 'رد الدعوى جزئياً (حكم جزئي)',
            parties: [
                party({ id: 1, name: 'مدعي', role: 'المدعي', side: 'right' }),
                party({ id: 2, name: 'مدعى', role: 'المدعى عليه', side: 'left' }),
            ],
        } as CaseStage;

        const appeal = {
            id: 's2',
            stageName: 'الاستئناف',
            parties: [
                party({ id: 1, name: 'مدعي', role: 'المستأنف', side: 'right' }),
                party({ id: 2, name: 'مدعى', role: 'المستأنف عليه', side: 'left', isClient: true }),
            ],
            appealMetadata: {
                appellant: 'المدعي',
                priorJudgmentType: 'رد الدعوى جزئياً',
                initialAppellantPartyIds: [1],
            },
        } as CaseStage;

        const result = resolveCrossAppealEligibility({
            appealStage: appeal,
            stages: [firstInstance, appeal],
            appealStageIndex: 1,
        });

        expect(result.showButton).toBe(false);
        expect(result.canFileCrossAppeal).toBe(false);
        expect(result.reason).toMatch(/أُلغي|مستقلة/);
    });

    it('classifies ORIGINAL within 15-day window and DEPENDENT after', () => {
        expect(
            classifyCrossAppealFiling({
                filingDate: '2026-01-17',
                firstInstanceNotificationDate: '2026-01-01',
            }),
        ).toBe('ORIGINAL');
        expect(
            classifyCrossAppealFiling({
                filingDate: '2026-01-18',
                firstInstanceNotificationDate: '2026-01-01',
            }),
        ).toBe('DEPENDENT');
    });

    it('anchors notification date from absent notice then decision date', () => {
        expect(
            resolveFirstInstanceNotificationAnchor({
                absentJudgmentNotificationDate: '2026-03-01',
                decisionDate: '2026-02-01',
            } as CaseStage),
        ).toBe('2026-03-01');
    });
});
