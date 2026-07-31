import { describe, expect, it } from 'vitest';
import {
    detectConflictsFromUnifiedEvents,
    detectCrossSectionConflicts,
    mapCalendarModuleToScheduleSource,
    normalizeLocation,
} from '@/app/services/calendar/scheduleConflictDetector';

describe('detectCrossSectionConflicts', () => {
    it('لا تعارض عندما العدد ≤ 3 وموقع واحد', () => {
        const result = detectCrossSectionConflicts({
            targetDate: '2026-07-21',
            hearings: [
                { id: 'h1', title: 'جلسة', date: '2026-07-21', location: 'بغداد' },
                { id: 'h2', title: 'جلسة 2', date: '2026-07-21', location: 'بغداد' },
            ],
            tasks: [{ id: 't1', title: 'مهمة', date: '2026-07-21', location: 'بغداد' }],
        });
        expect(result.totalCount).toBe(3);
        expect(result.isOverloaded).toBe(false);
        expect(result.hasLocationMismatch).toBe(false);
        expect(result.hasConflict).toBe(false);
        expect(result.warningMessage).toBeNull();
    });

    it('يضبط isOverloaded عند تجاوز 3 بنود مع تفصيل المصادر', () => {
        const result = detectCrossSectionConflicts({
            targetDate: '2026-07-21',
            hearings: [
                { id: 'h1', title: 'أ', date: '2026-07-21' },
                { id: 'h2', title: 'ب', date: '2026-07-21' },
            ],
            transactions: [{ id: 'x1', title: 'معاملة', date: '2026-07-21' }],
            tasks: [
                { id: 't1', title: 'م1', date: '2026-07-21' },
                { id: 't2', title: 'م2', date: '2026-07-21' },
            ],
        });
        expect(result.totalCount).toBe(5);
        expect(result.isOverloaded).toBe(true);
        expect(result.sourceCounts.HEARING).toBe(2);
        expect(result.sourceCounts.TRANSACTION).toBe(1);
        expect(result.sourceCounts.TASK).toBe(2);
        expect(result.hasConflict).toBe(true);
        expect(result.warningMessage).toContain('إثقال');
        expect(result.warningMessage).toContain('جلسات');
        expect(result.warningMessage).toContain('معاملات');
    });

    it('يضبط hasLocationMismatch عند أكثر من موقع', () => {
        const result = detectCrossSectionConflicts({
            targetDate: '2026-07-21',
            hearings: [{ id: 'h1', title: 'جلسة', date: '2026-07-21', location: 'كرخ' }],
            tasks: [{ id: 't1', title: 'ميدان', date: '2026-07-21', location: 'رصافة' }],
        });
        expect(result.hasLocationMismatch).toBe(true);
        expect(result.distinctLocations).toEqual(expect.arrayContaining(['كرخ', 'رصافة']));
        expect(result.warningMessage).toContain('تعارض مواقع');
    });

    it('يتجاهل المكتمل والمكرّر والمواقع الفارغة', () => {
        const result = detectCrossSectionConflicts({
            targetDate: '2026-07-21',
            hearings: [
                { id: 'h1', title: 'أ', date: '2026-07-21', location: '  ' },
                { id: 'h1', title: 'مكرر', date: '2026-07-21', location: 'بغداد' },
                { id: 'h2', title: 'ب', date: '2026-07-21', location: 'بغداد' },
                { id: 'h3', title: 'مكتمل', date: '2026-07-21', location: 'كرخ', isCompleted: true },
            ],
        });
        expect(result.totalCount).toBe(2);
        expect(result.distinctLocations).toEqual(['بغداد']);
        expect(result.hasLocationMismatch).toBe(false);
    });

    it('يكشف تعارض تنقّل عند فجوة أقل من 60 د وموقعين مختلفين', () => {
        const result = detectCrossSectionConflicts({
            targetDate: '2026-07-21',
            hearings: [
                {
                    id: 'h1',
                    title: 'جلسة كرخ',
                    date: '2026-07-21',
                    time: '09:00',
                    location: 'كرخ',
                },
                {
                    id: 'h2',
                    title: 'جلسة رصافة',
                    date: '2026-07-21',
                    time: '09:30',
                    location: 'رصافة',
                },
            ],
        });
        expect(result.hasTravelConflict).toBe(true);
        expect(result.hasConflict).toBe(true);
        expect(result.travelWarning).toContain('تعارض زمني');
        expect(result.travelConflict?.gapMinutes).toBe(30);
    });

    it('يصفي حسب targetDate', () => {
        const result = detectCrossSectionConflicts({
            targetDate: '2026-07-21',
            hearings: [
                { id: 'h1', title: 'اليوم', date: '2026-07-21' },
                { id: 'h2', title: 'غداً', date: '2026-07-22' },
            ],
            tasks: [{ id: 't1', title: 'اليوم', date: '2026-07-21' }],
        });
        expect(result.totalCount).toBe(2);
        expect(result.items.every((i) => i.date === '2026-07-21')).toBe(true);
    });
});

describe('normalizeLocation / mapCalendarModuleToScheduleSource', () => {
    it('يضغط الفراغات في الموقع', () => {
        expect(normalizeLocation('  كرخ   المدني  ')).toBe('كرخ المدني');
    });

    it('يصنّف المصادر الشائعة وأنواع الأحداث', () => {
        expect(mapCalendarModuleToScheduleSource('lawsuit')).toBe('HEARING');
        expect(mapCalendarModuleToScheduleSource('threading')).toBe('TRANSACTION');
        expect(mapCalendarModuleToScheduleSource('task')).toBe('TASK');
        expect(mapCalendarModuleToScheduleSource(undefined, undefined, 'consultation')).toBe('TASK');
    });
});

describe('detectConflictsFromUnifiedEvents', () => {
    it('يستخدم المحكمة كاحتياطي موقع ويكشف الإثقال', () => {
        const result = detectConflictsFromUnifiedEvents(
            [
                {
                    id: '1',
                    title: 'جلسة',
                    date: '2026-07-21',
                    bridge: { sourceModule: 'lawsuit' },
                    court: 'بداءة الكرخ',
                },
                {
                    id: '2',
                    title: 'تنفيذ',
                    date: '2026-07-21',
                    bridge: { sourceModule: 'execution' },
                    location: 'رصافة',
                },
                {
                    id: '3',
                    title: 'مهلة',
                    date: '2026-07-21',
                    bridge: { sourceModule: 'threading' },
                    location: 'بداءة الكرخ',
                },
                {
                    id: '4',
                    title: 'ميدان',
                    date: '2026-07-21',
                    bridge: { sourceModule: 'task' },
                    location: 'بداءة الكرخ',
                },
                {
                    id: '5',
                    title: 'مكتمل',
                    date: '2026-07-21',
                    isCompleted: true,
                    location: 'نجف',
                },
            ],
            '2026-07-21',
        );
        expect(result.totalCount).toBe(4);
        expect(result.isOverloaded).toBe(true);
        expect(result.hasLocationMismatch).toBe(true);
        expect(result.distinctLocations).toEqual(expect.arrayContaining(['بداءة الكرخ', 'رصافة']));
        expect(result.items.map((i) => i.source)).toEqual(
            expect.arrayContaining(['HEARING', 'TRANSACTION', 'TASK']),
        );
    });
});
