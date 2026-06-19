import { describe, expect, it } from 'vitest';
import type { CaseStage, Party } from '../../../LawyerShared';
import { resolveCrossAppealEligibility } from '../crossAppealEngine';

function party(overrides: Partial<Party> & { id: number | string; name: string }): Party {
    return {
        role: '',
        ...overrides,
    } as Party;
}

describe('crossAppealEngine', () => {
    it('hides cross-appeal button on full win judgment without staggered co-litigants', () => {
        const firstInstance = {
            id: 's1',
            stageName: 'البداءة',
            finalDecision: 'إجابة الدعوى بالكامل',
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
                party({ id: 2, name: 'مدعى', role: 'المستأنف عليه', side: 'left' }),
            ],
            appealMetadata: {
                appellant: 'المدعي',
                priorJudgmentType: 'إجابة الدعوى بالكامل',
                initialAppellantPartyIds: [1],
            },
        } as CaseStage;

        const result = resolveCrossAppealEligibility({
            appealStage: appeal,
            stages: [firstInstance, appeal],
            appealStageIndex: 1,
        });

        expect(result.showButton).toBe(false);
        expect(result.isPartialJudgment).toBe(false);
    });

    it('shows cross-appeal for partial judgment on pending appellees', () => {
        const firstInstance = {
            id: 's1',
            stageName: 'البداءة',
            finalDecision: 'رد الدعوى جزئياً (حكم جزئي)',
            parties: [
                party({ id: 1, name: 'مدعي', role: 'المدعي', side: 'right' }),
                party({ id: 2, name: 'مدعى أ', role: 'المدعى عليه', side: 'left' }),
                party({ id: 3, name: 'مدعى ب', role: 'المدعى عليه الثاني', side: 'left' }),
            ],
        } as CaseStage;

        const appeal = {
            id: 's2',
            stageName: 'الاستئناف',
            parties: [
                party({ id: 1, name: 'مدعي', role: 'المستأنف', side: 'right' }),
                party({ id: 2, name: 'مدعى أ', role: 'المستأنف عليه', side: 'left' }),
                party({ id: 3, name: 'مدعى ب', role: 'المستأنف عليه الثاني', side: 'left' }),
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

        expect(result.showButton).toBe(true);
        expect(result.isPartialJudgment).toBe(true);
        expect(result.pendingCrossAppellants.map((p) => p.name)).toEqual(['مدعى أ', 'مدعى ب']);
    });

    it('shows only omitted co-litigant محمد after احمد وعلي appealed together', () => {
        const firstInstance = {
            id: 's1',
            stageName: 'البداءة',
            finalDecision: 'رد الدعوى جزئياً',
            parties: [
                party({ id: 1, name: 'أحمد', role: 'المدعى عليه', side: 'left' }),
                party({ id: 2, name: 'علي', role: 'المدعى عليه الثاني', side: 'left' }),
                party({ id: 3, name: 'محمد', role: 'المدعى عليه الثالث', side: 'left' }),
                party({ id: 4, name: 'مدعي', role: 'المدعي', side: 'right' }),
            ],
        } as CaseStage;

        const appeal = {
            id: 's2',
            stageName: 'الاستئناف',
            parties: [
                party({ id: 4, name: 'مدعي', role: 'المستأنف', side: 'right' }),
                party({ id: 1, name: 'أحمد', role: 'المستأنف عليه', side: 'left' }),
                party({ id: 2, name: 'علي', role: 'المستأنف عليه', side: 'left' }),
                party({ id: 3, name: 'محمد', role: 'المستأنف عليه', side: 'left' }),
            ],
            appealMetadata: {
                appellant: 'المدعي',
                priorJudgmentType: 'رد الدعوى جزئياً',
                initialAppellantPartyIds: [4],
                crossAppealPartyIds: ['1', '2'],
            },
        } as CaseStage;

        const result = resolveCrossAppealEligibility({
            appealStage: appeal,
            stages: [firstInstance, appeal],
            appealStageIndex: 1,
        });

        expect(result.showButton).toBe(true);
        expect(result.pendingCrossAppellants.map((p) => p.name)).toEqual(['محمد']);
        expect(result.filedCrossAppellants.map((p) => p.name)).toEqual(['أحمد', 'علي']);
    });

    it('offers cross appeal to interpleader appellee who has not appealed yet', () => {
        const firstInstance = {
            id: 's1',
            stageName: 'البداءة',
            finalDecision: 'إجابة الدعوى بالكامل',
            parties: [
                party({ id: 1, name: 'موكل', role: 'المدعي', side: 'right', isClient: true }),
                party({ id: 2, name: 'مدعى', role: 'المدعى عليه', side: 'left' }),
                party({ id: 5, name: 'اختصام', role: 'شخص ثالث (اختصامي)' }),
            ],
        } as CaseStage;

        const appeal = {
            id: 's2',
            stageName: 'الاستئناf',
            parties: [
                party({ id: 1, name: 'موكل', role: 'المستأنف (المدعي)', side: 'right', isClient: true }),
                party({ id: 2, name: 'مدعى', role: 'المستأنف عليه (المدعى عليه)', side: 'left' }),
                party({
                    id: 5,
                    name: 'اختصام',
                    role: 'المستأنف عليه (شخص ثالث اختصامي)',
                    side: 'left',
                }),
            ],
            appealMetadata: {
                appellant: 'المدعي',
                priorJudgmentType: 'إجابة الدعوى بالكامل',
                initialAppellantPartyIds: [1],
            },
        } as CaseStage;

        const result = resolveCrossAppealEligibility({
            appealStage: appeal,
            stages: [firstInstance, appeal],
            appealStageIndex: 1,
        });

        expect(result.showButton).toBe(true);
        expect(result.pendingCrossAppellants.map((p) => p.id)).toContain(5);
    });

    it('shows cross appeal for co-plaintiff علي when محمد alone appealed', () => {
        const firstInstance = {
            id: 's1',
            stageName: 'البداءة',
            finalDecision: 'رد الدعوى جزئياً (حكم جزئي)',
            lastJudgmentType: 'رد الدعوى جزئياً',
            parties: [
                party({ id: 1, name: 'محمد', role: 'المدعي', side: 'right' }),
                party({ id: 2, name: 'علي', role: 'المدعي الثاني', side: 'right' }),
                party({ id: 3, name: 'خصم', role: 'المدعى عليه', side: 'left' }),
            ],
        } as CaseStage;

        const appeal = {
            id: 's2',
            stageName: 'الاستئناف',
            parties: [
                party({ id: 1, name: 'محمد', role: 'المستأنف', side: 'right' }),
                party({ id: 2, name: 'علي', role: 'المستأنف عليه (المدعي)', side: 'left' }),
                party({ id: 3, name: 'خصم', role: 'المستأنف عليه', side: 'left' }),
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

        expect(result.showButton).toBe(true);
        expect(result.hasStaggeredCoLitigants).toBe(true);
        expect(result.pendingCrossAppellants.map((p) => p.name)).toContain('علي');
    });

    it('detects partial judgment from locked stage lastJudgmentType when metadata missing', () => {
        const firstInstance = {
            id: 's1',
            stageName: 'البداءة',
            finalDecision: 'محسومة جزئياً - بانتظار الطعن',
            lastJudgmentType: 'رد الدعوى جزئياً',
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
                party({ id: 2, name: 'مدعى', role: 'المستأنف عليه', side: 'left' }),
            ],
            appealMetadata: {
                appellant: 'المدعي',
                initialAppellantPartyIds: [1],
            },
        } as CaseStage;

        const result = resolveCrossAppealEligibility({
            appealStage: appeal,
            stages: [firstInstance, appeal],
            appealStageIndex: 1,
        });

        expect(result.isPartialJudgment).toBe(true);
        expect(result.showButton).toBe(true);
    });
});
