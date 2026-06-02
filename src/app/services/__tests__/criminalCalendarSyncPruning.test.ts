/**
 * اختبارات مزامنة الإضبارات الجزائية مع التقويم (مع تقليم الأحداث اليتيمة).
 *
 * يتحقّق من:
 *  c1) إضبارة بلا أي تاريخ فعلي → لا تُنشئ events وهمية (مثل changedAtDate من legalArticleHistory)
 *  c2) إضبارة بجلسة pending → تُنشئ event للتاريخ الفعلي
 *  c3) حذف الجلسة + إعادة sync → الـ event يُحذف (pruning)
 *  c4) حذف القضية كاملة → يستدعي removeAllBridgedEventsForEntity
 *  c5) تعديل تاريخ الجلسة + إعادة sync → الـ event القديم يُحذف، الجديد يُنشأ
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    syncCriminalCaseToCalendar,
    removeAllBridgedEventsForEntity,
} from '../calendarDossierSync';
import { CalendarDB } from '@/app/services/lawyer-cloud';
import { flushPendingCalendarSyncs } from '../calendarBridge';

const USER = 'criminal-prune-lawyer';

function clearAll(): void {
    SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    localStorage.clear();
}

describe('Criminal case → Calendar sync with pruning', () => {
    beforeEach(() => clearAll());
    afterEach(() => clearAll());

    it('c1) إضبارة بدون أي تاريخ فعلي لا تُنشئ events وهمية من changedAtDate', async () => {
        const caseRecord = {
            id: 'crim-c1',
            location: { caseNumber: '123/ج/2026' },
            timelineEvents: [],
            trials: [],
            // ⚠️ هذا هو المصدر الذي كان يولّد event وهمياً بتاريخ إنشاء الإضبارة
            legalArticleHistory: [
                {
                    id: 'lh1',
                    article: '413 ق.ع',
                    changedAtDate: '2026-05-05',
                    changedBy: 'trial_court',
                },
            ],
        };
        syncCriminalCaseToCalendar(caseRecord, USER);
        await flushPendingCalendarSyncs();
        const events = await CalendarDB.getEvents(USER);
        const fromThisCase = events.filter(
            (e) => e.sourceModule === 'criminal' && e.sourceEntityId === 'crim-c1',
        );
        // لا يجب أن يوجد أي حدث — كل ما في القضية تواريخ سجلية ماضية
        expect(fromThisCase).toHaveLength(0);
    });

    it('c2) إضبارة بجلسة pending تُنشئ event للتاريخ الفعلي فقط', async () => {
        const caseRecord = {
            id: 'crim-c2',
            location: { caseNumber: '123/ج/2026' },
            timelineEvents: [],
            trials: [
                {
                    id: 'trial-1',
                    status: 'pending',
                    date: '2026-06-01',
                    sessionNumber: '1',
                },
            ],
            legalArticleHistory: [
                { id: 'lh1', article: '413 ق.ع', changedAtDate: '2026-05-05' },
            ],
        };
        syncCriminalCaseToCalendar(caseRecord, USER);
        await flushPendingCalendarSyncs();
        const events = await CalendarDB.getEvents(USER);
        const fromThisCase = events.filter(
            (e) => e.sourceModule === 'criminal' && e.sourceEntityId === 'crim-c2',
        );
        expect(fromThisCase).toHaveLength(1);
        expect(fromThisCase[0]!.date).toBe('2026-06-01');
        expect(fromThisCase[0]!.sourceEventId).toBe('trial_trial-1');
    });

    it('c3) حذف الجلسة + إعادة sync → الـ event يُحذف (pruning)', async () => {
        const caseId = 'crim-c3';
        // 1. أنشئ قضية بجلسة
        syncCriminalCaseToCalendar(
            {
                id: caseId,
                trials: [{ id: 'trial-1', status: 'pending', date: '2026-06-01' }],
            },
            USER,
        );
        await flushPendingCalendarSyncs();
        let events = await CalendarDB.getEvents(USER);
        expect(events.filter((e) => e.sourceEntityId === caseId)).toHaveLength(1);

        // 2. احذف الجلسة (trials فارغة) وأعد sync
        syncCriminalCaseToCalendar({ id: caseId, trials: [] }, USER);
        // pruning يعمل asynchronously
        await new Promise((r) => setTimeout(r, 300));
        events = await CalendarDB.getEvents(USER);
        const fromThisCase = events.filter((e) => e.sourceEntityId === caseId);
        // 🔑 يجب ألا يبقى أي حدث — Pruning قام بحذفه
        expect(fromThisCase).toHaveLength(0);
    });

    it('c4) حذف القضية كاملة → removeAllBridgedEventsForEntity ينظّف كل شيء', async () => {
        const caseId = 'crim-c4';
        syncCriminalCaseToCalendar(
            {
                id: caseId,
                trials: [
                    { id: 't1', status: 'pending', date: '2026-06-01' },
                    { id: 't2', status: 'pending', date: '2026-07-01' },
                ],
            },
            USER,
        );
        await flushPendingCalendarSyncs();
        let events = await CalendarDB.getEvents(USER);
        expect(events.filter((e) => e.sourceEntityId === caseId)).toHaveLength(2);

        // احذف القضية كاملة
        await removeAllBridgedEventsForEntity('criminal', caseId, USER);
        events = await CalendarDB.getEvents(USER);
        expect(events.filter((e) => e.sourceEntityId === caseId)).toHaveLength(0);
    });

    it('c5) تعديل تاريخ الجلسة + إعادة sync → القديم يُحذف، الجديد ينشأ', async () => {
        const caseId = 'crim-c5';
        // 1. جلسة بتاريخ 2026-06-01
        syncCriminalCaseToCalendar(
            {
                id: caseId,
                trials: [{ id: 'trial-1', status: 'pending', date: '2026-06-01' }],
            },
            USER,
        );
        await flushPendingCalendarSyncs();
        let events = await CalendarDB.getEvents(USER);
        expect(events.filter((e) => e.sourceEntityId === caseId && e.date === '2026-06-01')).toHaveLength(1);

        // 2. حدّث التاريخ إلى 2026-07-15 — نفس الـ trial id
        syncCriminalCaseToCalendar(
            {
                id: caseId,
                trials: [{ id: 'trial-1', status: 'pending', date: '2026-07-15' }],
            },
            USER,
        );
        await flushPendingCalendarSyncs();
        await new Promise((r) => setTimeout(r, 200));
        events = await CalendarDB.getEvents(USER);
        // نفس الـ sourceEventId (`trial_trial-1`)، لكن التاريخ مُحدّث
        const matches = events.filter((e) => e.sourceEntityId === caseId);
        expect(matches).toHaveLength(1);
        expect(matches[0]!.date).toBe('2026-07-15');
    });

    it('c6) 🛡️ WHITELIST: timelineEvents في الجزائي لا تُسجَّل (فقط trials[].date)', async () => {
        const caseId = 'crim-c6';
        syncCriminalCaseToCalendar(
            {
                id: caseId,
                timelineEvents: [
                    { id: 'ev1', date: '2026-08-01', title: 'مرافعة' },
                    { id: 'ev2', date: '2026-09-01', title: 'تبليغ' },
                ],
            },
            USER,
        );
        await flushPendingCalendarSyncs();
        const events = await CalendarDB.getEvents(USER);
        // لا يوجد أي حدث من timelineEvents في التقويم — whitelist يستبعدها
        expect(events.filter((e) => e.sourceEntityId === caseId)).toHaveLength(0);
    });
});
