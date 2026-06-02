import { describe, expect, it } from 'vitest';
import type { CriminalCase } from './criminalStore';
import {
    assertCasesMergeSameProceduralStage,
    buildMergeCaseTargetOptions,
    buildMergedCaseHeaderBadges,
    buildParentMergedTimelineView,
    CROSS_STAGE_MERGE_ERROR_MESSAGE,
    filterParentOnlyTimelineEvents,
    formatMergeCaseSelectLabel,
} from './caseMergeTimeline';

describe('case merge timeline selector', () => {
    const parent: CriminalCase = {
        id: 'parent-1',
        basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
        location: { caseNumber: '123/2026' } as CriminalCase['location'],
        defendants: [{ id: 'd1', fullName: 'علي', address: '', birthYear: '', status: '', detentionAuthority: '', detentionExpiryDate: '', detentionHistoryLog: [], totalDetentionDays: 0 }],
        complainants: [],
        timelineEvents: [
            {
                id: 'e-parent',
                date: '2026-05-10',
                type: 'investigation',
                category: 'تدوين أقوال المتهم',
                title: 'إجراء أم',
                description: 'تفاصيل الأم',
            },
        ],
        statements: [],
        investigationLogs: [],
        lawyerRequests: [],
        mergedCaseIds: ['child-1'],
    } as CriminalCase;

    const child: CriminalCase = {
        id: 'child-1',
        basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
        location: { caseNumber: '456/2026' } as CriminalCase['location'],
        defendants: [
            { id: 'd2', fullName: 'حسن', address: '', birthYear: '', status: '', detentionAuthority: '', detentionExpiryDate: '', detentionHistoryLog: [], totalDetentionDays: 0 },
            { id: 'd3', fullName: 'سعد', address: '', birthYear: '', status: '', detentionAuthority: '', detentionExpiryDate: '', detentionHistoryLog: [], totalDetentionDays: 0 },
        ],
        complainants: [],
        timelineEvents: [
            {
                id: 'e-child',
                date: '2026-05-20',
                type: 'investigation',
                category: 'مخاطبة مراجع رسمية',
                title: 'إجراء ب',
                description: 'تفاصيل الب',
            },
        ],
        statements: [],
        investigationLogs: [],
        lawyerRequests: [],
        dossierStatus: 'merged',
        mergedIntoCaseId: 'parent-1',
    } as CriminalCase;

    const casesById: Record<string, CriminalCase> = {
        'parent-1': parent,
        'child-1': child,
    };

    it('formatMergeCaseSelectLabel never exposes raw UUID', () => {
        const label = formatMergeCaseSelectLabel(child, 'child-1');
        expect(label).toContain('456/2026');
        expect(label).toContain('المتهمون:');
        expect(label).toContain('حسن');
        expect(label).toContain('سعد');
        expect(label).not.toContain('child-1');
    });

    it('formatMergeCaseSelectLabel falls back to defendants when case number is missing', () => {
        const numberless: CriminalCase = {
            ...child,
            location: {} as CriminalCase['location'],
        };
        const label = formatMergeCaseSelectLabel(numberless, 'child-x');
        expect(label).toContain('بدون رقم رسمي');
        expect(label).toContain('المتهمون:');
        expect(label).toContain('حسن');
    });

    it('formatMergeCaseSelectLabel signals missing defendants explicitly', () => {
        const emptyDefendants: CriminalCase = {
            ...child,
            defendants: [],
        };
        const label = formatMergeCaseSelectLabel(emptyDefendants, 'child-y');
        expect(label).toContain('456/2026');
        expect(label).toContain('بدون متهمين مسجّلين');
    });

    it('buildMergeCaseTargetOptions excludes parent and merged dossiers', () => {
        const options = buildMergeCaseTargetOptions(casesById, 'parent-1', new Set(['child-1']));
        expect(options.some((o) => o.id === 'parent-1')).toBe(false);
        expect(options.some((o) => o.id === 'child-1')).toBe(false);
    });

    it('buildMergeCaseTargetOptions hides cross-stage dossiers (no cross-stage merge)', () => {
        const otherStage: CriminalCase = {
            ...child,
            id: 'misd-1',
            basics: { stage: 'محكمة الجنح' } as CriminalCase['basics'],
            dossierStatus: 'active',
            mergedIntoCaseId: undefined,
        };
        const extended = { ...casesById, 'misd-1': otherStage };
        const options = buildMergeCaseTargetOptions(extended, 'parent-1', new Set());
        expect(options.some((o) => o.id === 'misd-1')).toBe(false);
        expect(options.every((o) => !o.selectLabel.includes('misd-1'))).toBe(true);
    });

    it('buildMergeCaseTargetOptions ignores stale mergedFromCaseIds that are not actually merged children', () => {
        const sibling: CriminalCase = {
            ...child,
            id: 'sib-open-1',
            location: { caseNumber: '111/2026' } as CriminalCase['location'],
            dossierStatus: 'active',
            mergedIntoCaseId: undefined,
        };
        const parentStaleMergeList: CriminalCase = {
            ...parent,
            mergedFromCaseIds: ['sib-open-1', 'child-1'],
            mergedCaseIds: undefined,
        };
        const extended = {
            ...casesById,
            'parent-1': parentStaleMergeList,
            'sib-open-1': sibling,
        };
        const options = buildMergeCaseTargetOptions(extended, 'parent-1');
        expect(options.some((o) => o.id === 'sib-open-1')).toBe(true);
    });

    it('buildMergeCaseTargetOptions includes severed and severance-parent dossiers when same stage', () => {
        const sibling: CriminalCase = {
            ...child,
            id: 'sib-1',
            location: { caseNumber: '789/2026' } as CriminalCase['location'],
            dossierStatus: 'active',
            mergedIntoCaseId: undefined,
        };
        const severedChild: CriminalCase = {
            ...sibling,
            id: 'severed-1',
            location: { caseNumber: '321/2026' } as CriminalCase['location'],
            parentCaseId: 'some-parent',
            isSeveredChild: true,
        };
        const severanceParent: CriminalCase = {
            ...sibling,
            id: 'sev-parent-1',
            location: { caseNumber: '654/2026' } as CriminalCase['location'],
            severedChildCaseIds: ['severed-1'],
        };
        const staleSeveranceParent: CriminalCase = {
            ...sibling,
            id: 'stale-sev-parent-1',
            location: { investigationCourtName: 'محكمة تحقيق', investigationDossierNumber: '7/2026' } as CriminalCase['location'],
            severedChildCaseIds: ['phantom-child-id'],
        };
        const withParentIdOnly: CriminalCase = {
            ...sibling,
            id: 'legacy-parent-link-1',
            location: { investigationCourtName: 'محكمة تحقيق', investigationDossierNumber: '9/2026' } as CriminalCase['location'],
            parentCaseId: 'other-parent',
            isSeveredChild: false,
        };
        const extended = {
            ...casesById,
            'sib-1': sibling,
            'severed-1': severedChild,
            'sev-parent-1': severanceParent,
            'stale-sev-parent-1': staleSeveranceParent,
            'legacy-parent-link-1': withParentIdOnly,
        };
        const options = buildMergeCaseTargetOptions(extended, 'parent-1', new Set(['child-1']));
        const ids = options.map((o) => o.id);
        expect(ids).toContain('sib-1');
        expect(ids).toContain('legacy-parent-link-1');
        expect(ids).toContain('stale-sev-parent-1');
        expect(ids).toContain('sev-parent-1');
        expect(ids).toContain('severed-1');
    });

    it('buildMergeCaseTargetOptions does not mix adult investigation with juvenile investigation', () => {
        const parentJuvenile: CriminalCase = {
            ...parent,
            basics: { stage: 'تحقيق الأحداث' } as CriminalCase['basics'],
        };
        const siblingAdult: CriminalCase = {
            ...child,
            id: 'sib-adult',
            location: { caseNumber: '100/2026' } as CriminalCase['location'],
            dossierStatus: 'active',
            mergedIntoCaseId: undefined,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
        };
        const siblingJuvenile: CriminalCase = {
            ...child,
            id: 'sib-juv',
            location: { caseNumber: '101/2026' } as CriminalCase['location'],
            dossierStatus: 'active',
            mergedIntoCaseId: undefined,
            basics: { stage: 'تحقيق الأحداث' } as CriminalCase['basics'],
        };
        const extended = {
            ...casesById,
            'parent-1': parentJuvenile,
            'sib-adult': siblingAdult,
            'sib-juv': siblingJuvenile,
        };
        const options = buildMergeCaseTargetOptions(extended, 'parent-1', new Set(['child-1']));
        expect(options.some((o) => o.id === 'sib-juv')).toBe(true);
        expect(options.some((o) => o.id === 'sib-adult')).toBe(false);
    });

    it('buildMergedCaseHeaderBadges produces context-rich, navigable badges', () => {
        const badges = buildMergedCaseHeaderBadges(parent, casesById);
        expect(badges).toHaveLength(1);
        expect(badges[0]).toMatchObject({
            id: 'child-1',
            caseNumber: '456/2026',
            primaryLabel: '456/2026',
            isResolved: true,
        });
        expect(badges[0]?.defendants).toEqual(['حسن', 'سعد']);
        expect(badges[0]?.detailLabel).toContain('456/2026');
        expect(badges[0]?.detailLabel).toContain('حسن');
    });

    it('buildMergedCaseHeaderBadges falls back to defendants when child has no case number', () => {
        const numberlessChild: CriminalCase = {
            ...child,
            location: {} as CriminalCase['location'],
        };
        const badges = buildMergedCaseHeaderBadges(parent, {
            ...casesById,
            'child-1': numberlessChild,
        });
        expect(badges[0]?.primaryLabel).toContain('حسن');
        expect(badges[0]?.detailLabel).toContain('غير مسجّل');
    });

    it('buildMergedCaseHeaderBadges marks unresolved children as non-navigable', () => {
        const orphanParent: CriminalCase = {
            ...parent,
            mergedCaseIds: ['phantom-id'],
        };
        const badges = buildMergedCaseHeaderBadges(orphanParent, {});
        expect(badges[0]?.isResolved).toBe(false);
    });

    it('resolveMergedCaseIds migrates legacy mergedFromCaseIds', () => {
        const legacy = { ...parent, mergedFromCaseIds: ['child-1'], mergedCaseIds: undefined } as CriminalCase;
        expect(buildMergeCaseTargetOptions({ 'parent-1': legacy, 'child-1': child }, 'parent-1', new Set(['child-1'])).length).toBe(0);
        const ids = buildParentMergedTimelineView(legacy, casesById);
        expect(ids.some((e) => e.isMerged)).toBe(true);
    });

    it('buildMergeCaseTargetOptions matches dossiers at current journey stage despite stale basics.stage', () => {
        const parentRemanded: CriminalCase = {
            ...parent,
            caseStage: 'investigation',
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
            stageJourney: [
                { id: '1', stage: 'felony', label: 'محكمة الجنايات', status: 'past' },
                { id: '2', stage: 'investigation', label: 'مرحلة التحقيق', status: 'current' },
            ],
        };
        const siblingRemanded: CriminalCase = {
            ...child,
            id: 'sib-inv-1',
            location: { caseNumber: '999/2026' } as CriminalCase['location'],
            dossierStatus: 'active',
            mergedIntoCaseId: undefined,
            caseStage: 'investigation',
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
            stageJourney: [
                { id: '1', stage: 'misdemeanor', label: 'محكمة الجنح', status: 'past' },
                { id: '2', stage: 'investigation', label: 'مرحلة التحقيق', status: 'current' },
            ],
        };
        const extended = {
            ...casesById,
            'parent-1': parentRemanded,
            'sib-inv-1': siblingRemanded,
        };
        const options = buildMergeCaseTargetOptions(extended, 'parent-1', new Set(['child-1']));
        expect(options.some((o) => o.id === 'sib-inv-1')).toBe(true);
    });

    it('buildMergeCaseTargetOptions matches when basics.stage is investigation but caseStage is stale trial', () => {
        const parentStale: CriminalCase = {
            ...parent,
            caseStage: 'felony',
            isInvestigationLocked: false,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
            stageJourney: [{ id: '1', stage: 'felony', label: 'محكمة الجنايات', status: 'current' }],
        };
        const siblingInv: CriminalCase = {
            ...child,
            id: 'sib-stale-1',
            location: { investigationDossierNumber: '12/2026' } as CriminalCase['location'],
            dossierStatus: 'active',
            mergedIntoCaseId: undefined,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
            caseStage: 'investigation',
        };
        const extended = { ...casesById, 'parent-1': parentStale, 'sib-stale-1': siblingInv };
        const options = buildMergeCaseTargetOptions(extended, 'parent-1', new Set(['child-1']));
        expect(options.some((o) => o.id === 'sib-stale-1')).toBe(true);
    });

    it('buildMergeCaseTargetOptions matches vault investigation labels when journey stages disagree', () => {
        const parentVault: CriminalCase = {
            ...parent,
            caseStage: 'felony',
            isInvestigationLocked: true,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
            stageJourney: [{ id: '1', stage: 'felony', label: 'محكمة الجنايات', status: 'current' }],
        };
        const siblingVault: CriminalCase = {
            ...child,
            id: 'sib-vault-1',
            location: { investigationCourtName: 'محكمة تحقيق الديوانية', investigationDossierNumber: '3/2026' } as CriminalCase['location'],
            dossierStatus: 'active',
            mergedIntoCaseId: undefined,
            caseStage: 'felony',
            isInvestigationLocked: true,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
            stageJourney: [{ id: '1', stage: 'misdemeanor', label: 'محكمة الجنح', status: 'current' }],
        };
        const extended = {
            ...casesById,
            'parent-1': parentVault,
            'sib-vault-1': siblingVault,
        };
        const options = buildMergeCaseTargetOptions(extended, 'parent-1', new Set(['child-1']));
        expect(options.some((o) => o.id === 'sib-vault-1')).toBe(true);
    });

    it('buildMergeCaseTargetOptions matches when parent is investigation caseStage but locked with stale trial journey', () => {
        const parentLockedInv: CriminalCase = {
            ...parent,
            caseStage: 'investigation',
            isInvestigationLocked: true,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
            stageJourney: [{ id: '1', stage: 'felony', label: 'محكمة الجنايات', status: 'current' }],
        };
        const siblingInv: CriminalCase = {
            ...child,
            id: 'sib-locked-inv-1',
            location: { investigationCourtName: 'محكمة تحقيق الديوانية', investigationDossierNumber: '2/2026' } as CriminalCase['location'],
            dossierStatus: 'active',
            mergedIntoCaseId: undefined,
            caseStage: 'investigation',
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
        };
        const extended = {
            ...casesById,
            'parent-1': parentLockedInv,
            'sib-locked-inv-1': siblingInv,
        };
        const options = buildMergeCaseTargetOptions(extended, 'parent-1', new Set(['child-1']));
        expect(options.some((o) => o.id === 'sib-locked-inv-1')).toBe(true);
    });

    it('buildMergeCaseTargetOptions matches reopened investigation when journey still shows trial current', () => {
        const parentReopened: CriminalCase = {
            ...parent,
            caseStage: 'investigation',
            isInvestigationLocked: false,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
            stageJourney: [
                { id: '1', stage: 'felony', label: 'محكمة الجنايات', status: 'current' },
            ],
        };
        const siblingReopened: CriminalCase = {
            ...child,
            id: 'sib-reopen-1',
            location: { investigationDossierNumber: '88/2026' } as CriminalCase['location'],
            dossierStatus: 'active',
            mergedIntoCaseId: undefined,
            caseStage: 'investigation',
            isInvestigationLocked: false,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
            stageJourney: [
                { id: '1', stage: 'misdemeanor', label: 'محكمة الجنح', status: 'current' },
            ],
        };
        const extended = {
            ...casesById,
            'parent-1': parentReopened,
            'sib-reopen-1': siblingReopened,
        };
        const options = buildMergeCaseTargetOptions(extended, 'parent-1', new Set(['child-1']));
        expect(options.some((o) => o.id === 'sib-reopen-1')).toBe(true);
    });

    it('buildMergeCaseTargetOptions includes investigation dossier with dossier number only', () => {
        const sibling: CriminalCase = {
            ...child,
            id: 'sib-dossier-1',
            location: { investigationDossierNumber: '55/2026' } as CriminalCase['location'],
            defendants: [],
            dossierStatus: 'active',
            mergedIntoCaseId: undefined,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
            caseStage: 'investigation',
        };
        const extended = { ...casesById, 'sib-dossier-1': sibling };
        const options = buildMergeCaseTargetOptions(extended, 'parent-1', new Set(['child-1']));
        expect(options.some((o) => o.id === 'sib-dossier-1')).toBe(true);
    });

    it('assertCasesMergeSameProceduralStage allows merge when basics.stage matches', () => {
        const parentRemanded: CriminalCase = {
            ...parent,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
        };
        const siblingRemanded: CriminalCase = {
            ...child,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
        };
        expect(() => assertCasesMergeSameProceduralStage(parentRemanded, siblingRemanded)).not.toThrow();
    });

    it('assertCasesMergeSameProceduralStage throws on cross-stage merge', () => {
        const misd = {
            ...child,
            caseStage: 'misdemeanor' as const,
            basics: { stage: 'محكمة الجنح' } as CriminalCase['basics'],
            stageJourney: [{ id: '1', stage: 'misdemeanor', label: 'محكمة الجنح', status: 'current' }],
        };
        expect(() => assertCasesMergeSameProceduralStage(parent, misd)).toThrow(CROSS_STAGE_MERGE_ERROR_MESSAGE);
    });

    it('buildParentMergedTimelineView injects metadata without mutating store arrays', () => {
        const beforeParent = parent.timelineEvents;
        const beforeChild = child.timelineEvents;

        const view = buildParentMergedTimelineView(parent, casesById);
        expect(view.length).toBe(2);
        expect(view[0]?.id).toBe('e-child');
        expect(view[0]?.isMerged).toBe(true);
        expect(view[0]?.originCaseNumber).toBe('456/2026');
        expect(view[0]?.originCaseId).toBe('child-1');
        expect(view[1]?.id).toBe('e-parent');
        expect(view[1]?.isMerged).toBeFalsy();

        expect(parent.timelineEvents).toBe(beforeParent);
        expect(child.timelineEvents).toBe(beforeChild);
        expect((child.timelineEvents[0] as { isMerged?: boolean }).isMerged).toBeUndefined();
    });

    it('filterParentOnlyTimelineEvents hides injected child events', () => {
        const view = buildParentMergedTimelineView(parent, casesById);
        const parentOnly = filterParentOnlyTimelineEvents(view);
        expect(parentOnly).toHaveLength(1);
        expect(parentOnly[0]?.id).toBe('e-parent');
    });
});
