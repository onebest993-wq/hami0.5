import { beforeEach, describe, expect, it } from 'vitest';
import {
    looksLikeRealCaseReference,
    sanitizeCaseReferenceField,
    useCriminalStore,
} from '../criminalStore';
import { resetCriminalStore, seedDraftForNewCase } from './criminalStoreTestHelpers';

describe('criminalStore', () => {
    beforeEach(() => {
        resetCriminalStore();
    });

    it('getActiveParties excludes deceased; getAllParties includes deceased flag', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        useCriminalStore.getState().registerPartyDeath(caseId, defendantId);

        const active = useCriminalStore.getState().getActiveParties(caseId);
        const all = useCriminalStore.getState().getAllParties(caseId);
        expect(active.some((p) => p.id === defendantId)).toBe(false);
        const dead = all.find((p) => p.id === defendantId);
        expect(dead?.isDeceased).toBe(true);
    });

    it('procedural containers persist nested items and reorder roots', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().addRootProceduralContainer(caseId, {
            title: 'حاوية رئيسية',
            color: '#E6C673',
            icon: '📁',
        });
        const rootId = useCriminalStore.getState().casesById[caseId]?.proceduralContainers?.[0]?.id ?? '';
        expect(rootId).toBeTruthy();
        useCriminalStore.getState().addProceduralSubItem(caseId, rootId, {
            type: 'action',
            id: 'act-1',
            title: 'طلب تقرير',
            date: '2026-05-01',
            status: 'in_progress',
        });
        useCriminalStore.getState().addProceduralSubItem(caseId, rootId, {
            type: 'note',
            id: 'note-1',
            title: 'ملاحظة متابعة',
        });
        const roots = useCriminalStore.getState().casesById[caseId]?.proceduralContainers ?? [];
        expect(roots[0]?.subItems).toHaveLength(2);
        useCriminalStore.getState().advanceProceduralActionPhase(caseId, rootId, 'act-1', {
            spawnChildTitle: 'مرحلة لاحقة',
        });
        const after = useCriminalStore.getState().casesById[caseId]?.proceduralContainers ?? [];
        const action = after[0]?.subItems.find((i) => i.type === 'action');
        expect(action?.type === 'action' && action.status).toBe('done');
        expect(after[0]?.subItems.some((i) => i.type === 'container')).toBe(true);
        useCriminalStore.getState().addRootProceduralContainer(caseId, {
            title: 'حاوية ثانية',
            color: '#38bdf8',
            icon: '📋',
        });
        const secondId = useCriminalStore.getState().casesById[caseId]?.proceduralContainers?.[1]?.id ?? '';
        useCriminalStore.getState().reorderRootProceduralContainers(caseId, secondId, rootId);
        const reordered = useCriminalStore.getState().casesById[caseId]?.proceduralContainers ?? [];
        expect(reordered[0]?.id).toBe(secondId);
    });

    it('sandbox template and audit append without blocking canvas', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().applyProceduralSandboxTemplate(caseId, 'starter-lane');
        const roots = useCriminalStore.getState().casesById[caseId]?.proceduralContainers ?? [];
        expect(roots.length).toBeGreaterThanOrEqual(1);
        const audit = useCriminalStore.getState().casesById[caseId]?.proceduralCanvasAudit ?? [];
        expect(audit.some((e) => String(e.summary).includes('قالب'))).toBe(true);
        useCriminalStore.getState().recordProceduralCanvasAudit(caseId, 'اختبار يدوي');
        const audit2 = useCriminalStore.getState().casesById[caseId]?.proceduralCanvasAudit ?? [];
        expect(audit2.some((e) => e.summary === 'اختبار يدوي')).toBe(true);
    });

    it('postpone_article_183 freezes case and marks journey overlay', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().concludeStage(caseId, {
            id: 'postpone-1',
            stageType: 'misdemeanor',
            decisionType: 'postpone_article_183',
            date: '2026-08-01',
            details: 'استئخار لحين الفصل في دعوى أخرى',
            defendantStatusAtDecision: 'detained',
        });
        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated?.isPrejudicialPostponed).toBe(true);
        expect(updated?.isFrozen).toBe(true);
        expect(updated?.stageJourney?.some((n) => n.phaseOverlay === 'frozen_prejudicial')).toBe(true);
    });

    it('case_split_fugitive_referral forks journey without erasing past nodes', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        useCriminalStore.getState().concludeStage(
            caseId,
            {
                id: 'split-1',
                stageType: 'investigation',
                decisionType: 'case_split_fugitive_referral',
                date: '2026-09-01',
                details: 'تجزئة بحق هارب',
                defendantStatusAtDecision: 'fugitive',
                defendantIds: defId ? [defId] : [],
            },
            { stage: 'محكمة الجنح', courtName: 'محكمة جنح', caseNumber: '55/جنح/2026' },
        );
        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated?.stageJourney?.filter((n) => n.status === 'current').length).toBe(2);
        expect(updated?.stageJourney?.some((n) => n.isForkRoot)).toBe(true);
        expect(updated?.caseStage).toBe('misdemeanor');
    });

    it('looksLikeRealCaseReference rejects keyboard-mash dossier numbers', () => {
        expect(looksLikeRealCaseReference('ىرلاىرلاىرلاى')).toBe(false);
        expect(sanitizeCaseReferenceField('ىرلاىرلاىرلاى')).toBe('');
        expect(looksLikeRealCaseReference('123/2026')).toBe(true);
    });
});
