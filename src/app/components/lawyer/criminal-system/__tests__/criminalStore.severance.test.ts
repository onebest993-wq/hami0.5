import { beforeEach, describe, expect, it } from 'vitest';
import { useCriminalStore } from '../criminalStore';
import { resetCriminalStore, seedDraftForNewCase } from './criminalStoreTestHelpers';

describe('criminalStore', () => {
    beforeEach(() => {
        resetCriminalStore();
    });

    it('commitSeveranceFromDossier with judicial draft registers severance decision on parent', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const s = useCriminalStore.getState();
        const c1 = s.draft.complainants[0]?.id;
        if (c1) {
            s.setComplainantField(c1, 'fullName', 'شاكي');
        }
        const d1 = s.draft.defendants[0]?.id;
        s.addDefendant();
        const d2 = useCriminalStore.getState().draft.defendants[1]?.id;
        if (d1) {
            s.setDefendantField(d1, 'fullName', 'علي');
        }
        if (d2) {
            s.setDefendantField(d2, 'fullName', 'باسم');
        }
        const parentId = useCriminalStore.getState().createCaseFromDraft();

        const began = useCriminalStore.getState().beginSeveranceFromDossier(parentId, [d2!], {
            judicialSeveranceDraft: {
                requestDate: '2026-05-20',
                lawyerNote: 'قرار تفريق من اليوميات',
                isAppealable: true,
            },
        });
        expect(began).toBe(true);
        const pendingDraft = useCriminalStore.getState().pendingSeveranceContext?.formDraft;
        expect(
            pendingDraft?.complainants.some((c) => String(c.fullName ?? '').trim() === 'شاكي'),
        ).toBe(true);
        expect(useCriminalStore.getState().resumePendingSeveranceForm()).toBe(true);

        const childId = useCriminalStore.getState().commitSeveranceFromDossier();
        expect(childId).toBeTruthy();

        const parent = useCriminalStore.getState().casesById[parentId];
        expect(parent?.defendants?.some((d) => d.id === d2)).toBe(false);
        expect(parent?.severedChildCaseIds).toContain(childId);
        const severanceReq = parent?.lawyerRequests?.find((r) =>
            String(r.proceduralTemplate ?? r.type ?? '').includes('تفريق'),
        );
        expect(severanceReq?.status).toBe('executed');
        expect(severanceReq?.lawyerNote).toContain('قرار تفريق من اليوميات');
        expect(severanceReq?.lawyerNote).toContain('المتهمون المشمولون: باسم');
        expect(severanceReq?.defendantIds).toBeUndefined();
        expect(
            parent?.judicialDecisions?.some((d) =>
                String(d.proceduralTemplate ?? d.title ?? '').includes('تفريق'),
            ),
        ).toBe(true);
    });

    it('commitSeveranceFromDossier migrates only defendant-scoped requests and statements not timeline', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const s = useCriminalStore.getState();
        const d1 = s.draft.defendants[0]?.id;
        s.addDefendant();
        const d2 = useCriminalStore.getState().draft.defendants[1]?.id;
        if (d1) s.setDefendantField(d1, 'fullName', 'علي');
        if (d2) s.setDefendantField(d2, 'fullName', 'باسم');
        const parentId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().addTimelineEvent(parentId, {
            id: 'tl-shared',
            date: '2026-04-01',
            type: 'investigation',
            category: 'تدوين',
            title: 'حدث عام',
            description: 'لا يُرحّل',
        });
        useCriminalStore.getState().addTimelineEvent(parentId, {
            id: 'tl-d2-only',
            date: '2026-04-02',
            type: 'decision',
            category: 'قرار',
            title: 'قرار على باسم',
            description: 'حصري',
            defendantIds: [d2!],
        });
        useCriminalStore.setState((state) => {
            const parent = state.casesById[parentId];
            if (!parent) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [parentId]: {
                        ...parent,
                        lawyerRequests: [
                            {
                                id: 'req-d2',
                                requestDate: '2026-04-03',
                                type: 'حبس احتياطي',
                                lawyerNote: 'طلب باسم',
                                status: 'executed',
                                defendantIds: [d2!],
                            },
                            {
                                id: 'req-all',
                                requestDate: '2026-04-04',
                                type: 'طلب عام',
                                lawyerNote: 'مشترك',
                                status: 'pending',
                                defendantIds: [d1!, d2!],
                            },
                        ],
                        statements: [
                            {
                                id: 'st-d2',
                                date: '2026-04-05',
                                giverType: 'defendant',
                                giverName: 'باسم',
                                content: 'إفادة باسم',
                            },
                            {
                                id: 'st-d1',
                                date: '2026-04-06',
                                giverType: 'defendant',
                                giverName: 'علي',
                                content: 'إفادة علي',
                            },
                        ],
                    },
                },
            };
        });

        useCriminalStore.getState().beginSeveranceFromDossier(parentId, [d2!]);
        useCriminalStore.getState().resumePendingSeveranceForm();
        const childId = useCriminalStore.getState().commitSeveranceFromDossier();
        expect(childId).toBeTruthy();

        const parent = useCriminalStore.getState().casesById[parentId];
        const child = useCriminalStore.getState().casesById[childId!];
        expect(parent?.timelineEvents?.some((e) => e.id === 'tl-shared')).toBe(true);
        expect(parent?.timelineEvents?.some((e) => e.id === 'tl-d2-only')).toBe(false);
        expect(child?.timelineEvents?.some((e) => e.id === 'tl-d2-only')).toBe(true);
        expect(child?.timelineEvents?.some((e) => e.id === 'tl-shared')).toBe(false);
        expect(child?.lawyerRequests?.some((r) => r.id === 'req-d2')).toBe(true);
        expect(child?.lawyerRequests?.some((r) => r.id === 'req-all')).toBe(false);
        expect(parent?.lawyerRequests?.some((r) => r.id === 'req-all')).toBe(true);
        const childDefId = child?.defendants?.[0]?.id;
        const migratedReq = child?.lawyerRequests?.find((r) => r.id === 'req-d2');
        expect(migratedReq?.defendantIds).toEqual(childDefId ? [childDefId] : undefined);
        expect(migratedReq?.defendantIds?.includes(d2!)).toBe(false);
        expect(child?.statements?.some((st) => st.id === 'st-d2')).toBe(true);
        expect(child?.statements?.some((st) => st.id === 'st-d1')).toBe(false);
    });

    it('setBasicField(stage) preserves complainant and defendant names entered before stage', () => {
        useCriminalStore.getState().prepareNormalCriminalCaseForm();
        const s = useCriminalStore.getState();
        const compId = s.draft.complainants[0]?.id;
        const defId = s.draft.defendants[0]?.id;
        expect(compId).toBeTruthy();
        expect(defId).toBeTruthy();

        s.setComplainantField(compId!, 'fullName', 'سعد عبد الكريم محمود');
        s.setComplainantField(compId!, 'phone', '07701234567');
        s.setDefendantField(defId!, 'fullName', 'علي حسن جاسم');

        s.setBasicField('stage', 'مرحلة التحقيق');

        const after = useCriminalStore.getState().draft;
        expect(after.complainants[0]?.fullName).toBe('سعد عبد الكريم محمود');
        expect(after.complainants[0]?.phone).toBe('07701234567');
        expect(after.defendants[0]?.fullName).toBe('علي حسن جاسم');
        expect(after.basics.stage).toBe('مرحلة التحقيق');
    });

    it('prepareNormalCriminalCaseForm clears pending severance context', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const s = useCriminalStore.getState();
        const d1 = s.draft.defendants[0]?.id;
        s.addDefendant();
        const d2 = useCriminalStore.getState().draft.defendants[1]?.id;
        if (d1) s.setDefendantField(d1, 'fullName', 'علي');
        if (d2) s.setDefendantField(d2, 'fullName', 'باسم');
        const parentId = useCriminalStore.getState().createCaseFromDraft();
        const began = useCriminalStore.getState().beginSeveranceFromDossier(parentId, [d2!]);
        expect(began).toBe(true);
        expect(useCriminalStore.getState().pendingSeveranceContext).not.toBeNull();

        useCriminalStore.getState().prepareNormalCriminalCaseForm();
        expect(useCriminalStore.getState().pendingSeveranceContext).toBeNull();
    });

    it('beginSeverance copies legacy defendant name field into formDraft fullName', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const s = useCriminalStore.getState();
        const d1 = s.draft.defendants[0]?.id;
        s.addDefendant();
        const d2 = useCriminalStore.getState().draft.defendants[1]?.id;
        if (d1) s.setDefendantField(d1, 'fullName', 'علي');
        if (d2) s.setDefendantField(d2, 'fullName', 'باسم');
        const parentId = useCriminalStore.getState().createCaseFromDraft();
        const parentBefore = useCriminalStore.getState().casesById[parentId];
        const legacyDef = parentBefore?.defendants?.find((d) => d.id === d2);
        if (!legacyDef) throw new Error('missing defendant');
        useCriminalStore.setState((state) => ({
            casesById: {
                ...state.casesById,
                [parentId]: {
                    ...parentBefore!,
                    defendants: parentBefore!.defendants!.map((d) =>
                        d.id === d2
                            ? ({ ...d, fullName: '', name: 'باسم من الحقل القديم' } as typeof d)
                            : d,
                    ),
                },
            },
        }));

        const began = useCriminalStore.getState().beginSeveranceFromDossier(parentId, [d2!]);
        expect(began).toBe(true);
        const ctx = useCriminalStore.getState().pendingSeveranceContext;
        expect(String(ctx?.defendantSnapshots[0]?.fullName ?? '')).toContain('باسم');
        expect(
            ctx?.formDraft.defendants.some((d) => String(d.fullName ?? '').includes('باسم')),
        ).toBe(true);
        expect(useCriminalStore.getState().resumePendingSeveranceForm()).toBe(true);
        expect(
            useCriminalStore.getState().draft.defendants.some((d) => String(d.fullName ?? '').includes('باسم')),
        ).toBe(true);
    });

    it('stashPendingSeveranceForm does not overwrite named formDraft with empty draft', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const s = useCriminalStore.getState();
        const d1 = s.draft.defendants[0]?.id;
        s.addDefendant();
        const d2 = useCriminalStore.getState().draft.defendants[1]?.id;
        if (d1) s.setDefendantField(d1, 'fullName', 'علي');
        if (d2) s.setDefendantField(d2, 'fullName', 'باسم');
        const parentId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().beginSeveranceFromDossier(parentId, [d2!]);
        useCriminalStore.getState().resumePendingSeveranceForm();

        useCriminalStore.setState((state) => ({
            draft: {
                ...state.draft,
                defendants: state.draft.defendants.map((d) => ({ ...d, fullName: '' })),
            },
        }));
        useCriminalStore.getState().stashPendingSeveranceForm();

        const savedName = useCriminalStore
            .getState()
            .pendingSeveranceContext?.formDraft.defendants.find((d) => String(d.fullName ?? '').includes('باسم'));
        expect(savedName).toBeTruthy();
    });

    it('beginSeverance keeps normal draft pristine until resume', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const s = useCriminalStore.getState();
        const d1 = s.draft.defendants[0]?.id;
        s.addDefendant();
        const d2 = useCriminalStore.getState().draft.defendants[1]?.id;
        if (d1) s.setDefendantField(d1, 'fullName', 'علي');
        if (d2) s.setDefendantField(d2, 'fullName', 'باسم');
        const parentId = useCriminalStore.getState().createCaseFromDraft();

        const began = useCriminalStore.getState().beginSeveranceFromDossier(parentId, [d2!]);
        expect(began).toBe(true);

        const afterBegin = useCriminalStore.getState();
        expect(afterBegin.pendingSeveranceContext?.formDraft.defendants.length).toBeGreaterThan(0);
        expect(afterBegin.draft.defendants.every((d) => !String(d.fullName ?? '').trim())).toBe(true);

        expect(useCriminalStore.getState().resumePendingSeveranceForm()).toBe(true);
        expect(
            useCriminalStore.getState().draft.defendants.some((d) => String(d.fullName ?? '').trim()),
        ).toBe(true);
    });

    it('severCase spawns child dossier and removes defendants from parent', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const s = useCriminalStore.getState();
        const c1 = s.draft.complainants[0]?.id;
        if (c1) s.setComplainantField(c1, 'fullName', 'مشتكي الأم');
        const d1 = s.draft.defendants[0]?.id;
        s.addDefendant();
        const d2 = useCriminalStore.getState().draft.defendants[1]?.id;
        if (d1) {
            s.setDefendantField(d1, 'fullName', 'علي');
            s.setDefendantField(d2!, 'fullName', 'باسم');
        }
        const parentId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().addTimelineEvent(parentId, {
            id: 'tl-pre',
            date: '2026-04-01',
            type: 'investigation',
            category: 'تدوين',
            title: 'قبل التفريق',
            description: 'حدث قديم',
        });

        const childId = useCriminalStore.getState().severCase(parentId, {
            defendantIds: [d2!],
            severanceReason: 'distinct_acts',
            date: '2026-05-10',
            details: 'تفريق لاختلاف الأفعال',
        });
        expect(childId).toBeTruthy();

        const parent = useCriminalStore.getState().casesById[parentId];
        const child = useCriminalStore.getState().casesById[childId!];
        expect(parent?.defendants?.some((d) => d.id === d2)).toBe(false);
        expect(parent?.defendants?.some((d) => d.id === d1)).toBe(true);
        expect(parent?.severedChildCaseIds).toContain(childId);
        expect(child?.isSeveredChild).toBe(true);
        expect(child?.parentCaseId).toBe(parentId);
        expect(child?.severanceReason).toBe('distinct_acts');
        expect(child?.defendants?.length).toBe(1);
        expect(child?.complainants?.some((c) => String(c.fullName ?? '').trim())).toBe(true);
        const display = useCriminalStore.getState().getCaseForDisplay(childId!);
        expect(display?.complainants?.length).toBeGreaterThan(0);
        expect(display?.timelineEvents?.some((e) => e.id === 'tl-pre')).toBe(false);
    });
});
