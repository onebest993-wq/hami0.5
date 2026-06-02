/**
 * اختبارات مكتشف التواريخ الشامل — يتأكد أن أي تاريخ في أي حاوية فرعية
 * داخل بنية إضبارة يُلتقَط ويُربط بالتقويم.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { syncLawsuitFileToCalendar, syncExecutionFileToCalendar } from '../calendarDossierSync';
import { CalendarDB } from '@/app/services/lawyer-cloud';
import { buildStableBridgeId } from '../calendarBridge';
import { discoverImplicitDossierDates } from '../calendarDateSniffer';

const USER = 'sniffer-test-lawyer';

function clearStorage(): void {
    SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    localStorage.clear();
    persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, []);
}

function waitSync(ms = 200): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

describe('Calendar Date Sniffer (universal)', () => {
    beforeEach(() => {
        clearStorage();
        saveLawsuitFilesRaw([]);
        saveExecutionFilesRaw([]);
    });

    afterEach(() => {
        clearStorage();
    });

    it('1) يلتقط تاريخاً في حقل غير كنسي ضمن دعوى', () => {
        const file = {
            id: 'sniff-1',
            status: 'active',
            stages: [],
            specialProceedings: [
                { id: 'sp1', title: 'إجراء خاص', adjournmentDate: '2026-08-15' },
            ],
        };
        const discovered = discoverImplicitDossierDates(file, 'lawsuit');
        expect(discovered.length).toBeGreaterThan(0);
        const item = discovered.find((d) => d.dateYmd === '2026-08-15');
        expect(item).toBeDefined();
        expect(item?.bridgeEventId.startsWith('field_')).toBe(true);
        expect(item?.title).toContain('إجراء خاص');
    });

    it('2) يتجاهل مفاتيح الميتا (createdAt / updatedAt / trashedAt)', () => {
        const file = {
            id: 'sniff-2',
            status: 'active',
            stages: [],
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-02-01T00:00:00Z',
            trashedAt: '2026-03-01T00:00:00Z',
            specialNote: { signedDate: '2026-09-20' },
        };
        const discovered = discoverImplicitDossierDates(file, 'lawsuit');
        const dates = discovered.map((d) => d.dateYmd);
        expect(dates).not.toContain('2026-01-01');
        expect(dates).not.toContain('2026-02-01');
        expect(dates).not.toContain('2026-03-01');
        expect(dates).toContain('2026-09-20');
    });

    it('3) يتجاهل المسارات الكنسية (timeline + tasks المعروفة)', () => {
        const file = {
            id: 'sniff-3',
            status: 'active',
            stages: [
                {
                    id: 's1',
                    timeline: [{ id: 't1', type: 'appointment', date: '2026-10-10', title: 'جلسة' }],
                    tasks: [{ id: 'tk1', dueDate: '2026-10-20', title: 'مهمة' }],
                },
            ],
        };
        const discovered = discoverImplicitDossierDates(file, 'lawsuit');
        // المسارات الكنسية تُترك للمزامنة المباشرة لا للمكتشف
        const fromCanonical = discovered.filter(
            (d) =>
                d.bridgeEventId.includes('stages_0_timeline') ||
                d.bridgeEventId.includes('stages_0_tasks'),
        );
        expect(fromCanonical.length).toBe(0);
    });

    it('4) 🛡️ WHITELIST: تواريخ Sniffer العميقة لا تُسجَّل في التقويم', async () => {
        // الـ Sniffer لا يزال موجوداً كـ helper لتحليل البنى،
        // لكنه مفصول الآن عن sync layer (whitelist صارم).
        const file = {
            id: 'sniff-4',
            status: 'active',
            stages: [],
            customSection: {
                subSection: {
                    deeperTab: {
                        objectionDate: '2026-07-15',
                        title: 'اعتراض في تبويب عميق',
                    },
                },
            },
        };
        saveLawsuitFilesRaw([file]);
        syncLawsuitFileToCalendar(file, USER);
        await waitSync();

        const events = await CalendarDB.getEvents(USER);
        const objection = events.find((e) => e.date === '2026-07-15' && e.sourceModule === 'lawsuit');
        expect(objection).toBeUndefined();
    });

    it('5) 🛡️ WHITELIST: تواريخ Sniffer في التنفيذ لا تُسجَّل', async () => {
        const file = {
            id: 'sniff-exec-1',
            fileNumber: '2026/T/5',
            status: 'active',
            timelineEvents: [],
            caseTasksPending: [],
            heirsNotification: {
                deliveryDate: '2026-06-01',
                receivedDate: '2026-06-03',
            },
            paymentSchedule: [
                { id: 'p1', installmentDate: '2026-09-01', label: 'قسط أول' },
                { id: 'p2', installmentDate: '2026-10-01', label: 'قسط ثاني' },
            ],
        };
        saveExecutionFilesRaw([file]);
        syncExecutionFileToCalendar(file, USER);
        await waitSync();

        const events = await CalendarDB.getEvents(USER);
        const fieldEvents = events.filter(
            (e) => e.sourceEntityId === 'sniff-exec-1' && String(e.sourceEventId).startsWith('field_'),
        );
        expect(fieldEvents).toHaveLength(0);
    });

    it('6) 🛡️ WHITELIST: إعادة sync لبنية عشوائية لا تُولّد أحداثاً (0 من Sniffer)', async () => {
        const file = {
            id: 'sniff-idempotent',
            status: 'active',
            stages: [],
            extra: { hearingDate: '2026-11-11', title: 'جلسة خاصة' },
        };
        saveLawsuitFilesRaw([file]);
        syncLawsuitFileToCalendar(file, USER);
        await waitSync();
        syncLawsuitFileToCalendar(file, USER);
        await waitSync();

        const events = await CalendarDB.getEvents(USER);
        const matches = events.filter(
            (e) => e.sourceEntityId === 'sniff-idempotent' && e.date === '2026-11-11',
        );
        expect(matches.length).toBe(0);
    });

    it('7) معرّف الجسر مستقر عبر المسار — يصمد للمزامنات المتكرّرة', () => {
        const file1 = {
            id: 'stable-1',
            customDates: { reviewDate: '2026-05-05', title: 'مراجعة' },
        };
        const file2 = {
            id: 'stable-1',
            customDates: { reviewDate: '2026-05-05', title: 'مراجعة' },
        };
        const d1 = discoverImplicitDossierDates(file1, 'lawsuit');
        const d2 = discoverImplicitDossierDates(file2, 'lawsuit');
        expect(d1[0]?.bridgeEventId).toBe(d2[0]?.bridgeEventId);
        const fullId1 = buildStableBridgeId('lawsuit', 'stable-1', d1[0]!.bridgeEventId);
        const fullId2 = buildStableBridgeId('lawsuit', 'stable-1', d2[0]!.bridgeEventId);
        expect(fullId1).toBe(fullId2);
    });

    it('8) يستبعد حقول البيانات الشخصية والمعرّفات (avatar/phone/id)', () => {
        const file = {
            id: 'pii-1',
            avatarUrl: 'photo.jpg',
            parties: [
                { id: 'p1', name: 'محمد', phone: '07700000000', birthDate: '1990-01-01' },
            ],
            stages: [],
            relevantDate: '2026-08-08',
        };
        const discovered = discoverImplicitDossierDates(file, 'lawsuit');
        const dates = discovered.map((d) => d.dateYmd);
        expect(dates).not.toContain('1990-01-01');
        expect(dates).toContain('2026-08-08');
    });

    it('9) Date object كقيمة — يُلتقط أيضاً', () => {
        const file = {
            id: 'date-obj-1',
            stages: [],
            customAppointment: {
                meetingDate: new Date('2026-04-04T12:00:00Z'),
                title: 'لقاء',
            },
        };
        const discovered = discoverImplicitDossierDates(file, 'lawsuit');
        expect(discovered.some((d) => d.dateYmd === '2026-04-04')).toBe(true);
    });

    /**
     * 🔑 BUG FIX REGRESSION
     * إضبارة جزائية تُنشأ تلقائياً بـ `legalArticleHistory[0].changedAtDate = today`.
     * هذا تاريخ سجل ماضٍ (audit log) وليس موعداً قادماً.
     * يجب ألا يُلتقَط في التقويم.
     */
    it('10) لا يلتقط changedAtDate (سجل تغيير ماضٍ، ليس موعداً)', () => {
        const file = {
            id: 'criminal-1',
            legalArticleHistory: [
                { article: '413 ق.ع', changedAtDate: '2026-05-05', changedBy: 'trial_court' },
                { article: '414 ق.ع', changedAtDate: '2026-05-10', changedBy: 'cassation' },
            ],
            trials: [],
            timelineEvents: [],
        };
        const discovered = discoverImplicitDossierDates(file, 'criminal');
        const dates = discovered.map((d) => d.dateYmd);
        expect(dates).not.toContain('2026-05-05');
        expect(dates).not.toContain('2026-05-10');
    });

    it('11) لا يلتقط مفاتيح سجلية أخرى (recordedAt/appliedAt/loggedAt/savedAt/...)', () => {
        const file = {
            id: 'audit-1',
            entries: [
                {
                    appliedAt: '2026-01-01',
                    recordedAt: '2026-01-02',
                    loggedAt: '2026-01-03',
                    savedAt: '2026-01-04',
                    enteredAt: '2026-01-05',
                    snapshotAt: '2026-01-06',
                    auditAt: '2026-01-07',
                    historyAt: '2026-01-08',
                    appliedDate: '2026-01-09',
                    recordedDate: '2026-01-10',
                    loggedDate: '2026-01-11',
                    auditDate: '2026-01-12',
                    realHearingDate: '2026-06-15', // ← هذا فقط يجب أن يُلتقَط
                },
            ],
        };
        const discovered = discoverImplicitDossierDates(file, 'criminal');
        const dates = discovered.map((d) => d.dateYmd);
        for (let i = 1; i <= 12; i++) {
            const d = `2026-01-${String(i).padStart(2, '0')}`;
            expect(dates, `يجب ألا يحتوي على ${d}`).not.toContain(d);
        }
        expect(dates).toContain('2026-06-15');
    });
});
