import { beforeEach, describe, expect, it } from 'vitest';
import {
    resolveMergedCaseIds,
    useCriminalStore,
    type InvestigationLog,
    type LawyerRequest,
    type TimelineEvent,
} from '../criminalStore';
import { resetCriminalStore, seedDraftForNewCase } from './criminalStoreTestHelpers';

describe('criminalStore', () => {
    beforeEach(() => {
        resetCriminalStore();
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
            'لا يجوز ضم إضبارات في مراحل إجرائية مختلفة',
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

        useCriminalStore.getState().addTrialSession(caseId, {
            date: '2026-05-10',
            sessionNumber: '1',
            presenceStatus: 'present',
            sessionNotes: 'جلسة الحكم',
        });
        const session = useCriminalStore.getState().casesById[caseId]?.trials?.[0];
        expect(session?.id).toBeTruthy();

        const verdictErr = useCriminalStore.getState().finalizeTrialVerdict(caseId, session!.id, {
            outcome: 'conviction',
            date: '2026-05-10',
        });
        expect(verdictErr).toBeNull();

        expect(useCriminalStore.getState().casesById[caseId]?.verdictDate).toBe('2026-05-10');
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
});
