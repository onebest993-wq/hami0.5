import { beforeEach, describe, expect, it } from 'vitest';
import {
    isCorruptTimelineEvent,
    useCriminalStore,
    type InvestigationLog,
    type LawyerRequest,
    type LegalArticleChange,
    type StageConclusion,
    type Statement,
    type TimelineEvent,
} from '../criminalStore';
import {
    resetCriminalStore,
    seedDraftForNewCase,
    readPersistedCriminalStoreRaw,
} from './criminalStoreTestHelpers';

describe('criminalStore', () => {
    beforeEach(() => {
        resetCriminalStore();
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
                date: '2026-05-20',
                title: 'fff',
                description: '',
            }),
        ).toBe(true);
        expect(
            isCorruptTimelineEvent({
                date: '2026-05-20',
                title: 'ok',
                description: 'ok',
                nextDate: '2026-05-01',
            }),
        ).toBe(true);
        expect(
            isCorruptTimelineEvent({
                date: '2026-05-20',
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

});
