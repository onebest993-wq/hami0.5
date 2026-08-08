import { describe, expect, it } from 'vitest';
import { buildCalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import { pickActiveCalendarSparkNudge } from '@/app/spark/engine/sparkCalendarEngine';
import {
    buildCalendarSparkSupplementalInput,
    hasCalendarSparkSupplementalSources,
    scanCalendarNoteReminderNudge,
    scanUnscheduledDossierDateNudge,
} from '@/app/spark/calendar/calendarSparkSupplementalScan';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

describe('calendarSparkSupplementalScan', () => {
    const nowMs = Date.parse('2026-08-05T10:00:00');

    it('يكتشف تاريخاً في الإضبارة غير مجدول في التقويم', () => {
        const events: UnifiedEvent[] = [];
        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 168 });
        const nudge = scanUnscheduledDossierDateNudge(ctx, {
            nowMs,
            executionFiles: [
                {
                    id: 'ex-1',
                    title: 'تاريخ',
                    date: '2026-08-12',
                },
            ],
        });

        expect(nudge?.kind).toBe('calendar.unscheduled_dossier_date');
        expect(nudge?.message).toBe('موعد غير مجدول في تنفيذ — 12/08/2026 — هل تود مراجعته؟');
        expect(nudge?.presence?.present).toEqual([]);
        expect(nudge?.action?.actionId).toBe('open_dossier');
        expect(nudge?.targetFileId).toBe('execution:ex-1');
    });

    it('يكتشف تاريخاً في دعوى بمسار مميز', () => {
        const events: UnifiedEvent[] = [];
        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 168 });
        const nudge = scanUnscheduledDossierDateNudge(ctx, {
            nowMs,
            lawsuitFiles: [
                {
                    id: 'law-1',
                    customFieldDeadline: '2026-08-12',
                },
            ],
        });

        expect(nudge?.kind).toBe('calendar.unscheduled_dossier_date');
        expect(nudge?.action?.actionId).toBe('open_dossier');
        expect(nudge?.targetFileId).toBe('lawsuit:law-1');
    });

    it('يتجاهل التاريخ إذا وُجد موعده في التقويم', () => {
        const events: UnifiedEvent[] = [
            {
                id: 'cal_1',
                title: 'موعد',
                date: '2026-08-12',
                type: 'deadline',
                source: 'calendar',
                isBridged: true,
                bridge: {
                    sourceModule: 'lawsuit',
                    sourceEntityId: 'law-1',
                    sourceEventId: 'field_customFieldDeadline',
                    calendarRecordId: '1',
                },
            },
        ];
        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 168 });
        const nudge = scanUnscheduledDossierDateNudge(ctx, {
            nowMs,
            lawsuitFiles: [
                {
                    id: 'law-1',
                    customFieldDeadline: '2026-08-12',
                },
            ],
        });

        expect(nudge).toBeNull();
    });

    it('يكتشف تاريخاً من OCR خزنة مربوطة بإضبارة تنفيذ', () => {
        const events: UnifiedEvent[] = [];
        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 168 });
        const nudge = scanUnscheduledDossierDateNudge(ctx, {
            nowMs,
            executionFiles: [{ id: 'ex-1', title: 'إضبارة تنفيذ' }],
            vaultDocs: [
                {
                    id: 'vault-1',
                    title: 'حكم',
                    boundDossierId: 'ex-1',
                    extractedText: 'موعد الجلسة 2026-08-10',
                } as never,
            ],
        });

        expect(nudge?.kind).toBe('calendar.unscheduled_dossier_date');
        expect(nudge?.message).toContain('OCR خزنة');
        expect(nudge?.targetFileId).toBe('execution:ex-1');
    });

    it('يحوّل تذكير الملاحظة إلى سطح التقويم', () => {
        const nudge = scanCalendarNoteReminderNudge([
            {
                id: 'note-1',
                title: 'متابعة عميل',
                reminder_at: '2026-08-05T09:00:00',
            } as never,
        ]);

        expect(nudge?.kind).toBe('calendar.note_reminder_due');
        expect(nudge?.action?.actionId).toBe('open_repository_note');
    });

    it('يدمج التكميلي مع قواعد التقويم الأساسية', () => {
        const events: UnifiedEvent[] = [];
        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 168 });
        const active = pickActiveCalendarSparkNudge(ctx, {
            supplemental: {
                nowMs,
                lawsuitFiles: [{ id: 'law-2', reviewDate: '2026-08-08' }],
            },
        });

        expect(active?.kind).toBe('calendar.unscheduled_dossier_date');
    });

    it('يميّز مصادر التكميلي غير الفارغة', () => {
        expect(hasCalendarSparkSupplementalSources(undefined)).toBe(false);
        expect(hasCalendarSparkSupplementalSources({})).toBe(false);
        expect(
            hasCalendarSparkSupplementalSources(
                buildCalendarSparkSupplementalInput(
                    { lawsuitFiles: [{ id: 'x' }], ready: true } as never,
                    [],
                ),
            ),
        ).toBe(true);
    });
});
