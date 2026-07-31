import { beforeEach, describe, expect, it } from 'vitest';
import { useCriminalStore, type StageConclusion, type TimelineEvent } from '../criminalStore';
import { resetCriminalStore, seedDraftForNewCase } from './criminalStoreTestHelpers';

describe('criminalStore', () => {
    beforeEach(() => {
        resetCriminalStore();
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
});
