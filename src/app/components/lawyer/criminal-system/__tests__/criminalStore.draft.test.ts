import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCriminalStore } from '../criminalStore';
import { isDefendantIdentityUnknown, canMarkDraftDefendantAsUnknown } from '../criminalUnknownDefendant';
import { resetCriminalStore, seedDraftForNewCase, readPersistedCriminalStoreRaw } from './criminalStoreTestHelpers';

describe('criminalStore', () => {
    beforeEach(() => {
        resetCriminalStore();
    });

    it('creates case from draft when all defendants are unknown', () => {
        const s = useCriminalStore.getState();
        const c1 = s.draft.complainants[0]?.id;
        if (c1) s.toggleDraftComplainantOfficeClient(c1, true);
        s.setBasicField('stage', 'مرحلة التحقيق');
        s.setLocationField('investigationCourtName', 'محكمة تحقيق الكرخ');
        s.setLocationField('baseRegisterNumberAndDate', '1/2026');
        const d1 = s.draft.defendants[0]?.id ?? '';
        s.toggleDraftDefendantIdentityUnknown(d1, true);
        s.addUnknownDefendant();
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const saved = useCriminalStore.getState().casesById[caseId];
        expect(saved).toBeTruthy();
        expect(saved.unknownDefendant).toBe(true);
        expect(saved.defendants.every((d) => isDefendantIdentityUnknown(d))).toBe(true);
    });

    it('stamps ownerLawyerId from session when creating a case', () => {
        const s = useCriminalStore.getState();
        s.setSessionOwnerLawyerId('lawyer-e2e-owner');
        const c1 = s.draft.complainants[0]?.id;
        if (c1) s.toggleDraftComplainantOfficeClient(c1, true);
        s.setBasicField('stage', 'مرحلة التحقيق');
        s.setLocationField('investigationCourtName', 'محكمة تحقيق الكرخ');
        s.setLocationField('investigationPapersAt', 'مركز شرطة');
        s.setLocationField('policeStationName', 'الجمهوري');
        const d1 = s.draft.defendants[0]?.id ?? '';
        s.setDefendantField(d1, 'fullName', 'متهم مالك');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const saved = useCriminalStore.getState().casesById[caseId];
        expect(saved?.ownerLawyerId).toBe('lawyer-e2e-owner');
    });

    it('claimUnownedCasesForSession no longer silently stamps legacy orphans', () => {
        const s = useCriminalStore.getState();
        s.setSessionOwnerLawyerId('lawyer-a');
        const c1 = s.draft.complainants[0]?.id;
        if (c1) s.toggleDraftComplainantOfficeClient(c1, true);
        s.setBasicField('stage', 'مرحلة التحقيق');
        s.setLocationField('investigationCourtName', 'محكمة تحقيق الكرخ');
        s.setLocationField('investigationPapersAt', 'مركز شرطة');
        s.setLocationField('policeStationName', 'الجمهوري');
        const d1 = s.draft.defendants[0]?.id ?? '';
        s.setDefendantField(d1, 'fullName', 'متهم أ');
        const ownedId = useCriminalStore.getState().createCaseFromDraft();

        // محاكاة إضبارة تراثية بلا مالك
        useCriminalStore.setState((state) => ({
            casesById: {
                ...state.casesById,
                orphan: {
                    ...state.casesById[ownedId],
                    id: 'orphan',
                    ownerLawyerId: undefined,
                },
            },
        }));

        const claimed = useCriminalStore.getState().claimUnownedCasesForSession('lawyer-a');
        expect(claimed).toBe(0);
        expect(useCriminalStore.getState().casesById.orphan?.ownerLawyerId).toBeUndefined();
        expect(useCriminalStore.getState().casesById[ownedId]?.ownerLawyerId).toBe('lawyer-a');
    });

    it('claimCriminalCaseOwnership stamps orphan case on explicit user action', () => {
        const s = useCriminalStore.getState();
        s.setSessionOwnerLawyerId('lawyer-claim');
        const c1 = s.draft.complainants[0]?.id;
        if (c1) s.toggleDraftComplainantOfficeClient(c1, true);
        s.setBasicField('stage', 'مرحلة التحقيق');
        s.setLocationField('investigationCourtName', 'محكمة تحقيق الكرخ');
        s.setLocationField('investigationPapersAt', 'مركز شرطة');
        s.setLocationField('policeStationName', 'الجمهوري');
        const d1 = s.draft.defendants[0]?.id ?? '';
        s.setDefendantField(d1, 'fullName', 'متهم تراثي');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.setState((state) => ({
            casesById: {
                ...state.casesById,
                [caseId]: { ...state.casesById[caseId], ownerLawyerId: undefined },
            },
        }));

        const err = useCriminalStore.getState().claimCriminalCaseOwnership(caseId);
        expect(err).toBeNull();
        expect(useCriminalStore.getState().casesById[caseId]?.ownerLawyerId).toBe('lawyer-claim');
    });

    it('addUnknownDefendant works with only unknown defendants in draft', () => {
        const s = useCriminalStore.getState();
        const primaryId = s.draft.defendants[0]?.id ?? '';
        s.toggleDraftDefendantIdentityUnknown(primaryId, true);
        s.addUnknownDefendant();
        s.addUnknownDefendant();
        const draft = useCriminalStore.getState().draft;
        expect(draft.defendants.filter((d) => isDefendantIdentityUnknown(d)).length).toBe(3);
    });

    it('addUnknownDefendant adds multiple unknowns when identified anchor exists', () => {
        const s = useCriminalStore.getState();
        const id = s.draft.defendants[0]?.id ?? '';
        s.setDefendantField(id, 'fullName', 'علي محمد');
        s.addUnknownDefendant();
        s.addUnknownDefendant();
        const draft = useCriminalStore.getState().draft;
        expect(draft.defendants.filter((d) => isDefendantIdentityUnknown(d)).length).toBe(2);
    });

    it('addUnknownDefendant works when primary is unknown and second identified slot exists', () => {
        const s = useCriminalStore.getState();
        const primaryId = s.draft.defendants[0]?.id ?? '';
        s.toggleDraftDefendantIdentityUnknown(primaryId, true);
        s.addDefendant();
        s.addUnknownDefendant();
        s.addUnknownDefendant();
        const draft = useCriminalStore.getState().draft;
        expect(draft.defendants.filter((d) => isDefendantIdentityUnknown(d)).length).toBe(3);
    });

    it('toggleDraftDefendantIdentityUnknown converts empty second defendant shell to unknown', () => {
        const s = useCriminalStore.getState();
        const firstId = s.draft.defendants[0]?.id ?? '';
        s.setDefendantField(firstId, 'fullName', 'علي محمد');
        s.addDefendant();
        const draftBefore = useCriminalStore.getState().draft;
        const secondId =
            draftBefore.defendants.find((d) => d.id !== firstId)?.id ?? '';
        expect(draftBefore.defendants.length).toBe(2);
        expect(canMarkDraftDefendantAsUnknown(draftBefore.defendants, secondId)).toBe(true);
        useCriminalStore.getState().toggleDraftDefendantIdentityUnknown(secondId, true);
        const draft = useCriminalStore.getState().draft;
        expect(draft.defendants.some((d) => d.id === secondId && isDefendantIdentityUnknown(d))).toBe(
            true,
        );
        expect(draft.defendants.some((d) => d.id === firstId && !isDefendantIdentityUnknown(d))).toBe(
            true,
        );
    });

    it('creates case from draft and persists it', async () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const saved = useCriminalStore.getState().casesById[caseId];
        expect(saved).toBeTruthy();
        expect(saved.basics.stage).toBe('محكمة الجنح');
        expect(saved.legalArticleHistory.length).toBe(1);

        await vi.waitFor(
            async () => {
                const raw = await readPersistedCriminalStoreRaw();
                if (!raw) return false;
                const parsed = JSON.parse(raw) as { state?: { casesById?: Record<string, unknown> } };
                return Boolean(parsed?.state?.casesById?.[caseId]);
            },
            { timeout: 3000, interval: 25 },
        );
    });

    it('creates one dossier for mixed adult, juvenile, and unknown (no auto-split)', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const s = useCriminalStore.getState();
        const adultId = s.draft.defendants[0]?.id ?? '';
        s.setDefendantField(adultId, 'fullName', 'علي بالغ');
        s.setDefendantField(adultId, 'isJuvenile', false);
        s.addDefendant();
        const juvenileId =
            useCriminalStore.getState().draft.defendants.find((d) => d.id !== adultId)?.id ?? '';
        s.setDefendantField(juvenileId, 'fullName', 'سامي حدث');
        s.setDefendantField(juvenileId, 'isJuvenile', true);
        s.setDefendantField(juvenileId, 'birthYear', '2010');
        s.addUnknownDefendant();

        const beforeCount = Object.keys(useCriminalStore.getState().casesById).length;
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const after = useCriminalStore.getState().casesById;

        expect(Object.keys(after).length).toBe(beforeCount + 1);
        expect(after[caseId]).toBeTruthy();
        expect(after[caseId]?.severedChildCaseIds ?? []).toEqual([]);
        expect(after[caseId]?.parentCaseId).toBeFalsy();
        const defs = after[caseId]?.defendants ?? [];
        expect(defs.some((d) => Boolean(d.isJuvenile) && String(d.fullName).includes('سامي'))).toBe(true);
        expect(defs.some((d) => !d.isJuvenile && String(d.fullName).includes('علي'))).toBe(true);
        expect(defs.some((d) => isDefendantIdentityUnknown(d))).toBe(true);
        expect(
            (after[caseId]?.timelineEvents ?? []).some((e) =>
                String(e.category ?? '').includes('تفريق تلقائي'),
            ),
        ).toBe(false);
    });

});
