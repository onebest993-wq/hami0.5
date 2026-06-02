import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { PRIVATE_RIGHT_WAIVER_TIMELINE_CATEGORY, isInvestigationStoredStage } from './criminalStageUtils';
import {
    isCorruptTimelineEvent,
    looksLikeRealCaseReference,
    resolveMergedCaseIds,
    sanitizeCaseReferenceField,
    useCriminalStore,
    type CriminalCaseStage,
    type InvestigationLog,
    type LawyerRequest,
    type LegalArticleChange,
    type StageConclusion,
    type Statement,
    type TimelineEvent,
} from './criminalStore';
import { isDefendantIdentityUnknown, canMarkDraftDefendantAsUnknown } from './criminalUnknownDefendant';

function resetCriminalStore() {
    SecureStoreService.deleteItemSync('hami:criminal:store');
    useCriminalStore.setState({ casesById: {} });
    useCriminalStore.getState().resetDraft();
}

async function readPersistedCriminalStoreRaw(): Promise<string | null> {
    await SecureStoreService.ensurePersistedReady();
    await new Promise((r) => setTimeout(r, 0));
    return SecureStoreService.getItem('hami:criminal:store');
}

function seedDraftForNewCase(stage: CriminalCaseStage) {
    const s = useCriminalStore.getState();
    const c1 = useCriminalStore.getState().draft.complainants[0]?.id;
    if (c1) {
        s.toggleDraftComplainantOfficeClient(c1, true);
    }
    s.setBasicField('stage', stage);
    s.setLocationField('investigationCourtName', 'محكمة تحقيق الكرخ');
    s.setLocationField('baseRegisterNumberAndDate', '1/2026 في 2026-05-19');
    s.setLocationField('courtName', isInvestigationStoredStage(stage) ? '' : 'محكمة جنح الكرخ');
    s.setLocationField('caseNumber', isInvestigationStoredStage(stage) ? '' : '123/ج/2026');
    if (!isInvestigationStoredStage(stage)) {
        s.setBasicField('crimeType', 'جنحة');
        s.setBasicField('legalArticle', '413 ق.ع');
    }
    const d1 = useCriminalStore.getState().draft.defendants[0]?.id;
    if (d1) {
        s.setDefendantField(d1, 'fullName', 'محمد قاسم عبد');
        s.setDefendantField(d1, 'birthYear', '1990');
        s.setDefendantField(d1, 'status', 'موقوف');
        s.setDefendantField(d1, 'detentionAuthority', 'سجن التوقيف المركزي');
        s.setDefendantField(d1, 'detentionExpiryDate', '2026-06-01');
    }
}

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

    it('concludes investigation with referral by updating stage in-place (no cloning)', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        const conclusion: StageConclusion = {
            id: 'c1',
            stageType: 'investigation',
            decisionType: 'referral',
            date: '2026-05-19',
            details: 'قرار إحالة للدعوى',
            defendantStatusAtDecision: 'detained',
        };

        const spawned = useCriminalStore.getState().concludeStage(caseId, conclusion, {
            stage: 'محكمة الجنح',
            courtName: 'محكمة جنح الكرخ',
            caseNumber: '123/ج/2026',
        });

        expect(spawned).toBeNull();

        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated.isFrozen).toBeUndefined();
        expect(updated.finalDecision?.decisionType).toBe('referral');
        expect(updated.caseStage).toBe('misdemeanor');
        expect(updated.isInvestigationLocked).toBe(true);
        expect(updated.courtCaseNumber).toBe('123/ج/2026');
        expect(updated.basics.stage).toBe('محكمة الجنح');
        expect(updated.location.courtName).toBe('محكمة جنح الكرخ');
        expect(updated.location.caseNumber).toBe('123/ج/2026');
        expect(updated.timelineEvents.length).toBe(1);
        expect(updated.timelineEvents[0]?.category).toBe('قرار إحالة إلى محكمة الموضوع');
    });

    it('partial investigation referral forks journey and keeps case in investigation', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        useCriminalStore.getState().addDefendant();
        const draftDefs = useCriminalStore.getState().draft.defendants;
        const d2 = draftDefs[1]?.id;
        if (d2) {
            useCriminalStore.getState().setDefendantField(d2, 'fullName', 'علاء ولاء');
            useCriminalStore.getState().setDefendantField(d2, 'birthYear', '1992');
            useCriminalStore.getState().setDefendantField(d2, 'status', 'مكفل');
        }
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const d1 = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        expect(d1).toBeTruthy();
        expect(d2).toBeTruthy();

        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'misdemeanor',
            referralMisdemeanorType: 'موجزة',
            courtName: 'محكمة جنح الكرخ',
            courtCaseNumber: '200/ج/2026',
            decisionDate: '2026-05-21',
            decisionDetails: 'إحالة جزئية للمتهم الأول',
            defendantStatusAtDecision: 'bailed',
            defendantIds: [d1],
        });

        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated.finalDecision).toBeUndefined();
        expect(updated.isInvestigationLocked).not.toBe(true);
        expect(updated.caseStage).toBe('investigation');
        expect(updated.defendants?.find((d) => d.id === d1)?.personalStage).toBe('referred_to_trial');
        expect(updated.defendants?.find((d) => d.id === d2)?.personalStage).toBe('under_investigation');
        const currentNodes = (updated.stageJourney ?? []).filter((n) => n.status === 'current');
        expect(currentNodes.length).toBe(2);
        expect(updated.timelineEvents.some((e) => e.title.includes('إحالة جزئية'))).toBe(true);
    });

    it('blocks applyInvestigationReferral when scope mixes juvenile and adult defendants', () => {
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

        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const before = useCriminalStore.getState().casesById[caseId];

        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'misdemeanor',
            referralMisdemeanorType: 'موجزة',
            courtName: 'محكمة جنح الكرخ',
            courtCaseNumber: '300/ج/2026',
            decisionDate: '2026-05-21',
            decisionDetails: 'محاولة إحالة مختلطة',
            defendantStatusAtDecision: 'bailed',
            defendantIds: [adultId, juvenileId],
        });

        const after = useCriminalStore.getState().casesById[caseId];
        expect(after).toEqual(before);
        expect(after?.defendants?.every((d) => d.personalStage !== 'referred_to_trial')).toBe(true);
    });

    it('applyInvestigationReferral applies per-defendant statuses when provided', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        useCriminalStore.getState().addDefendant();
        const draftDefs = useCriminalStore.getState().draft.defendants;
        const d2 = draftDefs[1]?.id;
        if (d2) {
            useCriminalStore.getState().setDefendantField(d2, 'fullName', 'علاء ولاء');
            useCriminalStore.getState().setDefendantField(d2, 'birthYear', '1992');
        }
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const d1 = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        expect(d1).toBeTruthy();
        expect(d2).toBeTruthy();

        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'misdemeanor',
            referralMisdemeanorType: 'موجزة',
            courtName: 'محكمة جنح الكرخ',
            courtCaseNumber: '201/ج/2026',
            decisionDate: '2026-05-22',
            decisionDetails: 'إحالة بحالات فردية',
            defendantStatusAtDecision: 'bailed',
            defendantIds: [d1, d2],
            defendantStatusesByDefendantId: {
                [d1]: 'detained',
                [d2]: 'bailed',
            },
        });

        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated.defendants?.find((d) => d.id === d1)?.status).toBe('موقوف');
        expect(updated.defendants?.find((d) => d.id === d2)?.status).toBe('مكفل');
        expect(updated.finalDecision?.defendantStatusesByDefendantId).toEqual({
            [d1]: 'detained',
            [d2]: 'bailed',
        });
    });

    it('applyInvestigationReferral works from juvenile investigation stored stage', () => {
        seedDraftForNewCase('تحقيق الأحداث');
        useCriminalStore.getState().setDefendantField(
            useCriminalStore.getState().draft.defendants[0]?.id ?? '',
            'isJuvenile',
            true,
        );
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'juvenile',
            courtName: 'محكمة الأحداث',
            courtCaseNumber: '10/2026',
            decisionDate: '2026-05-23',
            decisionDetails: 'إحالة حدث',
            defendantStatusAtDecision: 'bailed',
            defendantIds: defendantId ? [defendantId] : [],
        });
        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated.basics.stage).toBe('محكمة الأحداث');
        expect(updated.caseStage).toBe('misdemeanor');
        const trialNode = updated.stageJourney?.find((n) => n.status === 'current');
        expect(trialNode?.label).toBe('محكمة الأحداث');
        expect(trialNode?.label).not.toMatch(/جنح|جنايات|:|645/);
    });

    it('misdemeanor to felony referral appends journey, isolates decision node, and records appealable order', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const before = useCriminalStore.getState().casesById[caseId]!;
        const misdNodeId = before.stageJourney?.find((n) => n.status === 'current')?.id ?? '';

        const err = useCriminalStore.getState().issueStageDecision(
            caseId,
            {
                id: 'ref_felony_1',
                stageType: 'misdemeanor',
                decisionType: 'misdemeanor_to_felony_jurisdiction',
                date: '2026-06-10',
                details: 'عدم اختصاص نوعي — إحالة للجنايات',
                defendantStatusAtDecision: 'bailed',
            },
            {
                stage: 'محكمة الجنايات',
                courtName: 'محكمة جنايات الكرخ',
                caseNumber: '88/جنايات/2026',
            },
        );
        expect(err).toBeNull();

        const updated = useCriminalStore.getState().casesById[caseId]!;
        expect(updated.caseStage).toBe('felony');
        expect(updated.courtCaseNumber).toBe('88/جنايات/2026');
        expect(updated.finalDecision).toBeUndefined();
        const journey = updated.stageJourney ?? [];
        expect(journey.filter((n) => n.status === 'past').some((n) => n.id === misdNodeId)).toBe(true);
        expect(journey.filter((n) => n.status === 'current').some((n) => n.stage === 'felony')).toBe(true);
        const referralReq = (updated.lawyerRequests ?? []).find((r) => r.id === 'route_ref_felony_1');
        expect(referralReq?.isAppealable).toBe(true);
        expect(referralReq?.proceduralNodeId).toBe(misdNodeId);
        expect(referralReq?.status).toBe('executed');
    });

    it('creates verdict card when stage closes with acquittal', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().issueStageDecision(caseId, {
            id: 'acq1',
            stageType: 'misdemeanor',
            decisionType: 'acquittal',
            date: '2026-06-15',
            details: 'حكم بالبراءة',
            defendantStatusAtDecision: 'bailed',
        });

        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated.verdictCards?.length).toBe(1);
        expect(updated.verdictCards?.[0]?.outcome).toBe('acquittal');
        expect(updated.verdictCards?.[0]?.appealDeadline).toBe('2026-07-15');
    });

    it('registerStageFinalDecision enriches verdict card with stage final fields', () => {
        seedDraftForNewCase('محكمة الجنايات');
        useCriminalStore.getState().setBasicField('crimeType', 'جناية');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        const err = useCriminalStore.getState().registerStageFinalDecision(
            caseId,
            {
                kind: 'conviction_penalty',
                issuedAt: '2026-06-20',
                presenceType: 'وجاهي',
                decisionText: '',
                decisionPath: 'full',
                convictionText: 'إدانة بالسرقة',
                penalty: {
                    masterKind: 'severe_imprisonment',
                    years: 2,
                    months: 3,
                },
            },
            { defendantStatusAtDecision: 'detained' },
        );
        expect(err).toBeNull();

        const card = useCriminalStore.getState().casesById[caseId]?.verdictCards?.[0];
        expect(card?.finalDecisionKind).toBe('conviction_penalty');
        expect(card?.presenceType).toBe('وجاهي');
        expect(card?.penalty?.years).toBe(2);
        expect(card?.penalty?.months).toBe(3);
    });

    it('blocks deleteStatement when investigation is locked', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const statement: Statement = {
            id: 'st_lock',
            date: '2026-05-19',
            giverType: 'complainant',
            giverName: 'مشتكي',
            content: 'إفادة',
        };
        useCriminalStore.getState().addStatement(caseId, statement);

        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'misdemeanor',
            referralMisdemeanorType: 'موجزة',
            courtName: 'محكمة جنح الكرخ',
            courtCaseNumber: '123/ج/2026',
            decisionDate: '2026-05-20',
            decisionDetails: 'إحالة كاملة',
            defendantStatusAtDecision: 'bailed',
            defendantIds: [useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? ''],
        });

        useCriminalStore.getState().deleteStatement(caseId, 'st_lock');
        expect(useCriminalStore.getState().casesById[caseId]?.statements?.length).toBe(1);
    });

    it('blocks applyInvestigationReferral for unknown defendant dossiers', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        useCriminalStore.getState().setUnknownDefendant(true);
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const d1 = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';

        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'misdemeanor',
            referralMisdemeanorType: 'موجزة',
            courtName: 'محكمة جنح الكرخ',
            courtCaseNumber: '123/ج/2026',
            decisionDate: '2026-05-20',
            decisionDetails: 'محاولة إحالة',
            defendantStatusAtDecision: 'bailed',
            defendantIds: d1 ? [d1] : [],
        });

        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated.caseStage).toBe('investigation');
        expect(updated.finalDecision).toBeUndefined();
    });

    it('allows applyInvestigationReferral without court case number', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'misdemeanor',
            referralMisdemeanorType: 'موجزة',
            courtName: 'محكمة جنح الكرخ',
            courtCaseNumber: '',
            decisionDate: '2026-05-20',
            decisionDetails: 'إحالة بدون رقم دعوى',
            defendantStatusAtDecision: 'bailed',
            defendantIds: defendantId ? [defendantId] : [],
        });
        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated.caseStage).toBe('misdemeanor');
        expect(updated.location.caseNumber).toBe('');
    });

    it('referCaseToTrial appends stage journey and keeps referral metadata', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const before = useCriminalStore.getState().casesById[caseId];
        useCriminalStore.getState().referCaseToTrial(
            caseId,
            { decisionNumber: '12/إحالة', decisionDate: '2026-05-20' },
            { stage: 'محكمة الجنايات', courtName: 'محكمة جنايات الكرخ', caseNumber: '77/ج/2026' },
        );
        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated.caseStage).toBe('felony');
        expect(updated.location.caseNumber).toBe('77/ج/2026');
        expect((updated.stageJourney ?? []).length).toBeGreaterThan((before.stageJourney ?? []).length);
    });

    it('keeps investigation/trial records isolated across referral -> return -> referral cycle', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';

        useCriminalStore.getState().addStatement(caseId, {
            id: 'st_inv_1',
            date: '2026-02-01',
            giverType: 'defendant',
            giverName: 'المتهم 1',
            content: 'إفادة تحقيق أولى',
        });
        useCriminalStore.getState().addOrUpdateRequest(caseId, {
            id: 'rq_inv_1',
            requestDate: '2026-02-02',
            type: 'طلب تحقيق',
            status: 'pending',
        });

        useCriminalStore.setState((state) => {
            const c = state.casesById[caseId];
            if (!c) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...c,
                        judicialDecisions: [
                            ...(Array.isArray(c.judicialDecisions) ? c.judicialDecisions : []),
                            {
                                id: 'jd_inv_1',
                                issuedAt: '2026-02-03',
                                title: 'قرار تحقيق أول',
                                summary: 'قرار تحقيق أول',
                                decisionType: 'preparatory',
                            },
                        ],
                    },
                },
            };
        });

        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'misdemeanor',
            referralMisdemeanorType: 'موجزة',
            courtName: 'محكمة جنح الكرخ',
            courtCaseNumber: '101/ج/2026',
            decisionDate: '2026-03-01',
            decisionDetails: 'إحالة أولى',
            defendantStatusAtDecision: 'bailed',
            defendantIds: defId ? [defId] : [],
        });

        useCriminalStore.getState().addStatement(caseId, {
            id: 'st_trial_1',
            date: '2026-03-10',
            giverType: 'defendant',
            giverName: 'المتهم 1',
            content: 'إفادة بعد الإحالة الأولى',
        });
        useCriminalStore.getState().addOrUpdateRequest(caseId, {
            id: 'rq_trial_1',
            requestDate: '2026-03-11',
            type: 'طلب محاكمة أول',
            status: 'pending',
        });

        useCriminalStore.getState().initiateCassationProceeding(caseId, {
            cassationType: 'criminal_cassation_misdemeanor',
            filedAt: '2026-04-01',
            details: 'تمييز أول',
            cassationNumber: 'ST/LOOP/1',
            panelName: 'هيئة التمييز',
            appellantDefendantIds: defId ? [defId] : [],
        });
        useCriminalStore.getState().recordCassationResult(caseId, {
            result: 'quash_remand',
            date: '2026-05-01',
            details: 'نقض وإعادة للتحقيق',
            isObjectiveGrounds: true,
            remandTargetStage: 'investigation',
        });

        useCriminalStore.getState().addStatement(caseId, {
            id: 'st_inv_2',
            date: '2026-05-10',
            giverType: 'defendant',
            giverName: 'المتهم 1',
            content: 'إفادة تحقيق ثانية',
        });
        useCriminalStore.getState().addOrUpdateRequest(caseId, {
            id: 'rq_inv_2',
            requestDate: '2026-05-11',
            type: 'طلب تحقيق ثان',
            status: 'pending',
        });

        useCriminalStore.setState((state) => {
            const c = state.casesById[caseId];
            if (!c) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...c,
                        judicialDecisions: [
                            ...(Array.isArray(c.judicialDecisions) ? c.judicialDecisions : []),
                            {
                                id: 'jd_inv_2',
                                issuedAt: '2026-05-12',
                                title: 'قرار تحقيق ثان',
                                summary: 'قرار تحقيق ثان',
                                decisionType: 'preparatory',
                            },
                        ],
                    },
                },
            };
        });

        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'felony',
            courtName: 'محكمة جنايات الكرخ',
            courtCaseNumber: '202/جنايات/2026',
            decisionDate: '2026-06-01',
            decisionDetails: 'إحالة ثانية',
            defendantStatusAtDecision: 'detained',
            defendantIds: defId ? [defId] : [],
        });

        useCriminalStore.getState().addStatement(caseId, {
            id: 'st_trial_2',
            date: '2026-06-10',
            giverType: 'defendant',
            giverName: 'المتهم 1',
            content: 'إفادة بعد الإحالة الثانية',
        });
        useCriminalStore.getState().addOrUpdateRequest(caseId, {
            id: 'rq_trial_2',
            requestDate: '2026-06-11',
            type: 'طلب محاكمة ثان',
            status: 'pending',
        });

        const updated = useCriminalStore.getState().casesById[caseId]!;
        const journey = updated.stageJourney ?? [];
        const statements = updated.statements ?? [];
        const requests = updated.lawyerRequests ?? [];
        const decisions = updated.judicialDecisions ?? [];
        const referralEvents = (updated.timelineEvents ?? []).filter((e) =>
            String(e.category ?? '').includes('إحالة'),
        );

        expect(journey.length).toBeGreaterThanOrEqual(4);
        expect(journey.some((n) => n.stage === 'investigation')).toBe(true);
        expect(journey.some((n) => n.stage === 'misdemeanor')).toBe(true);
        expect(journey.some((n) => n.stage === 'felony')).toBe(true);
        expect(journey.filter((n) => n.transitionKind === 'forward_referral').length).toBeGreaterThanOrEqual(2);
        expect(journey.some((n) => String(n.transitionText ?? '').includes('جولة ثانية'))).toBe(true);
        expect(referralEvents.length).toBeGreaterThanOrEqual(2);

        expect(statements.map((s) => s.id)).toEqual(
            expect.arrayContaining(['st_inv_1', 'st_inv_2']),
        );
        expect(requests.map((r) => r.id)).toEqual(
            expect.arrayContaining(['rq_inv_1', 'rq_trial_1', 'rq_inv_2', 'rq_trial_2']),
        );
        expect(decisions.map((d) => d.id)).toEqual(expect.arrayContaining(['jd_inv_1', 'jd_inv_2']));
    });

    it('correctCasePartyName updates complainant and logs timeline event', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const cId = useCriminalStore.getState().casesById[caseId]?.complainants?.[0]?.id ?? '';
        const err = useCriminalStore.getState().correctCasePartyName(caseId, {
            partyKind: 'complainant',
            partyId: cId,
            newFullName: 'أحمد المُصحَّح',
            reason: 'خطأ مطبعي',
        });
        expect(err).toBeNull();
        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated?.complainants?.[0]?.fullName).toBe('أحمد المُصحَّح');
        expect(updated?.timelineEvents.some((e) => e.category === 'تصحيح بيانات الإضبارة')).toBe(true);
    });

    it('correctCasePartyName updates complainant phone and address', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const cId = useCriminalStore.getState().casesById[caseId]?.complainants?.[0]?.id ?? '';
        const err = useCriminalStore.getState().correctCasePartyName(caseId, {
            partyKind: 'complainant',
            partyId: cId,
            newFullName: 'سارة أحمد',
            newPhone: '07701234567',
            newAddress: 'بغداد — الكرخ',
            reason: 'تصحيح بيانات الاتصال',
        });
        expect(err).toBeNull();
        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated?.complainants?.[0]?.fullName).toBe('سارة أحمد');
        expect(updated?.complainants?.[0]?.phone).toBe('07701234567');
        expect(updated?.complainants?.[0]?.address).toBe('بغداد — الكرخ');
    });

    it('correctCasePartyName updates defendant address', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const dId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        const priorName =
            useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.fullName ?? '';
        const err = useCriminalStore.getState().correctCasePartyName(caseId, {
            partyKind: 'defendant',
            partyId: dId,
            newFullName: priorName,
            newAddress: 'البصرة — الزبير',
            reason: 'تصحيح عنوان المتهم',
        });
        expect(err).toBeNull();
        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated?.defendants?.[0]?.address).toBe('البصرة — الزبير');
    });

    it('reopens a closed investigation case and restores editability', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        const conclusion: StageConclusion = {
            id: 'c_close',
            stageType: 'investigation',
            decisionType: 'closing',
            date: '2026-05-19',
            details: 'قرار غلق الدعوى',
            defendantStatusAtDecision: 'bailed',
        };
        useCriminalStore.getState().concludeStage(caseId, conclusion);

        useCriminalStore.getState().reopenClosedCase(caseId, 'ظهور تسجيل كاميرا جديد');

        const reopened = useCriminalStore.getState().casesById[caseId];
        expect(reopened.isFrozen).toBe(false);
        expect(reopened.finalDecision).toBeUndefined();
        expect(reopened.timelineEvents.length).toBe(1);
        expect(reopened.timelineEvents[0]?.category).toBe('إعادة فتح دعوى لظهور دليل');
        expect(reopened.timelineEvents[0]?.description).toContain('ظهور تسجيل كاميرا جديد');
    });

    it('temporary_closing seals dossier when all defendants are closed pending', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        const conclusion: StageConclusion = {
            id: 'c_temp',
            stageType: 'investigation',
            decisionType: 'temporary_closing',
            date: '2026-05-20',
            details: 'غلق مؤقت بموجب المادة 130',
            defendantStatusAtDecision: 'bailed',
        };
        useCriminalStore.getState().concludeStage(caseId, conclusion);

        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated.isFrozen).toBe(true);
        expect(updated.investigationDossierClosure?.kind).toBe('temporary');
        expect(updated.defendants?.[0]?.investigationStatus).toBe('closed_pending');
        expect(updated.finalDecision?.decisionType).toBe('temporary_closing');
        expect(updated.judicialDecisions?.some((d) => d.proceduralTemplate?.includes('غلق'))).toBe(true);
    });

    it('closing via concludeStage sets closed_final and creates purge judicial decision', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().concludeStage(caseId, {
            id: 'c_close_final',
            stageType: 'investigation',
            decisionType: 'closing',
            date: '2026-05-21',
            details: 'غلق نهائي',
            defendantStatusAtDecision: 'bailed',
        });

        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated.defendants?.[0]?.investigationStatus).toBe('closed_final');
        expect(updated.isFrozen).toBe(true);
        expect(updated.investigationDossierClosure?.kind).toBe('final');
    });

    it('purge cassation annulment restores investigationStatus without releasing criminal status', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defId = useCriminalStore.getState().casesById[caseId]?.defendants[0]?.id;
        expect(defId).toBeTruthy();

        useCriminalStore.setState((state) => {
            const c = state.casesById[caseId];
            if (!c) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...c,
                        defendants: (c.defendants ?? []).map((d) =>
                            d.id === defId
                                ? {
                                      ...d,
                                      status: 'موقوف' as const,
                                      investigationStatus: 'closed_final' as const,
                                  }
                                : d,
                        ),
                        judicialDecisions: [
                            {
                                id: 'jd_purge_close',
                                issuedAt: '2026-05-01',
                                title: 'غلق الدعوى نهائياً (مادة 130)',
                                proceduralTemplate: 'غلق الدعوى نهائياً (مادة 130)',
                                summary: 'غلق',
                                decisionType: 'preparatory',
                                defendantIds: [defId!],
                                appeals: [
                                    {
                                        id: 'ap_purge',
                                        appellantType: 'defendant',
                                        appellantIds: [defId!],
                                        targetDefendantIds: [defId!],
                                        cassationStatus: 'pending',
                                        filedAt: '2026-05-10',
                                    },
                                ],
                                isLocked: true,
                            },
                        ],
                        isFrozen: true,
                        investigationDossierClosure: { kind: 'final', closedAt: '2026-05-01' },
                    },
                },
            };
        });

        const err = useCriminalStore.getState().recordJudicialAppealResult(caseId, 'jd_purge_close', 'ap_purge', {
            result: 'procedural_annulment',
            isObjectiveGrounds: false,
            date: '2026-07-02',
        });
        expect(err).toBeNull();
        const c = useCriminalStore.getState().casesById[caseId];
        const def = c?.defendants?.find((d) => d.id === defId);
        expect(def?.investigationStatus).toBe('active');
        expect(def?.status).toBe('موقوف');
        expect(c?.isFrozen).toBe(false);
        expect(c?.investigationDossierClosure).toBeUndefined();
    });

    it('referInvestigationDefendantToTrial is blocked when investigation dossier is sealed', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defId = useCriminalStore.getState().casesById[caseId]?.defendants[0]?.id;
        useCriminalStore.setState((state) => {
            const c = state.casesById[caseId];
            if (!c) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...c,
                        isFrozen: true,
                        investigationDossierClosure: { kind: 'final', closedAt: '2026-05-01' },
                        defendants: (c.defendants ?? []).map((d) =>
                            d.id === defId
                                ? { ...d, investigationStatus: 'closed_final' as const }
                                : d,
                        ),
                    },
                },
            };
        });
        const childId = useCriminalStore.getState().referInvestigationDefendantToTrial(caseId, {
            defendantIds: defId ? [defId] : [],
            targetCaseStage: 'misdemeanor',
            referralMisdemeanorType: 'موجزة',
            courtName: 'محكمة',
            courtCaseNumber: '123',
            decisionDate: '2026-05-02',
            decisionDetails: 'إحالة',
            defendantStatusAtDecision: 'bailed',
        });
        expect(childId).toBeNull();
    });

    it('expiration with statute_of_limitations sets lawsuit_dropped personal stage', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendants = useCriminalStore.getState().casesById[caseId]?.defendants ?? [];
        const defendantId = defendants[0]?.id;
        expect(defendantId).toBeTruthy();

        useCriminalStore.getState().concludeStage(caseId, {
            id: 'c_exp',
            stageType: 'investigation',
            decisionType: 'expiration',
            expirationReason: 'statute_of_limitations',
            defendantIds: defendantId ? [defendantId] : [],
            date: '2026-05-21',
            details: 'انقضاء بمرور الزمن',
            defendantStatusAtDecision: 'bailed',
        });

        const updated = useCriminalStore.getState().casesById[caseId];
        const def = (updated.defendants ?? []).find((d) => d.id === defendantId);
        expect(def?.personalStage).toBe('lawsuit_dropped');
        expect(updated.finalDecision?.expirationReason).toBe('statute_of_limitations');
    });

    it('moves statement to trash and restores it', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().addStatement(caseId, {
            id: 'st_trash',
            date: '2026-05-21',
            giverType: 'defendant',
            giverName: 'علي',
            content: 'نص',
            isJudiciallyRatified: false,
        });

        useCriminalStore.getState().moveStatementToTrash(caseId, 'st_trash');
        let saved = useCriminalStore.getState().casesById[caseId];
        expect(saved.statements.length).toBe(0);
        expect(saved.trashBin?.length).toBe(1);
        const trashId = saved.trashBin?.[0]?.id ?? '';
        expect(trashId).toBeTruthy();

        useCriminalStore.getState().restoreTrashItem(caseId, trashId);
        saved = useCriminalStore.getState().casesById[caseId];
        expect(saved.statements.some((s) => s.id === 'st_trash')).toBe(true);
        expect(saved.trashBin?.length ?? 0).toBe(0);
    });

    it('adds postpones and finalizes trial sessions', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        const addErr = useCriminalStore.getState().addTrialSession(caseId, {
            date: '2026-06-01',
            sessionNumber: '1',
            presenceStatus: 'present',
            sessionNotes: 'مرافعة اولية',
        });
        expect(addErr).toBeNull();

        const sessionId = useCriminalStore.getState().casesById[caseId]?.trials?.[0]?.id ?? '';
        expect(sessionId).toBeTruthy();

        const postponeErr = useCriminalStore.getState().postponeTrialSession(
            caseId,
            sessionId,
            '2026-07-01',
            'تأجيل لطلب المحامي',
            'مراجعة ملف الدفاع',
        );
        expect(postponeErr).toBeNull();

        useCriminalStore.getState().addTrialSession(caseId, {
            date: '2026-07-01',
            sessionNumber: '2',
            presenceStatus: 'absent',
            sessionNotes: 'جلسة الحكم',
        });
        const session2 = useCriminalStore.getState().casesById[caseId]?.trials?.find((s) => s.sessionNumber === '2');
        expect(session2?.id).toBeTruthy();

        const verdictErr = useCriminalStore.getState().finalizeTrialVerdict(caseId, session2!.id, {
            outcome: 'conviction',
            date: '2026-07-01',
        });
        expect(verdictErr).toBeNull();

        const saved = useCriminalStore.getState().casesById[caseId];
        const withVerdict = saved.trials.find((s) => s.id === session2!.id);
        expect(withVerdict?.status).toBe('verdict_issued');
        expect(withVerdict?.verdict?.appealDeadline).toBe('2026-07-31');
        expect(saved.isFrozen).toBe(true);
        expect(saved.finalDecision?.decisionType).toBe('conviction');
        expect(saved.verdictDate).toBe('2026-07-01');
    });

    it('blocks duplicate session number and second pending session', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().addTrialSession(caseId, {
            date: '2026-06-01',
            sessionNumber: '1',
            presenceStatus: 'present',
            sessionNotes: 'جلسة 1',
        });
        useCriminalStore.getState().postponeTrialSession(
            caseId,
            useCriminalStore.getState().casesById[caseId]?.trials?.[0]?.id ?? '',
            '2026-07-01',
            'تأجيل',
            'تحضير',
        );

        const dupErr = useCriminalStore.getState().addTrialSession(caseId, {
            date: '2026-06-15',
            sessionNumber: '1',
            presenceStatus: 'present',
            sessionNotes: 'تكرار',
        });
        expect(dupErr).toContain('مسجّل مسبقاً');

        useCriminalStore.getState().addTrialSession(caseId, {
            date: '2026-07-01',
            sessionNumber: '2',
            presenceStatus: 'present',
            sessionNotes: 'جلسة 2 معلقة',
        });

        const pendingErr = useCriminalStore.getState().addTrialSession(caseId, {
            date: '2026-09-01',
            sessionNumber: '3',
            presenceStatus: 'present',
            sessionNotes: 'جلسة ثالثة',
        });
        expect(pendingErr).toContain('معلّقة');
    });

    it('documents preparatory decision on trial session and appends judicial decision', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().addTrialSession(caseId, {
            date: '2026-06-01',
            sessionNumber: '1',
            presenceStatus: 'present',
            sessionNotes: 'مرافعة',
        });
        const sessionId = useCriminalStore.getState().casesById[caseId]?.trials?.[0]?.id ?? '';
        expect(sessionId).toBeTruthy();

        const docErr = useCriminalStore.getState().documentTrialSessionPreparatoryDecision(caseId, {
            sessionId,
            session: {
                date: '2026-06-01',
                sessionNumber: '1',
                presenceStatus: 'present',
                sessionNotes: 'مرافعة',
            },
            preparatory: {
                title: 'تأجيل لطلب مستند',
                details: 'أجلت الجلسة لطلب المحامي مستنداً',
                isBlockingSuit: true,
            },
        });
        expect(docErr).toBeNull();

        const saved = useCriminalStore.getState().casesById[caseId];
        const session = saved.trials.find((s) => s.id === sessionId);
        expect(session?.preparatoryDecision?.title).toBe('تأجيل لطلب مستند');
        expect(session?.preparatoryDecision?.isBlockingSuit).toBe(true);
        expect(saved.judicialDecisions?.some((d) => d.id === session?.preparatoryDecision?.judicialDecisionId)).toBe(
            true,
        );

        const dupErr = useCriminalStore.getState().documentTrialSessionPreparatoryDecision(caseId, {
            sessionId,
            session: {
                date: '2026-06-01',
                sessionNumber: '1',
                presenceStatus: 'present',
                sessionNotes: 'مرافعة',
            },
            preparatory: {
                title: 'قرار آخر',
                details: 'محاولة تكرار',
                isBlockingSuit: false,
            },
        });
        expect(dupErr).toContain('مسجّل مسبقاً');
    });

    it('adds updates and deletes trial depositions with comparisons and cross-exam', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        const addErr = useCriminalStore.getState().addTrialDeposition(caseId, {
            date: '2026-06-10',
            giverType: 'witness',
            witnessName: 'سامي',
            content: 'شهدت في المحكمة أنني رأيت المتهم',
            contentHighlights: [{ start: 0, end: 6, color: 'yellow' }],
        });
        expect(addErr).toBeNull();

        const depId = useCriminalStore.getState().casesById[caseId]?.trialDepositions?.[0]?.id ?? '';
        expect(depId).toBeTruthy();

        const updateErr = useCriminalStore.getState().updateTrialDeposition(caseId, depId, {
            comparisons: [
                {
                    id: 'cmp1',
                    trialExcerpt: 'رأيته',
                    linkedKind: 'statement',
                    linkedId: 'inv-st-1',
                },
            ],
            crossExamination: [{ id: 'q1', question: 'أين كنت؟', isAsked: true, liveResponse: 'في المنزل' }],
        });
        expect(updateErr).toBeNull();

        let saved = useCriminalStore.getState().casesById[caseId];
        expect(saved.trialDepositions?.[0]?.comparisons?.[0]?.linkedId).toBe('inv-st-1');
        expect(saved.trialDepositions?.[0]?.crossExamination?.[0]?.isAsked).toBe(true);

        const delErr = useCriminalStore.getState().deleteTrialDeposition(caseId, depId);
        expect(delErr).toBeNull();
        saved = useCriminalStore.getState().casesById[caseId];
        expect(saved.trialDepositions?.length ?? 0).toBe(0);
    });

    it('modifies trial charge description and records history', () => {
        seedDraftForNewCase('محكمة الجنح');
        useCriminalStore.getState().setBasicField('legalArticle', '405');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'felony',
            courtName: 'محكمة الجنايات',
            courtCaseNumber: '2026/100',
            decisionDate: '2026-06-01',
            decisionDetails: 'إحالة',
            defendantStatusAtDecision: 'bailed',
            defendantIds: [],
        });

        let saved = useCriminalStore.getState().casesById[caseId];
        expect(saved?.referralArticle).toBeTruthy();
        expect(saved?.currentAccusationArticle).toBe('405');

        const err = useCriminalStore.getState().modifyTrialChargeDescription(caseId, {
            newArticle: '413',
            legalReason: 'تعديل الوصف — م 187',
        });
        expect(err).toBeNull();

        saved = useCriminalStore.getState().casesById[caseId];
        expect(saved?.referralArticle).toBe('405');
        expect(saved?.currentAccusationArticle).toBe('413');
        expect(saved?.chargeModifications?.[0]?.oldArticle).toBe('405');
        expect(saved?.chargeModifications?.[0]?.newArticle).toBe('413');
    });

    it('isCorruptTimelineEvent flags junk placeholders and inverted next dates', () => {
        expect(
            isCorruptTimelineEvent({
                id: 'bad1',
                date: '2026-05-20',
                type: 'investigation',
                title: 'fff',
                description: '',
            }),
        ).toBe(true);
        expect(
            isCorruptTimelineEvent({
                id: 'bad2',
                date: '2026-05-20',
                type: 'investigation',
                title: 'ok',
                description: 'ok',
                nextDate: '2026-05-01',
            }),
        ).toBe(true);
        expect(
            isCorruptTimelineEvent({
                id: 'good',
                date: '2026-05-20',
                type: 'investigation',
                category: 'مخاطبة مراجع رسمية',
                title: 'مخاطبة',
                description: 'تمت المخاطبة',
            }),
        ).toBe(false);
    });

    it('blocks all mutations after freezing (store-level guard)', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        const conclusion: StageConclusion = {
            id: 'c2',
            stageType: 'investigation',
            decisionType: 'closing',
            date: '2026-05-19',
            details: 'قرار غلق الدعوى',
            defendantStatusAtDecision: 'bailed',
        };
        useCriminalStore.getState().concludeStage(caseId, conclusion);

        const event: TimelineEvent = {
            id: 'e1',
            date: '2026-05-19',
            type: 'decision',
            category: 'قرار غلق الدعوى',
            title: 'غلق',
            description: 'تم الغلق',
        };
        useCriminalStore.getState().addTimelineEvent(caseId, event);

        const statement: Statement = {
            id: 's1',
            date: '2026-05-19',
            giverType: 'complainant',
            giverName: 'مشتكي',
            content: 'إفادة',
        };
        useCriminalStore.getState().addStatement(caseId, statement);

        const log: InvestigationLog = {
            id: 'l1',
            date: '2026-05-19',
            category: 'official_letter',
            title: 'مفاتحة',
            details: 'تفاصيل',
            status: 'awaiting_response',
        };
        useCriminalStore.getState().addInvestigationLog(caseId, log);

        const req: LawyerRequest = {
            id: 'r1',
            requestDate: '2026-05-19',
            type: 'طلب',
            lawyerNote: 'ملاحظة',
            status: 'pending',
        };
        useCriminalStore.getState().addOrUpdateRequest(caseId, req);

        const d1 = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        if (d1) {
            useCriminalStore.getState().updateCaseDefendantStatus(caseId, d1, 'حر');
        }

        useCriminalStore.getState().updateCaseStage(caseId, 'محكمة الجنح');

        const change: LegalArticleChange = {
            id: 'a1',
            article: '413 ق.ع',
            changedAtDate: '2026-05-19',
            changedBy: 'trial_court',
        };
        useCriminalStore.getState().updateLegalArticle(caseId, change);
        useCriminalStore.getState().waivePrivateRight(caseId, '2026-05-19');

        const frozen = useCriminalStore.getState().casesById[caseId];
        expect(frozen.isFrozen).toBe(true);
        expect(frozen.timelineEvents.length).toBe(0);
        expect(frozen.statements.length).toBe(0);
        expect(frozen.investigationLogs.length).toBe(0);
        expect(frozen.lawyerRequests.length).toBe(0);
        expect(frozen.basics.stage).toBe('مرحلة التحقيق');
        expect(frozen.defendants?.[0]?.status).toBe('موقوف');
        expect(frozen.legalArticleHistory.length).toBe(0);
        expect(Boolean(frozen.isPrivateRightWaived)).toBe(false);
        expect(frozen.waiverDate).toBeUndefined();
    });

    it('deletes case and updates persisted state', async () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        expect(useCriminalStore.getState().casesById[caseId]).toBeTruthy();

        useCriminalStore.getState().deleteCase(caseId);
        expect(useCriminalStore.getState().casesById[caseId]).toBeUndefined();

        const raw = await readPersistedCriminalStoreRaw();
        const parsed = JSON.parse(raw!);
        expect(parsed?.state?.casesById?.[caseId]).toBeUndefined();
    });

    it('does not auto-update defendant status when adding timeline events (manual control)', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const d1 = useCriminalStore.getState().draft.defendants[0]?.id;
        if (d1) {
            useCriminalStore.getState().setDefendantField(d1, 'status', 'حر');
        }
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';

        const arrest: TimelineEvent = {
            id: 'e_arrest',
            date: '2026-05-20',
            type: 'investigation',
            category: 'إصدار أمر قبض/توقيف',
            title: 'إصدار أمر قبض',
            description: 'تم إصدار أمر قبض بحق المتهم',
            defendantIds: [defendantId],
        };
        useCriminalStore.getState().addTimelineEvent(caseId, arrest);
        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.status).toBe('حر');

        const bail: TimelineEvent = {
            id: 'e_bail',
            date: '2026-05-21',
            type: 'decision',
            category: 'إخلاء سبيل بكفالة',
            title: 'إخلاء سبيل بكفالة',
            description: 'تقرر إخلاء سبيل بكفالة',
            defendantIds: [defendantId],
            guarantorDetails: {
                bailAmount: '500000',
                guarantorInfo: 'حسن عبد الله — موظف',
            },
        };
        useCriminalStore.getState().addTimelineEvent(caseId, bail);
        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.status).toBe('حر');
        expect((useCriminalStore.getState().casesById[caseId]?.defendants?.[0] as any)?.guarantorDetails?.bailAmount).toBe(
            '500000',
        );
        expect((useCriminalStore.getState().casesById[caseId]?.defendants?.[0] as any)?.guarantorDetails?.guarantorInfo).toContain(
            'حسن عبد الله',
        );

        const today = new Date().toISOString().slice(0, 10);
        useCriminalStore.getState().confirmBailAfterAppeal(caseId, [defendantId]);
        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.status).toBe('مكفل');
        const last = useCriminalStore.getState().casesById[caseId]?.timelineEvents?.slice(-1)[0];
        expect(last?.category).toBe('تصديق الكفالة');

        const cancelBail: TimelineEvent = {
            id: 'e_cancel_bail',
            date: '2026-05-22',
            type: 'decision',
            category: 'قرار إلغاء الكفالة وإعادة التوقيف',
            title: 'إلغاء الكفالة وإعادة التوقيف',
            description: 'صدر قرار إلغاء الكفالة وإعادة التوقيف بحق المتهم',
            defendantIds: [defendantId],
        };
        useCriminalStore.getState().addTimelineEvent(caseId, cancelBail);
        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.status).toBe('مكفل');

        const release: TimelineEvent = {
            id: 'e_release',
            date: '2026-05-23',
            type: 'decision',
            category: 'إفراج',
            title: 'إفراج',
            description: 'إطلاق سراح المتهم',
            defendantIds: [defendantId],
        };
        useCriminalStore.getState().addTimelineEvent(caseId, release);
        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.status).toBe('مكفل');
    });

    it('does not auto-update detentionExpiryDate on detention extension events (manual field)', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_detain',
            date: '2026-05-20',
            type: 'investigation',
            category: 'إصدار أمر قبض/توقيف',
            title: 'توقيف',
            description: 'تم توقيف المتهم',
            defendantIds: [defendantId],
        });

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_extend',
            date: '2026-05-20',
            type: 'decision',
            category: 'تمديد توقيف المتهم',
            title: 'تمديد توقيف',
            description: 'تم تمديد التوقيف',
            defendantIds: [defendantId],
            extensionDays: 15,
        });

        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.detentionExpiryDate).toBe('2026-06-01');
    });

    it('allows detention extensions with any days value (no hard validation)', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_detain2',
            date: '2026-05-20',
            type: 'investigation',
            category: 'إصدار أمر قبض/توقيف',
            title: 'توقيف',
            description: 'تم توقيف المتهم',
            defendantIds: [defendantId],
        });

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_extend_bad',
            date: '2026-05-20',
            type: 'decision',
            category: 'تمديد توقيف المتهم',
            title: 'تمديد توقيف',
            description: 'تمديد غير قانوني',
            defendantIds: [defendantId],
            extensionDays: 16,
        });

        expect(useCriminalStore.getState().casesById[caseId]?.timelineEvents?.length).toBe(2);
        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.detentionExpiryDate).toBe('2026-06-01');
    });

    it('does not throw on detention extension even if it exceeds quarter-penalty heuristics (organizer mode)', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_detain_q',
            date: '2026-01-01',
            type: 'investigation',
            category: 'إصدار أمر قبض/توقيف',
            title: 'توقيف',
            description: 'تم توقيف المتهم',
            defendantIds: [defendantId],
        });

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_release_q',
            date: '2026-01-25',
            type: 'decision',
            category: 'إفراج',
            title: 'إفراج',
            description: 'تم الإفراج عن المتهم',
            defendantIds: [defendantId],
        });

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_extend_q',
            date: '2026-01-26',
            type: 'decision',
            category: 'تمديد توقيف المتهم',
            title: 'تمديد توقيف',
            description: 'تمديد (بدون قفل حسابي مركزي)',
            defendantIds: [defendantId],
            extensionDays: 10,
        });

        expect(useCriminalStore.getState().casesById[caseId]?.timelineEvents?.length).toBe(3);
        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.detentionExpiryDate).toBe('2026-06-01');
    });

    it('does not calculate detention extension cumulatively (manual field)', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const draftDefendantId = useCriminalStore.getState().draft.defendants[0]?.id ?? '';
        if (draftDefendantId) {
            useCriminalStore.getState().setDefendantField(draftDefendantId, 'detentionExpiryDate', '');
        }
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_detain3',
            date: '2099-01-01',
            type: 'investigation',
            category: 'إصدار أمر قبض/توقيف',
            title: 'توقيف',
            description: 'تم توقيف المتهم',
            defendantIds: [defendantId],
        });

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_extend_1',
            date: '2099-01-01',
            type: 'decision',
            category: 'تمديد توقيف المتهم',
            title: 'تمديد توقيف',
            description: 'تمديد 15',
            defendantIds: [defendantId],
            extensionDays: 15,
        });

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_extend_2',
            date: '2099-01-10',
            type: 'decision',
            category: 'تمديد توقيف المتهم',
            title: 'تمديد توقيف',
            description: 'تمديد 10',
            defendantIds: [defendantId],
            extensionDays: 10,
        });

        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.detentionExpiryDate).toBe('');
    });

    it('marks guarantor forfeited and defendant fugitive on bail forfeiture events', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_bail_pending',
            date: '2026-05-20',
            type: 'decision',
            category: 'إخلاء سبيل بكفالة',
            title: 'كفالة',
            description: 'إخلاء سبيل بكفالة',
            defendantIds: [defendantId],
            guarantorDetails: { bailAmount: '1000000', guarantorInfo: 'كفيل 1' },
        });
        useCriminalStore.getState().confirmBailAfterAppeal(caseId, [defendantId]);
        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.status).toBe('مكفل');

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_forfeit',
            date: '2026-05-25',
            type: 'decision',
            category: 'قرار مصادرة الكفالة وتحصيلها',
            title: 'مصادرة الكفالة',
            description: 'قرار مصادرة الكفالة وتحصيلها',
            defendantIds: [defendantId],
        });
        const d = useCriminalStore.getState().casesById[caseId]?.defendants?.[0] as any;
        expect(d.status).toBe('مكفل');
        expect(String(d.guarantorDetails?.guarantorInfo ?? '')).toContain('مصادرة');
    });

    it('creates inAbsentiaDetails on fugitive conviction and allows filing objection after freeze', () => {
        seedDraftForNewCase('محكمة الجنح');
        useCriminalStore.getState().setBasicField('crimeType', 'جنحة');
        const d1 = useCriminalStore.getState().draft.defendants[0]?.id;
        if (d1) {
            useCriminalStore.getState().setDefendantField(d1, 'status', 'هارب');
        }
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';

        const conclusion: StageConclusion = {
            id: 'c_abs',
            stageType: 'misdemeanor',
            decisionType: 'conviction',
            date: '2026-01-10',
            details: 'حكم إدانة',
            defendantStatusAtDecision: 'fugitive',
            defendantIds: [defendantId],
        };

        useCriminalStore.getState().concludeStage(caseId, conclusion);
        const d = useCriminalStore.getState().casesById[caseId]?.defendants?.[0] as any;
        expect(d.inAbsentiaDetails?.verdictDate).toBe('2026-01-10');
        expect(d.inAbsentiaDetails?.objectionDeadline).toBe('');
        expect(d.inAbsentiaDetails?.isObjectionFiled).toBe(false);

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_notify',
            date: '2026-01-10',
            type: 'decision',
            category: 'تبليغ رسمي بالحكم الغيابي',
            title: 'تبليغ الحكم الغيابي',
            description: 'تم التبليغ الأصولي بالحكم الغيابي',
            defendantIds: [defendantId],
            notifiedDate: '2026-01-10',
            notificationMethod: 'لصق',
        });
        const dN = useCriminalStore.getState().casesById[caseId]?.defendants?.[0] as any;
        expect(dN.inAbsentiaDetails?.notifiedDate).toBe('2026-01-10');
        expect(dN.inAbsentiaDetails?.notificationMethod).toBe('لصق');
        expect(dN.inAbsentiaDetails?.objectionDeadline).toBe('2026-04-11');

        useCriminalStore.getState().fileInAbsentiaObjection(caseId, defendantId);
        const d2 = useCriminalStore.getState().casesById[caseId]?.defendants?.[0] as any;
        expect(d2.inAbsentiaDetails?.isObjectionFiled).toBe(true);
        expect(d2.status).toBe('هارب');
        const lastTwo = useCriminalStore.getState().casesById[caseId]?.timelineEvents?.slice(-2) ?? [];
        expect(lastTwo[0]?.category).toBe('تقديم اعتراض على الحكم الغيابي');
        expect(lastTwo[1]?.category).toBe('جلسة المحاكمة الاعتراضية الأولى');
    });

    it('persists postponementReason in timeline events', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_postpone',
            date: '2026-05-20',
            type: 'court_session',
            category: 'تأجيل الجلسة/المراجعة',
            title: 'تأجيل الجلسة',
            description: 'تم التأجيل لسبب الغياب',
            postponementReason: 'بسبب عدم سوق المتهم الموقوف (عطل نقل الموقوفين)',
            summonsStatus: 'served_valid',
            summonsDate: '2026-05-10',
            summonsDocumentRef: 'ورقة تكليف 1/تبليغ',
        });

        const ev = useCriminalStore.getState().casesById[caseId]?.timelineEvents?.[0];
        expect(ev?.postponementReason).toBe('بسبب عدم سوق المتهم الموقوف (عطل نقل الموقوفين)');
    });

    it('allows adding timeline events without auto-changing defendant status (organizer mode)', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const d1 = useCriminalStore.getState().draft.defendants[0]?.id;
        if (d1) {
            useCriminalStore.getState().setDefendantField(d1, 'status', 'حر');
        }
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_psych',
            date: '2026-05-20',
            type: 'decision',
            category: 'قرار إيداع المتهم في مصح عقلي للمراقبة',
            title: 'قرار إيداع',
            description: 'تقرر إيداع المتهم في مصح عقلي للمراقبة',
            defendantIds: [defendantId],
        });

        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.status).toBe('حر');
        expect(useCriminalStore.getState().casesById[caseId]?.timelineEvents?.length).toBe(1);

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_allowed_postpone',
            date: '2026-05-21',
            type: 'court_session',
            category: 'تأجيل الجلسة/المراجعة',
            title: 'تأجيل',
            description: 'تم التأجيل أثناء الفحص العقلي',
            defendantIds: [defendantId],
            summonsStatus: 'served_valid',
            summonsDate: '2026-05-10',
            summonsDocumentRef: 'ورقة تكليف 2/تبليغ',
        });
        expect(useCriminalStore.getState().casesById[caseId]?.timelineEvents?.length).toBe(2);

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_blocked',
            date: '2026-05-21',
            type: 'investigation',
            category: 'إصدار أمر استقدام',
            title: 'استقدام',
            description: 'محاولة إضافة إجراء أثناء الفحص العقلي',
            defendantIds: [defendantId],
        });
        expect(useCriminalStore.getState().casesById[caseId]?.timelineEvents?.length).toBe(3);

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_report',
            date: '2026-05-22',
            type: 'decision',
            category: 'ورود تقرير اللجنة الطبية العقلية',
            title: 'ورود تقرير',
            description: 'ورد تقرير اللجنة الطبية',
            defendantIds: [defendantId],
        });
        expect(useCriminalStore.getState().casesById[caseId]?.timelineEvents?.length).toBe(4);
        expect(useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.status).toBe('حر');
    });

    it('records juvenile severance decision without spawning a new case (organizer mode)', () => {
        seedDraftForNewCase('محكمة الجنح');
        useCriminalStore.getState().addDefendant();
        const draft = useCriminalStore.getState().draft;
        const adultId = draft.defendants[0]?.id ?? '';
        const juvenileId = draft.defendants[1]?.id ?? '';
        expect(adultId).toBeTruthy();
        expect(juvenileId).toBeTruthy();

        useCriminalStore.getState().setDefendantField(juvenileId, 'fullName', 'علي (حدث)');
        useCriminalStore.getState().setDefendantField(juvenileId, 'birthYear', '2010');
        useCriminalStore.getState().setDefendantField(juvenileId, 'status', 'موقوف');
        useCriminalStore.getState().setDefendantField(juvenileId, 'detentionAuthority', '');
        useCriminalStore.getState().setDefendantField(juvenileId, 'isJuvenile', true);
        useCriminalStore.getState().setDefendantField(juvenileId, 'guardianName', 'والده');

        const caseId = useCriminalStore.getState().createCaseFromDraft();

        const spawned = useCriminalStore
            .getState()
            .severJuvenileDefendantToJuvenileCourt(caseId, juvenileId, '2026-05-20', 'تفاصيل قرار التفريق');

        expect(spawned).toBeNull();
        const parent = useCriminalStore.getState().casesById[caseId] as any;

        expect(parent.isFrozen).toBeFalsy();
        expect(parent.finalDecision).toBeUndefined();
        expect(parent.defendants.some((d: any) => d.id === juvenileId)).toBe(true);
        expect(parent.defendants.some((d: any) => d.id === adultId)).toBe(true);
        expect(parent.timelineEvents.slice(-1)[0]?.category).toBe('تفريق دعوى المتهم الحدث ومسار محكمة الأحداث');
    });

    it('merges cases by migrating all child records into parent and freezing child', () => {
        seedDraftForNewCase('محكمة الجنح');
        const targetId = useCriminalStore.getState().createCaseFromDraft();
        const target = useCriminalStore.getState().casesById[targetId];
        const targetCaseNumber = target.location.caseNumber || '123/ج/2026';

        useCriminalStore.getState().addStatement(targetId, {
            id: 'st_target',
            date: '2026-05-19',
            giverType: 'complainant',
            giverName: 'مشتكي',
            content: 'إفادة هدف',
        });

        useCriminalStore.getState().resetDraft();
        seedDraftForNewCase('محكمة الجنح');
        const sourceId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().addStatement(sourceId, {
            id: 'st_source',
            date: '2026-05-20',
            giverType: 'defendant',
            giverName: 'متهم',
            content: 'إفادة مصدر',
        });

        const sourceCaseNumber =
            useCriminalStore.getState().casesById[sourceId]?.location?.caseNumber || '123/ج/2026';

        useCriminalStore.getState().addTimelineEvent(sourceId, {
            id: 'tl_source',
            date: '2026-05-18',
            type: 'investigation',
            category: 'تدوين أقوال المتهم',
            title: 'إجراء مصدر',
            description: 'يُرَحَّل إلى الإضبارة الأم بِختم تَتبّع',
        });

        useCriminalStore.getState().mergeCases(targetId, sourceId, 'وحدة موضوع الدعوى');

        const parentCase = useCriminalStore.getState().casesById[targetId] as any;
        const mergedChild = useCriminalStore.getState().casesById[sourceId] as any;

        // الطِفل مُجمَّد بِشكل كامل (أرشيف للقراءة فقط).
        expect(mergedChild.isArchived).toBe(true);
        expect(mergedChild.isFrozen).toBe(true);
        expect(mergedChild.dossierStatus).toBe('merged');
        expect(mergedChild.mergedIntoCaseId).toBe(targetId);
        expect(mergedChild.mergedIntoCaseNumber).toBe(targetCaseNumber);
        expect(String(mergedChild.notes ?? '')).toContain(String(targetCaseNumber));

        // سجلات الطِفل مُفرَّغة (مَنقولة إلى الأم بِختم تَتبّع).
        expect(mergedChild.statements).toEqual([]);
        expect(mergedChild.timelineEvents).toEqual([]);
        expect(mergedChild.investigationLogs).toEqual([]);
        expect(mergedChild.lawyerRequests).toEqual([]);

        // الأم تُحافظ على إشاراتها الإدارية.
        expect(parentCase.mergedCaseIds ?? parentCase.mergedFromCaseIds).toContain(sourceId);
        expect(parentCase.mergedCasesTexts).toContain(sourceCaseNumber);
        expect(parentCase.mergedCasesTexts?.every((t: string) => !/^[0-9a-f]{8}-/i.test(t))).toBe(true);

        // الأم تَحوي سجلاتها + سجلات الطِفل المُختومَة بـ mergedFromCaseId.
        expect(parentCase.statements.length).toBe(2);
        const migratedStatement = parentCase.statements.find((s: any) => s.id === 'st_source');
        expect(migratedStatement?.mergedFromCaseId).toBe(sourceId);
        expect(migratedStatement?.mergedFromCaseNumber).toBe(sourceCaseNumber);

        // التايم لاين للأم: حدث الطِفل المُرَحَّل + بَنر «ضم وإغلاق إضبارة».
        expect(parentCase.timelineEvents.length).toBe(2);
        const migratedEvent = parentCase.timelineEvents.find((e: any) => e.id === 'tl_source');
        expect(migratedEvent?.mergedFromCaseId).toBe(sourceId);
        expect(migratedEvent?.mergedFromCaseNumber).toBe(sourceCaseNumber);
        const mergeBanner = parentCase.timelineEvents.find(
            (e: any) => e.category === 'ضم وإغلاق إضبارة',
        );
        expect(mergeBanner?.description).toBe(
            `تم ضم الإضبارة رقم ${sourceCaseNumber} ضمن هذه الإضبارة الأم. السبب: وحدة موضوع الدعوى`,
        );
        expect(String(mergeBanner?.description ?? '')).not.toContain(sourceId);
    });

    it('pushes stageJourney on final-decision referral without clearing history', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const created = useCriminalStore.getState().casesById[caseId];
        expect(created.stageJourney).toEqual([
            { id: '1', stage: 'investigation', label: 'مرحلة التحقيق', status: 'current' },
        ]);

        const defendantId = created.defendants?.[0]?.id ?? '';
        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'misdemeanor',
            referralMisdemeanorType: 'موجزة',
            courtName: 'محكمة جنح',
            courtCaseNumber: '88/جنح/2026',
            decisionDate: '2026-06-01',
            decisionDetails: 'إحالة للجنح',
            defendantStatusAtDecision: 'bailed',
            defendantIds: defendantId ? [defendantId] : [],
        });

        const after = useCriminalStore.getState().casesById[caseId];
        expect(after.stageJourney?.length).toBe(2);
        expect(after.stageJourney?.filter((n) => n.status === 'past').length).toBe(1);
        expect(after.stageJourney?.find((n) => n.status === 'current')?.stage).toBe('misdemeanor');
        expect(after.stageJourney?.find((n) => n.status === 'current')?.transitionKind).toBe('forward_referral');
        expect(after.stageJourney?.find((n) => n.status === 'past')?.endedAt).toBe('2026-06-01');
    });

    it('locks investigation timeline after referral to misdemeanor court', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        const created = useCriminalStore.getState().casesById[caseId];
        const defendantId = created.defendants?.[0]?.id ?? '';
        useCriminalStore.getState().applyInvestigationReferral(caseId, {
            targetCaseStage: 'misdemeanor',
            referralMisdemeanorType: 'موجزة',
            courtName: 'محكمة جنح الكرخ',
            courtCaseNumber: '120/جنح/2026',
            decisionDate: '2026-05-20',
            decisionDetails: 'إحالة بموجب مادة 130',
            defendantStatusAtDecision: 'bailed',
            defendantIds: defendantId ? [defendantId] : [],
        });

        const c = useCriminalStore.getState().casesById[caseId];
        expect(c.caseStage).toBe('misdemeanor');
        expect(c.isInvestigationLocked).toBe(true);
        expect(c.courtCaseNumber).toBe('120/جنح/2026');
        expect(c.basics.stage).toBe('محكمة الجنح');

        const before = (c.timelineEvents ?? []).length;
        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'tl_inv_blocked',
            date: '2026-05-21',
            type: 'investigation',
            category: 'تدوين أقوال المتهم',
            title: 'أقوال',
            description: 'محاولة بعد القفل',
        });
        expect(useCriminalStore.getState().casesById[caseId].timelineEvents.length).toBe(before);

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'tl_trial_ok',
            date: '2026-05-22',
            type: 'decision',
            category: 'جلسة مرافعة',
            title: 'جلسة مرافعة',
            description: 'جلسة أولى',
        });
        expect(useCriminalStore.getState().casesById[caseId].timelineEvents.length).toBe(before + 1);
    });

    it('supports multi-merge via mergedCaseIds array push', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const parentId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().resetDraft();
        seedDraftForNewCase('مرحلة التحقيق');
        const child1 = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().resetDraft();
        seedDraftForNewCase('مرحلة التحقيق');
        const child2 = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().mergeCases(parentId, child1, 'ضم أول');
        useCriminalStore.getState().mergeCases(parentId, child2, 'ضم ثان');

        const ids = resolveMergedCaseIds(useCriminalStore.getState().casesById[parentId]);
        expect(ids).toContain(child1);
        expect(ids).toContain(child2);
        expect(ids.length).toBe(2);
    });

    it('rejects merge across different procedural stages', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const parentId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().resetDraft();
        seedDraftForNewCase('محكمة الجنح');
        const childId = useCriminalStore.getState().createCaseFromDraft();

        expect(() => useCriminalStore.getState().mergeCases(parentId, childId, 'محاولة ضم عابر')).toThrow(
            'لا يجوز قانوناً توحيد أضابير في مراحل إجرائية مختلفة',
        );

        const parent = useCriminalStore.getState().casesById[parentId] as any;
        const child = useCriminalStore.getState().casesById[childId] as any;
        expect(resolveMergedCaseIds(parent)).not.toContain(childId);
        expect(child.dossierStatus).not.toBe('merged');
    });

    it('locks judicially ratified statement content and allows notes only', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().addStatement(caseId, {
            id: 's_rat',
            date: '2026-05-20',
            giverType: 'witness',
            giverName: 'شاهد',
            content: 'نص أصلي',
            notes: 'ملاحظة أولى',
            isJudiciallyRatified: true,
        });

        useCriminalStore.getState().updateStatement(caseId, 's_rat', {
            content: 'نص معدل ممنوع',
            notes: 'ملاحظة جديدة',
        });

        const st = useCriminalStore.getState().casesById[caseId]?.statements?.[0] as any;
        expect(st.content).toBe('نص أصلي');
        expect(st.notes).toBe('ملاحظة جديدة');
        expect(st.isJudiciallyRatified).toBe(true);
    });

    it('allows deleting judicially ratified statements (no hard lock)', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().addStatement(caseId, {
            id: 's_lock',
            date: '2026-05-20',
            giverType: 'witness',
            giverName: 'شاهد',
            content: 'نص مصدق',
            isJudiciallyRatified: true,
        });

        useCriminalStore.getState().deleteStatement(caseId, 's_lock');
        expect(useCriminalStore.getState().casesById[caseId]?.statements?.length).toBe(0);
    });

    it('stores verdictDate when a verdict is recorded in trial courts', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'v1',
            date: '2026-05-10',
            type: 'decision',
            category: 'نطق بالقرار (إدانة)',
            title: 'نطق',
            description: 'تم النطق',
        });

        expect((useCriminalStore.getState().casesById[caseId] as any).verdictDate).toBe('2026-05-10');
    });

    it('sends case to cassation and stores details (no hard freeze)', () => {
        seedDraftForNewCase('محكمة الجنايات');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().sendCaseToCassation(caseId, {
            cassationNumber: '123/تمييز/2026',
            sentDate: '2026-05-20',
            panelName: 'الهيئة الجزائية',
        });

        const c = useCriminalStore.getState().casesById[caseId] as any;
        expect(Boolean(c.isFrozen)).toBe(false);
        expect(c.isSentToCassation).toBe(true);
        expect(c.cassationCaseDetails?.cassationNumber).toBe('123/تمييز/2026');
    });

    it('stores witnessName and witnessDetails on statements', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().addStatement(caseId, {
            id: 'st_w',
            date: '2026-05-21',
            giverType: 'witness',
            giverName: 'علي حسين كريم',
            witnessName: 'علي حسين كريم',
            witnessDetails: '35 سنة — بغداد — جار',
            content: 'شهد على وقوع الحادث',
        });

        const st = useCriminalStore.getState().casesById[caseId]?.statements?.[0];
        expect(st?.witnessName).toBe('علي حسين كريم');
        expect(st?.witnessDetails).toContain('بغداد');
    });

    it('stores targetDefendantId on custom personal timeline events', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id;
        expect(defId).toBeTruthy();

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'ev_custom',
            date: '2026-05-21',
            type: 'investigation',
            category: 'إجراء مخصص (إدخال يدوي)',
            title: 'مخاطبة ولي الأمر',
            description: 'تم التواصل',
            targetDefendantId: defId!,
            defendantIds: [defId!],
        });

        const ev = useCriminalStore.getState().casesById[caseId]?.timelineEvents?.[0];
        expect(ev?.targetDefendantId).toBe(defId);
    });

    it('isolates location data between cases created from draft (no shared references)', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseIdA = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().setLocationField('courtName', 'محكمة أولية');
        const caseIdB = useCriminalStore.getState().createCaseFromDraft();

        const a = useCriminalStore.getState().casesById[caseIdA];
        const b = useCriminalStore.getState().casesById[caseIdB];
        expect(a.location).not.toBe(b.location);
        expect(a.location.courtName).not.toBe('محكمة أولية');

        useCriminalStore.getState().updateCaseLocation(caseIdA, 'court', 'محكمة بعد النقل', 'عدم اختصاص');
        expect(useCriminalStore.getState().casesById[caseIdA].location.courtName).toBe('محكمة بعد النقل');
        expect(useCriminalStore.getState().casesById[caseIdB].location.courtName).not.toBe('محكمة بعد النقل');
    });

    it('updates case location and appends a jurisdiction-transfer timeline event', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        useCriminalStore.getState().addStatement(caseId, {
            id: 's_loc',
            date: '2026-05-19',
            giverType: 'complainant',
            giverName: 'مشتكي',
            content: 'إفادة لا يجب أن تختفي',
        });

        useCriminalStore.getState().updateCaseLocation(caseId, 'court', 'محكمة جنح الكرادة', 'عدم اختصاص مكاني');

        const c = useCriminalStore.getState().casesById[caseId];
        expect(c.location.courtName).toBe('محكمة جنح الكرادة');
        expect(c.statements.length).toBe(1);
        expect(c.timelineEvents.length).toBe(1);
        expect(c.timelineEvents[0]?.category).toBe('إحالة لعدم الاختصاص');
        expect(c.timelineEvents[0]?.description).toContain('عدم اختصاص مكاني');
    });

    it('updates and deletes timeline/statements/logs/requests by id', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();

        const event: TimelineEvent = {
            id: 'e1',
            date: '2026-05-19',
            type: 'decision',
            category: 'قرار غلق الدعوى',
            title: 'غلق',
            description: 'تم الغلق',
        };
        useCriminalStore.getState().addTimelineEvent(caseId, event);

        const statement: Statement = {
            id: 's1',
            date: '2026-05-19',
            giverType: 'complainant',
            giverName: 'مشتكي',
            content: 'إفادة',
        };
        useCriminalStore.getState().addStatement(caseId, statement);

        const log: InvestigationLog = {
            id: 'l1',
            date: '2026-05-19',
            category: 'official_letter',
            title: 'مفاتحة',
            details: 'تفاصيل',
            status: 'awaiting_response',
        };
        useCriminalStore.getState().addInvestigationLog(caseId, log);
        useCriminalStore.getState().updateInvestigationLog(caseId, 'l1', { status: 'response_received', details: 'تم' });
        expect(useCriminalStore.getState().casesById[caseId]?.investigationLogs?.[0]?.status).toBe('response_received');
        expect(useCriminalStore.getState().casesById[caseId]?.investigationLogs?.[0]?.details).toBe('تم');

        const req: LawyerRequest = {
            id: 'r1',
            requestDate: '2026-05-19',
            type: 'طلب',
            lawyerNote: 'ملاحظة',
            status: 'pending',
        };
        useCriminalStore.getState().addOrUpdateRequest(caseId, req);
        expect(useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0]?.status).toBe('pending');

        useCriminalStore.getState().updateLawyerRequest(caseId, 'r1', {
            status: 'approved',
            judgeMargin: 'موافق',
            decisionDate: '2026-05-20',
        });
        expect(useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0]?.status).toBe('pending');

        useCriminalStore.getState().updateLawyerRequest(caseId, 'r1', {
            status: 'pending',
            judgeMargin: 'مسودة هامش',
            decisionDate: '2026-05-21',
        });
        expect(useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0]?.judgeMargin).toBe('مسودة هامش');
        expect(useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0]?.decisionDate).toBe('2026-05-21');

        const finErr = useCriminalStore.getState().finalizeLawyerRequest(caseId, 'r1', {
            status: 'approved',
            judgeMargin: 'موافق',
            decisionDate: '2026-05-20',
        });
        expect(finErr).toBeNull();
        expect(useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0]?.status).toBe('approved');
        expect(useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0]?.judgeMargin).toBe('موافق');
        expect(useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0]?.isLocked).toBe(true);

        useCriminalStore.getState().updateLawyerRequest(caseId, 'r1', {
            lawyerNote: 'محاولة بعد القفل',
        });
        expect(useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0]?.lawyerNote).toBe('ملاحظة');

        useCriminalStore.getState().deleteTimelineEvent(caseId, 'e1');
        useCriminalStore.getState().deleteStatement(caseId, 's1');
        useCriminalStore.getState().deleteInvestigationLog(caseId, 'l1');
        useCriminalStore.getState().deleteLawyerRequest(caseId, 'r1');

        const saved = useCriminalStore.getState().casesById[caseId];
        expect(saved.timelineEvents.length).toBe(0);
        expect(saved.statements.length).toBe(0);
        expect(saved.investigationLogs.length).toBe(0);
        expect(saved.lawyerRequests.length).toBe(0);
    });

    it('addRequestMargin, toggleRequestStar, and addRequestAttachment on lawyer requests', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().addOrUpdateRequest(caseId, {
            id: 'r-ux',
            requestDate: '2026-05-20',
            type: 'طلب إحالة',
            lawyerNote: 'تفاصيل',
            status: 'pending',
        });
        useCriminalStore.getState().addRequestMargin(caseId, 'r-ux', 'أحيل الطلب للادعاء العام');
        useCriminalStore.getState().toggleRequestStar(caseId, 'r-ux');
        useCriminalStore.getState().addRequestAttachment(caseId, 'r-ux', 'نسخة القرار الموثقة رقم 1');
        const row = useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.find((r) => r.id === 'r-ux');
        expect(row?.margins?.length).toBe(1);
        expect(row?.margins?.[0]?.text).toBe('أحيل الطلب للادعاء العام');
        expect(row?.isStarred).toBe(true);
        expect(row?.attachments?.[0]?.name).toBe('نسخة القرار الموثقة رقم 1');
        useCriminalStore.getState().removeRequestAttachment(caseId, 'r-ux', row?.attachments?.[0]?.id ?? '');
        expect(
            useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.find((r) => r.id === 'r-ux')?.attachments,
        ).toBeUndefined();
    });

    it('blocks follow-up margin and attachment edits on locked requests', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const { requestId } = useCriminalStore.getState().createLawyerRequest(caseId, {
            requestDate: '2026-05-20',
            proceduralTemplate: 'طلب إحالة',
            lawyerNote: 'تفاصيل',
        });
        expect(requestId).toBeTruthy();
        useCriminalStore.getState().addRequestAttachment(caseId, requestId!, 'نسخة أولية');
        const err = useCriminalStore.getState().finalizeLawyerRequest(caseId, requestId!, {
            status: 'approved',
            judgeMargin: 'قبول',
            decisionDate: '2026-05-25',
        });
        expect(err).toBeNull();
        useCriminalStore.getState().addRequestMargin(caseId, requestId!, 'هامش لاحق');
        useCriminalStore.getState().addRequestAttachment(caseId, requestId!, 'مرفق جديد');
        const attId =
            useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.find((r) => r.id === requestId)
                ?.attachments?.[0]?.id ?? '';
        useCriminalStore.getState().removeRequestAttachment(caseId, requestId!, attId);
        const row = useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.find((r) => r.id === requestId);
        expect(row?.isLocked).toBe(true);
        expect(row?.margins?.length ?? 0).toBe(0);
        expect(row?.attachments?.length).toBe(1);
        expect(row?.attachments?.[0]?.name).toBe('نسخة أولية');
    });

    it('createLawyerRequest records unified detention decision as executed with date range', () => {
        seedDraftForNewCase('محكمة الجنح');
        const d1 = useCriminalStore.getState().draft.defendants[0]?.id;
        if (d1) {
            useCriminalStore.getState().setDefendantField(d1, 'status', 'حر');
        }
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        const created = useCriminalStore.getState().createLawyerRequest(caseId, {
            requestDate: '2026-05-10',
            proceduralTemplate: 'قرار توقيف المتهم',
            lawyerNote: 'توقيف المتهم',
            defendantIds: defendantId ? [defendantId] : undefined,
            detentionStartDate: '2026-05-10',
            detentionEndDate: '2026-05-20',
        });
        expect(created.error).toBeNull();
        const row = useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0];
        expect(row?.status).toBe('executed');
        expect(row?.detentionStartDate).toBe('2026-05-10');
        expect(row?.detentionEndDate).toBe('2026-05-20');
        const def = useCriminalStore.getState().casesById[caseId]?.defendants?.[0];
        expect(def?.status).not.toBe('موقوف');
        expect(useCriminalStore.getState().casesById[caseId]?.judicialDecisions?.length).toBeGreaterThan(0);
    });

    it('extendDetentionOnDecision updates same card end date without new ledger row', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        useCriminalStore.getState().createLawyerRequest(caseId, {
            requestDate: '2026-05-10',
            proceduralTemplate: 'قرار توقيف المتهم',
            lawyerNote: 'توقيف',
            defendantIds: defendantId ? [defendantId] : undefined,
            detentionStartDate: '2026-05-10',
            detentionEndDate: '2026-05-20',
        });
        const before = useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.length ?? 0;
        const jd = useCriminalStore
            .getState()
            .casesById[caseId]?.judicialDecisions?.find((d) => d.detentionEndDate === '2026-05-20');
        expect(jd?.id).toBeTruthy();
        const err = useCriminalStore.getState().extendDetentionOnDecision(caseId, jd!.id, '2026-05-28');
        expect(err).toBeNull();
        const after = useCriminalStore.getState().casesById[caseId];
        expect(after?.lawyerRequests?.length).toBe(before);
        const patched = after?.judicialDecisions?.find((d) => d.id === jd!.id);
        expect(patched?.detentionEndDate).toBe('2026-05-28');
        expect(after?.defendants?.[0]?.detentionExpiryDate).toBe('2026-05-28');
    });

    it('documentDetentionReleaseOnDecision closes card and releases defendant', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        useCriminalStore.getState().createLawyerRequest(caseId, {
            requestDate: '2026-05-10',
            proceduralTemplate: 'قرار توقيف المتهم',
            lawyerNote: 'توقيف',
            defendantIds: defendantId ? [defendantId] : undefined,
            detentionStartDate: '2026-05-10',
            detentionEndDate: '2026-05-20',
        });
        const jd = useCriminalStore.getState().casesById[caseId]?.judicialDecisions?.[0];
        const err = useCriminalStore.getState().documentDetentionReleaseOnDecision(caseId, jd?.id ?? '');
        expect(err).toBeNull();
        const after = useCriminalStore.getState().casesById[caseId];
        expect(after?.judicialDecisions?.[0]?.detentionReleasedAt).toBeTruthy();
        expect(after?.defendants?.[0]?.status).toBe('مكفل');
    });

    it('releaseDefendantsFromDetention sets مكفل and clears detention fields', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        useCriminalStore.getState().createLawyerRequest(caseId, {
            requestDate: '2026-05-10',
            proceduralTemplate: 'قرار توقيف المتهم',
            lawyerNote: 'توقيف',
            defendantIds: defendantId ? [defendantId] : undefined,
            detentionStartDate: '2026-05-10',
            detentionEndDate: '2026-05-20',
        });
        const err = useCriminalStore.getState().releaseDefendantsFromDetention(
            caseId,
            defendantId ? [defendantId] : [],
        );
        expect(err).toBeNull();
        const def = useCriminalStore.getState().casesById[caseId]?.defendants?.[0];
        expect(def?.status).toBe('مكفل');
        expect(def?.detentionExpiryDate).toBe('');
    });

    it('createLawyerRequest applies complaint court referral to dossier header court name', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().updateCaseStage(caseId, 'مرحلة التحقيق');
        const store = useCriminalStore.getState();
        store.casesById[caseId]!.location.investigationCourtName = 'ديوانية';
        useCriminalStore.setState({ casesById: { ...store.casesById } });

        const created = useCriminalStore.getState().createLawyerRequest(caseId, {
            requestDate: '2026-05-12',
            proceduralTemplate: 'إحالة الشكوى إلى محكمة أخرى',
            lawyerNote: 'إحالة لعدم الاختصاص المكاني',
            referredCourtName: 'محكمة الرصافة',
        });
        expect(created.error).toBeNull();
        const c = useCriminalStore.getState().casesById[caseId]!;
        expect(c.location.investigationCourtName).toBe('محكمة الرصافة');
        expect(c.complaintCourtReferral?.priorInvestigationCourtName).toBe('ديوانية');
        expect(c.complaintCourtReferral?.sourceRequestId).toBe(created.requestId);
    });

    it('createLawyerRequest records judicial arrest warrant as executed without pending flow', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const created = useCriminalStore.getState().createLawyerRequest(caseId, {
            requestDate: '2026-05-10',
            proceduralTemplate: 'إصدار أمر قبض',
            lawyerNote: 'أمر قبض بحق المتهم',
            legalArticleBasis: '109 / IV',
            defendantIds: useCriminalStore.getState().casesById[caseId]?.defendants?.map((d) => d.id),
        });
        expect(created.error).toBeNull();
        const row = useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0];
        expect(row?.status).toBe('executed');
        expect(row?.isLocked).toBe(true);
        expect(row?.orderEnforcement?.kind).toBe('arrest');
        expect(row?.orderEnforcement?.legalArticleBasis).toBe('109 / IV');
        const decisions = useCriminalStore.getState().casesById[caseId]?.judicialDecisions ?? [];
        expect(decisions.some((d) => d.sourceRequestId === row?.id)).toBe(true);
        const fin = useCriminalStore.getState().finalizeLawyerRequest(caseId, row?.id ?? '', {
            status: 'approved',
            judgeMargin: 'x',
            decisionDate: '2026-05-11',
        });
        expect(fin).toMatch(/نافذ/);
    });

    it('createLawyerRequest forces pending; finalizeLawyerRequest locks and adds judicial decision', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const created = useCriminalStore.getState().createLawyerRequest(caseId, {
            requestDate: '2026-05-10',
            proceduralTemplate: 'طلب إخلاء سبيل بكفالة / بتعهد',
            lawyerNote: 'طلب أول',
        });
        expect(created.error).toBeNull();
        expect(created.requestId).toBeTruthy();
        const pending = useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0];
        expect(pending?.status).toBe('pending');
        expect(pending?.judgeMargin).toBeUndefined();
        const rid = pending?.id ?? '';
        const fin = useCriminalStore.getState().finalizeLawyerRequest(caseId, rid, {
            status: 'rejected',
            judgeMargin: 'رفض الطلب',
            decisionDate: '2026-05-15',
        });
        expect(fin).toBeNull();
        const locked = useCriminalStore.getState().casesById[caseId]?.lawyerRequests?.[0];
        expect(locked?.status).toBe('rejected');
        expect(locked?.isLocked).toBe(true);
        const decisions = useCriminalStore.getState().casesById[caseId]?.judicialDecisions ?? [];
        expect(decisions.some((d) => d.sourceRequestId === rid)).toBe(true);

        useCriminalStore.setState((state) => {
            const c = state.casesById[caseId];
            if (!c) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...c,
                        basics: {
                            ...c.basics,
                            ourRepresentation: 'defendant_side',
                            userRole: 'defendant_lawyer',
                            role: 'وكيل المشكو منه',
                        },
                    },
                },
            };
        });

        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        const appealErr = useCriminalStore.getState().fileJudicialDecisionAppeal(caseId, `jd_${rid}`, {
            appellantType: 'defendant',
            appellantIds: defendantId ? [defendantId] : [],
            targetDefendantIds: defendantId ? [defendantId] : [],
        });
        expect(appealErr).toBeNull();
        const jd = useCriminalStore.getState().casesById[caseId]?.judicialDecisions?.find((d) => d.sourceRequestId === rid);
        expect(jd?.appeals?.some((a) => a.cassationStatus === 'pending' && a.filedAt)).toBe(true);
    });

    it('fileJudicialDecisionAppeal succeeds when investigation dossier is frozen', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const created = useCriminalStore.getState().createLawyerRequest(caseId, {
            requestDate: '2026-05-10',
            proceduralTemplate: 'طلب إخلاء سبيل بكفالة / بتعهد',
            lawyerNote: 'طلب أول',
        });
        expect(created.error).toBeNull();
        const rid = created.requestId ?? '';
        useCriminalStore.getState().finalizeLawyerRequest(caseId, rid, {
            status: 'rejected',
            judgeMargin: 'رفض الطلب',
            decisionDate: '2026-05-15',
        });

        useCriminalStore.setState((state) => {
            const c = state.casesById[caseId];
            if (!c) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...c,
                        isFrozen: true,
                        investigationDossierClosure: { kind: 'temporary', closedAt: '2026-05-16' },
                    },
                },
            };
        });

        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        const appealErr = useCriminalStore.getState().fileJudicialDecisionAppeal(caseId, `jd_${rid}`, {
            appellantType: 'defendant',
            appellantIds: defendantId ? [defendantId] : [],
            targetDefendantIds: defendantId ? [defendantId] : [],
        });
        expect(appealErr).toBeNull();
        const jd = useCriminalStore.getState().casesById[caseId]?.judicialDecisions?.find((d) => d.sourceRequestId === rid);
        expect(jd?.appeals?.some((a) => a.cassationStatus === 'pending')).toBe(true);
    });

    it('does not auto-change defendant status when saving a judicial detention decision (manual log only)', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const d1 = useCriminalStore.getState().draft.defendants[0]?.id;
        if (d1) {
            useCriminalStore.getState().setDefendantField(d1, 'isJuvenile', true);
            useCriminalStore.getState().setDefendantField(d1, 'guardianName', 'والد الحدث');
            useCriminalStore.getState().setDefendantField(d1, 'status', 'حر');
        }
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        expect(useCriminalStore.getState().casesById[caseId]?.isConfidential).toBe(true);

        const created = useCriminalStore.getState().createLawyerRequest(caseId, {
            requestDate: '2026-05-10',
            proceduralTemplate: 'قرار توقيف المتهم',
            lawyerNote: 'توقيف حدث — سجل توثيقي',
            defendantIds: defendantId ? [defendantId] : undefined,
            detentionStartDate: '2026-05-10',
            detentionEndDate: '2026-05-20',
        });
        expect(created.error).toBeNull();
        const def = useCriminalStore.getState().casesById[caseId]?.defendants?.[0] as any;
        expect(def?.status).toBe('حر');
        expect(useCriminalStore.getState().casesById[caseId]?.judicialDecisions?.length).toBeGreaterThan(0);
    });

    it('applies juvenile detention placement and confidential court sessions when isJuvenile', () => {
        seedDraftForNewCase('محكمة الجنح');
        const d1 = useCriminalStore.getState().draft.defendants[0]?.id;
        if (d1) {
            useCriminalStore.getState().setDefendantField(d1, 'isJuvenile', true);
            useCriminalStore.getState().setDefendantField(d1, 'status', 'حر');
        }
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_juv_arrest',
            date: '2026-05-20',
            type: 'investigation',
            category: 'إصدار أمر قبض/توقيف',
            title: 'توقيف حدث',
            description: 'أمر توقيف',
            defendantIds: [defendantId],
            detentionPlacement: 'juvenile_observation',
        });
        const afterArrest = useCriminalStore.getState().casesById[caseId]?.defendants?.[0] as any;
        expect(afterArrest.status).toBe('juvenile_detention');
        expect(String(afterArrest.detentionAuthority ?? '')).toContain('دار ملاحظة الأحداث');

        useCriminalStore.getState().addTimelineEvent(caseId, {
            id: 'e_juv_session',
            date: '2026-05-21',
            type: 'court_session',
            category: 'جلسة مرافعة',
            title: 'جلسة',
            description: 'جلسة محاكمة',
            defendantIds: [defendantId],
            summonsStatus: 'served_valid',
            summonsDate: '2026-05-20',
            summonsDocumentRef: 'وثيقة-1',
        });
        const session = useCriminalStore.getState().casesById[caseId]?.timelineEvents?.find((e) => e.id === 'e_juv_session');
        expect((session as any)?.isConfidential).toBe(true);
    });

    it('auto-waives private right when timeline event category is settlement waiver decision', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        expect(Boolean(useCriminalStore.getState().casesById[caseId]?.isPrivateRightWaived)).toBe(false);

        const event: TimelineEvent = {
            id: 'e_waiver',
            date: '2026-06-15',
            type: 'decision',
            category: PRIVATE_RIGHT_WAIVER_TIMELINE_CATEGORY,
            title: 'قرار صلح وتنازل',
            description: 'تنازل المدعي بالحق الشخصي بموجب قرار قضائي.',
        };
        useCriminalStore.getState().addTimelineEvent(caseId, event);

        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated?.timelineEvents?.some((e) => e.id === 'e_waiver')).toBe(true);
        expect(updated?.isPrivateRightWaived).toBe(true);
        expect(updated?.waiverDate).toBe('2026-06-15');
    });

    it('registerPartyDeath locks defendant and injects timeline without archiving case', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defendantId = useCriminalStore.getState().casesById[caseId]?.defendants?.[0]?.id ?? '';
        expect(defendantId).toBeTruthy();

        useCriminalStore.getState().registerPartyDeath(caseId, defendantId, '2026-07-01');

        const updated = useCriminalStore.getState().casesById[caseId];
        const def = updated?.defendants?.find((d) => d.id === defendantId);
        expect(def?.personalStage).toBe('lawsuit_dropped_death');
        expect(def?.isPartyRecordLocked).toBe(true);
        expect(updated?.isArchived).not.toBe(true);
        const deathEvent = updated?.timelineEvents?.find((e) =>
            String(e.description ?? '').includes('سقوط الدعوى الجزائية'),
        );
        expect(deathEvent?.defendantIds).toEqual([defendantId]);
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

    it('issueStageDecision updates personalStage only for targetDefendantIds', () => {
        seedDraftForNewCase('محكمة الجنح');
        const s = useCriminalStore.getState();
        const d1 = s.draft.defendants[0]?.id;
        s.addDefendant();
        const d2 = useCriminalStore.getState().draft.defendants[1]?.id;
        if (d2) {
            s.setDefendantField(d2, 'fullName', 'سعد كاظم');
            s.setDefendantField(d2, 'birthYear', '1991');
            s.setDefendantField(d2, 'status', 'حر');
        }
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().issueStageDecision(caseId, {
            id: 'dec-1',
            stageType: 'misdemeanor',
            decisionType: 'acquittal',
            date: '2026-08-01',
            details: 'براءة جزئية',
            defendantStatusAtDecision: 'bailed',
            targetDefendantIds: [d1!],
        });
        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated?.defendants?.find((d) => d.id === d1)?.personalStage).toBe('acquitted');
        expect(updated?.defendants?.find((d) => d.id === d2)?.personalStage).toBe('under_investigation');
    });

    it('recordCassationResult via store rejects personal quash without beneficiaries', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().initiateCassationProceeding(caseId, {
            cassationType: 'criminal_cassation_misdemeanor',
            filedAt: '2026-05-21',
            details: 'طعن',
            cassationNumber: 'ST/2',
            panelName: 'تمييز',
            appellantDefendantIds: [useCriminalStore.getState().casesById[caseId]!.defendants[0]!.id],
        });
        const err = useCriminalStore.getState().recordCassationResult(caseId, {
            result: 'quash_dismissal',
            date: '2026-06-20',
            details: 'بدون مستفيدين',
            isObjectiveGrounds: false,
            targetDefendantIds: [],
        });
        expect(err).toBeTruthy();
        const c = useCriminalStore.getState().casesById[caseId];
        expect(c?.defendants?.every((d) => d.personalStage !== 'acquitted')).toBe(true);
    });

    it('recordCassationResult via store applies quash_remand with timeline unlock', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const d1 = useCriminalStore.getState().casesById[caseId]?.defendants[0]?.id;
        useCriminalStore.getState().initiateCassationProceeding(caseId, {
            cassationType: 'criminal_cassation_misdemeanor',
            filedAt: '2026-05-21',
            details: 'طعن',
            cassationNumber: 'ST/1',
            panelName: 'تمييز',
            appellantDefendantIds: [d1!],
        });
        useCriminalStore.getState().recordCassationResult(caseId, {
            result: 'quash_remand',
            date: '2026-06-15',
            details: 'نقض وإعادة',
            isObjectiveGrounds: true,
        });
        const c = useCriminalStore.getState().casesById[caseId];
        expect(c?.isInvestigationLocked).toBe(false);
        expect(c?.stageJourney?.some((n) => n.status === 'current' && n.transitionText?.includes('جولة ثانية'))).toBe(
            true,
        );
    });

    it('recordJudicialAppealResult on preparatory annulment releases appellant defendant', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defId = useCriminalStore.getState().casesById[caseId]?.defendants[0]?.id;
        const sourceRequestId = 'req_arrest_1';
        const decisionId = `jd_${sourceRequestId}`;
        useCriminalStore.setState((state) => {
            const c = state.casesById[caseId];
            if (!c) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...c,
                        defendants: (c.defendants ?? []).map((d) =>
                            d.id === defId ? { ...d, status: 'مستقدم' as const } : d,
                        ),
                        judicialDecisions: [
                            {
                                id: decisionId,
                                issuedAt: '2026-05-01',
                                title: 'إصدار أمر استقدام / قبض',
                                summary: 'أمر قبض',
                                decisionType: 'preparatory',
                                proceduralTemplate: 'إصدار أمر استقدام / قبض',
                                sourceRequestId,
                                appeals: [
                                    {
                                        id: 'ap_proc',
                                        appellantType: 'defendant',
                                        appellantIds: [defId!],
                                        targetDefendantIds: [defId!],
                                        cassationStatus: 'pending',
                                        filedAt: '2026-05-10',
                                    },
                                ],
                                isLocked: true,
                            },
                        ],
                    },
                },
            };
        });
        const err = useCriminalStore.getState().recordJudicialAppealResult(caseId, decisionId, 'ap_proc', {
            result: 'procedural_annulment',
            isObjectiveGrounds: false,
            date: '2026-07-02',
        });
        expect(err).toBeNull();
        const c = useCriminalStore.getState().casesById[caseId];
        const storedAppeal = c?.judicialDecisions?.[0]?.appeals?.[0];
        expect(storedAppeal?.cassationStatus).toBe('concluded');
        expect(storedAppeal?.result).toBe('procedural_annulment');
        expect(c?.judicialDecisions?.[0]?.isLocked).toBe(true);
        expect(c?.defendants?.find((d) => d.id === defId)?.status).toBe('حر');
        const mirrorTl = (c?.timelineEvents ?? []).find((e) =>
            String(e.category ?? '').includes('إبطال قرار إجرائي'),
        );
        expect(mirrorTl).toBeUndefined();
    });

    it('recordJudicialAppealResult updates appeal metadata without procedural timeline mirror', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defId = useCriminalStore.getState().casesById[caseId]?.defendants[0]?.id;
        const decisionId = 'jd_test_dec';
        useCriminalStore.setState((state) => {
            const c = state.casesById[caseId];
            if (!c) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...c,
                        judicialDecisions: [
                            {
                                id: decisionId,
                                issuedAt: '2026-05-01',
                                title: 'قرار إدانة',
                                summary: 'إدانة',
                                decisionType: 'dispositive',
                                appeals: [
                                    {
                                        id: 'ap1',
                                        appellantType: 'defendant',
                                        appellantIds: [defId!],
                                        targetDefendantIds: [defId!],
                                        cassationStatus: 'pending',
                                    },
                                ],
                                isLocked: true,
                            },
                        ],
                    },
                },
            };
        });
        useCriminalStore.getState().recordJudicialAppealResult(caseId, decisionId, 'ap1', {
            result: 'quash_dismissal',
            isObjectiveGrounds: true,
            targetDefendantIds: [defId!],
            date: '2026-07-01',
        });
        const c = useCriminalStore.getState().casesById[caseId];
        const appeal = c?.judicialDecisions?.[0]?.appeals?.[0];
        expect(appeal?.result).toBe('quash_dismissal');
        expect(appeal?.cassationStatus).toBe('concluded');
        expect(appeal?.isObjectiveGrounds269b).toBe(true);
        const appealTimeline = (c?.timelineEvents ?? []).filter((e) =>
            String(e.category ?? '').includes('نتيجة تمييزية على قرار'),
        );
        expect(appealTimeline).toHaveLength(0);
    });
});
