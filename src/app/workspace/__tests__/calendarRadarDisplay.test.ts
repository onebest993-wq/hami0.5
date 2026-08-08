import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarCloud';
import {
    formatRadarDateLabel,
    formatRadarDeadlineLabel,
    resolveRadarModuleLabel,
    resolveRadarPlaceHint,
    resolveRadarHeadlineSuffix,
    resolveRadarSourceHint,
} from '../calendarRadarDisplay';

describe('calendarRadarDisplay', () => {
    it('formatRadarDateLabel يعرض اليوم أو غداً أو تاريخ', () => {
        const now = Date.parse('2026-05-25T03:00:00.000Z');
        const todayTs = Date.parse('2026-05-25T15:00:00.000Z');
        expect(formatRadarDateLabel(todayTs, now)).toBe('اليوم');

        const tomorrowTs = Date.parse('2026-05-26T15:00:00.000Z');
        expect(formatRadarDateLabel(tomorrowTs, now)).toBe('غداً');
    });

    it('formatRadarDeadlineLabel يجمع التاريخ والوقت دون «آخر موعد»', () => {
        const now = Date.parse('2026-05-25T03:00:00.000Z');
        const ts = Date.parse('2026-05-25T15:00:00.000Z');
        const label = formatRadarDeadlineLabel(ts, now);
        expect(label).not.toContain('آخر موعد');
        expect(label).not.toContain('باقي');
        expect(label).toContain('اليوم');
    });

    it('resolveRadarModuleLabel يعرض قسم المصدر', () => {
        const lawsuit = {
            id: 'e1',
            userId: 'u1',
            title: 'جلسة',
            date: '2026-05-25',
            time: '10:00',
            type: 'hearing',
            createdAt: '2026-05-20T00:00:00.000Z',
            updatedAt: '2026-05-20T00:00:00.000Z',
            sourceModule: 'lawsuit',
        } as CalendarEvent;
        expect(resolveRadarModuleLabel(lawsuit)).toBe('دعوى');
        expect(resolveRadarModuleLabel({ ...lawsuit, sourceModule: 'manual' })).toBe('تقويم');
    });

    it('resolveRadarPlaceHint يعرض المحكمة أو المكان', () => {
        const ev = {
            id: 'e1',
            userId: 'u1',
            title: 'جلسة',
            date: '2026-05-25',
            time: '10:00',
            type: 'hearing',
            createdAt: '2026-05-20T00:00:00.000Z',
            updatedAt: '2026-05-20T00:00:00.000Z',
            court: 'محكمة الكرخ',
        } as CalendarEvent;
        expect(resolveRadarPlaceHint(ev)).toBe('محكمة الكرخ');
    });

    it('resolveRadarHeadlineSuffix يُقدّم رقم الإضبارة على المحكمة', () => {
        const ev = {
            id: 'e1',
            userId: 'u1',
            title: 'أول مرافعة',
            date: '2026-05-25',
            time: '10:00',
            type: 'hearing',
            createdAt: '2026-05-20T00:00:00.000Z',
            updatedAt: '2026-05-20T00:00:00.000Z',
            sourceModule: 'lawsuit',
            caseNo: '2026/150',
            court: 'محكمة الكرخ',
        } as CalendarEvent;
        expect(resolveRadarHeadlineSuffix(ev)).toBe('2026/150');
    });

    it('resolveRadarSourceHint يجمع المصدر والمكان', () => {
        const ev = {
            id: 'e1',
            userId: 'u1',
            title: 'جلسة',
            date: '2026-05-25',
            time: '10:00',
            type: 'hearing',
            createdAt: '2026-05-20T00:00:00.000Z',
            updatedAt: '2026-05-20T00:00:00.000Z',
            sourceModule: 'lawsuit',
            sourceLabel: 'دعوى مدنية — موعد',
            court: 'محكمة الكرخ',
        } as CalendarEvent;
        expect(resolveRadarSourceHint(ev)).toContain('دعوى');
        expect(resolveRadarSourceHint(ev)).toContain('محكمة الكرخ');
    });
});
