/**
 * اختبارات تغطية فهرس البحث الشامل.
 *
 * يتحقّق من:
 *  s1) lawsuit stages[].timeline + stages[].tasks + incidentalCases مُفهرسة بعمق
 *  s2) criminal: كل defendants/complainants كـ party entries مستقلّة + notes
 *  s2b) criminal proceduralTimeline يُفهرس كأحداث إجرائية
 */
import { describe, expect, it } from 'vitest';
import { buildGlobalSearchIndex } from '../globalSearchIndex';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

describe('buildGlobalSearchIndex (تغطية موسّعة)', () => {
    it('s1) يفهرس lawsuit stages[].timeline events بعمق', () => {
        const file: FileData = {
            id: 1,
            type: 'lawsuit',
            status: 'active',
            caseNo: '2026/ب/1',
            court: 'بغداد',
            parties: [{ id: 1, name: 'أحمد محمود', role: 'مدعي', isClient: true }],
            history: [],
            notes: [],
            images: [],
            date: '',
            tasks: [],
        } as FileData;
        // نُضيف stages كـ extension (الـ runtime يحتوي عليها)
        (file as unknown as Record<string, unknown>).stages = [
            {
                id: 's1',
                name: 'المرحلة الأولى',
                stageName: 'مرحلة الإثبات',
                status: 'active',
                timeline: [
                    {
                        id: 'ev1',
                        type: 'appointment',
                        date: '2026-06-01',
                        title: 'جلسة مرافعة كبرى',
                        details: 'استماع شاهد الإثبات الرئيسي',
                    },
                    {
                        id: 'ev2',
                        type: 'decision',
                        date: '2026-06-15',
                        title: 'قرار رد الدفع الشكلي',
                        details: 'محكمة قررت رد الدفع المقدم من المدعى عليه',
                    },
                ],
                tasks: [
                    {
                        id: 't1',
                        title: 'تحضير مذكرة الإثبات',
                        details: 'مذكرة شاملة بالأدلة الكتابية',
                    },
                ],
                incidentalCases: [
                    {
                        id: 'inc1',
                        title: 'قضية ثالث منضم',
                        subject: 'دعوى ضمان',
                        type: 'thirdParty',
                        details: 'الكفيل تدخّل لضمان حق المدعى عليه',
                    },
                ],
            },
        ];

        const index = buildGlobalSearchIndex({
            files: [file],
            globalNotes: [],
            cases: [],
            userId: null,
        });

        const titles = index.map((e) => e.title);
        expect(titles).toContain('جلسة مرافعة كبرى');
        expect(titles).toContain('قرار رد الدفع الشكلي');
        expect(titles).toContain('تحضير مذكرة الإثبات');
        expect(titles).toContain('قضية ثالث منضم');

        // كل entry يحمل navigate للملف الأصلي مع stageIndex + eventId لـ deep-link دقيق
        const ev = index.find((e) => e.title === 'جلسة مرافعة كبرى')!;
        expect(ev.navigate).toEqual({
            type: 'file',
            fileId: 1,
            stageIndex: 0,
            eventId: 'ev1',
        });

        // قرار: نفس المرحلة لكن eventId مختلف
        const decision = index.find((e) => e.title === 'قرار رد الدفع الشكلي')!;
        expect(decision.navigate).toEqual({
            type: 'file',
            fileId: 1,
            stageIndex: 0,
            eventId: 'ev2',
        });

        // مهمة المرحلة: نفس stageIndex، eventId = task.id
        const task = index.find((e) => e.title === 'تحضير مذكرة الإثبات')!;
        expect(task.navigate).toEqual({
            type: 'file',
            fileId: 1,
            stageIndex: 0,
            eventId: 't1',
        });

        // البحث بكلمة من details يجب أن يُطابق (_searchStr يحتوي عليها)
        const evHasShahed = ev._searchStr.includes('شاهد');
        expect(evHasShahed).toBe(true);
    });

    it('s2) يفهرس كل defendants و complainants كـ party entries مستقلّة', () => {
        const criminal = {
            id: 'cr-1',
            courtCaseNumber: '2026/ج/55',
            defendants: [
                { fullName: 'سامي حسن', nationality: 'عراقي', occupation: 'موظف' },
                { fullName: 'كريم ناصر', nationality: 'عراقي', occupation: 'سائق' },
            ],
            complainants: [
                { fullName: 'منى عبد الله', occupation: 'معلمة' },
            ],
            basics: { stage: 'misdemeanor' },
            notes: [
                { id: 'n1', text: 'الشاهد لم يحضر الجلسة الأولى — تأجيل' },
            ],
            proceduralTimeline: [
                { id: 'p1', title: 'صدور قرار اتهامي', details: 'بموجب المادة 459/ق.ع' },
            ],
        };

        const index = buildGlobalSearchIndex({
            files: [],
            globalNotes: [],
            cases: [],
            criminalCases: [criminal],
            userId: null,
        });

        const partyEntries = index.filter((e) => e.category === 'party');
        const partyNames = partyEntries.map((e) => e.title);
        expect(partyNames).toContain('سامي حسن');
        expect(partyNames).toContain('كريم ناصر');
        expect(partyNames).toContain('منى عبد الله');

        const subtitles = partyEntries.map((e) => e.subtitle);
        expect(subtitles.some((s) => s.startsWith('متهم'))).toBe(true);
        expect(subtitles.some((s) => s.startsWith('شاكٍ'))).toBe(true);

        // notes كـ note entries منفصلة
        const noteEntries = index.filter(
            (e) => e.category === 'note' && e.subtitle.startsWith('ملاحظة جزائية'),
        );
        expect(noteEntries.length).toBe(1);
        expect(noteEntries[0]!.snippet).toContain('الشاهد');

        // proceduralTimeline events تظهر تحت تصنيف criminal
        const procedurals = index.filter(
            (e) => e.category === 'criminal' && e.subtitle.startsWith('إجراء'),
        );
        expect(procedurals.length).toBe(1);
        expect(procedurals[0]!.title).toContain('قرار اتهامي');
    });

    it('s3) كل الـ entries فريدة بالـ ID (لا تكرار)', () => {
        const file: FileData = {
            id: 7,
            type: 'lawsuit',
            status: 'active',
            caseNo: '1',
            court: 'بغداد',
            parties: [{ id: 1, name: 'أحمد', role: 'مدعي', isClient: true }],
            history: [],
            notes: [{ id: 1, text: 'ملاحظة', meta: '', stageCtx: '', date: '' }],
            images: [],
            date: '',
            tasks: [],
        } as FileData;

        const index = buildGlobalSearchIndex({
            files: [file],
            globalNotes: [],
            cases: [],
            userId: null,
        });

        const ids = index.map((e) => e.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
