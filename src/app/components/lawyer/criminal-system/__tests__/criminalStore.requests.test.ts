import { beforeEach, describe, expect, it } from 'vitest';
import { PRIVATE_RIGHT_WAIVER_TIMELINE_CATEGORY } from '../criminalStageUtils';
import { useCriminalStore, type TimelineEvent } from '../criminalStore';
import { resetCriminalStore, seedDraftForNewCase } from './criminalStoreTestHelpers';

describe('criminalStore', () => {
    beforeEach(() => {
        resetCriminalStore();
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
});
