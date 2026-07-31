import { beforeEach, describe, expect, it } from 'vitest';
import type { StageConclusion, Statement } from '../criminalStore';
import { useCriminalStore } from '../criminalStore';
import {
    resetCriminalStore,
    seedDraftForNewCase,
    makePendingLawyerRequest,
    makePreparatoryDecision,
} from './criminalStoreTestHelpers';

describe('criminalStore', () => {
    beforeEach(() => {
        resetCriminalStore();
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
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().referCaseToTrial(
            caseId,
            { decisionNumber: '10/إحالة', decisionDate: '2026-06-01' },
            { stage: 'محكمة الجنح', courtName: 'محكمة جنح الكرخ', caseNumber: '50/ج/2026' },
        );
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
        useCriminalStore.getState().addOrUpdateRequest(
            caseId,
            makePendingLawyerRequest('rq_inv_1', '2026-02-02', 'طلب تحقيق'),
        );

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
                            makePreparatoryDecision('jd_inv_1', '2026-02-03', 'قرار تحقيق أول'),
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
        useCriminalStore.getState().addOrUpdateRequest(
            caseId,
            makePendingLawyerRequest('rq_trial_1', '2026-03-11', 'طلب محاكمة أول'),
        );

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
        useCriminalStore.getState().addOrUpdateRequest(
            caseId,
            makePendingLawyerRequest('rq_inv_2', '2026-05-11', 'طلب تحقيق ثان'),
        );

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
                            makePreparatoryDecision('jd_inv_2', '2026-05-12', 'قرار تحقيق ثان'),
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
        useCriminalStore.getState().addOrUpdateRequest(
            caseId,
            makePendingLawyerRequest('rq_trial_2', '2026-06-11', 'طلب محاكمة ثان'),
        );

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

});
