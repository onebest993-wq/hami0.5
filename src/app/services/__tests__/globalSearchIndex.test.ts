/**
 * اختبارات تغطية فهرس البحث الشامل.
 *
 * يتحقّق من:
 *  s1) نصوص lawsuit stages تُطوى في وثيقة الملف (بدون صف لكل حدث)
 *  s2) criminal: كل defendants/complainants كـ party entries مستقلّة + notes
 *  s2b) criminal proceduralTimeline يُفهرس كأحداث إجرائية
 */
import { describe, expect, it } from 'vitest';
import { buildGlobalSearchIndex } from '../globalSearchIndex';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

describe('buildGlobalSearchIndex (تغطية موسّعة)', () => {
    it('s1) يطوي نصوص المراحل داخل وثيقة الملف', () => {
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
        expect(titles).toContain('أحمد محمود');
        expect(titles).not.toContain('جلسة مرافعة كبرى');
        expect(titles).not.toContain('قرار رد الدفع الشكلي');

        const fileEntry = index.find((e) => e.id === 'file-1');
        expect(fileEntry?.navigate).toEqual({ type: 'file', fileId: 1 });
        expect(fileEntry?._searchStr).toContain('شاهد');
        expect(fileEntry?._searchStr).toMatch(/مرافعه/);
        expect(fileEntry?._searchStr).toMatch(/الاثبات/);
        expect(fileEntry?._searchStr).toMatch(/منضم/);
        expect(index.filter((e) => e.navigate.type === 'file' && e.navigate.fileId === 1)).toHaveLength(1);
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

    it('s4) لا يُدخل العناصر ذات lifecycle=deleted إلى الفهرس من المصدر أو extras المرتبطة', () => {
        const deletedFile: FileData = {
            id: 99,
            type: 'lawsuit',
            status: 'deleted',
            caseNo: '2026/محذوف/1',
            court: 'بغداد',
            parties: [{ id: 1, name: 'محذوف', role: 'مدعي', isClient: true }],
            history: [],
            notes: [{ id: 1, text: 'هذه ملاحظة يجب ألا تظهر', meta: '', stageCtx: '', date: '' }],
            images: [],
            date: '',
            tasks: [],
        } as FileData;

        const index = buildGlobalSearchIndex({
            files: [deletedFile],
            globalNotes: [],
            cases: [],
            userId: 'user-1',
            extras: {
                quantumTasks: [],
                calendarEvents: [
                    {
                        id: 'cal-1',
                        userId: 'user-1',
                        title: 'موعد مرتبط بملف محذوف',
                        date: '2026-07-06',
                        type: 'hearing',
                        caseId: '99',
                        createdAt: '2026-07-06T00:00:00.000Z',
                        updatedAt: '2026-07-06T00:00:00.000Z',
                    },
                ],
                urgentCases: [],
                vaultDocs: [],
                repositoryDocs: [],
                threadingTransactions: [],
                threadingTasks: [],
                communityPosts: [],
            },
        });

        expect(index.some((e) => e.title.includes('محذوف'))).toBe(false);
        expect(index.some((e) => e.id === 'file-99')).toBe(false);
        expect(index.some((e) => e.id === 'cal-cal-1')).toBe(false);
    });

    it('يفهرس مخزن/مهملات الدعاوى من lifecycleIndex دون تحميل الملفات الكاملة', () => {
        const index = buildGlobalSearchIndex({
            files: [{ id: 1, caseNo: 'نشط-1', court: 'بغداد', parties: [], history: [], notes: [], images: [], date: '', tasks: [] }],
            globalNotes: [],
            cases: [],
            userId: 'u1',
            lawsuitLifecycleIndex: {
                v: 1,
                entries: {
                    '1': { id: '1', status: 'active', caseNo: 'نشط-1' },
                    'arch-2': {
                        id: 'arch-2',
                        status: 'archived',
                        caseNo: 'أرشيف-2',
                        title: 'دعوى مؤرشفة',
                        clientName: 'علي الموكل',
                        court: 'محكمة الرصافة',
                        searchHaystack: 'علي الموكل ملاحظة أرشيفية',
                    },
                    'trash-3': {
                        id: 'trash-3',
                        status: 'deleted',
                        caseNo: 'مهمل-3',
                        title: 'دعوى محذوفة',
                        clientName: 'فاطمة الزبون',
                        searchHaystack: 'فاطمة الزبون نص ملاحظة مهملات',
                    },
                },
                counts: { active: 1, archived: 1, trash: 1 },
            },
        });

        const archived = index.find((e) => e.id === 'file-arch-2');
        expect(archived?.lifecycle).toBe('archived');
        expect(archived?.title).toBe('علي الموكل');
        const trashed = index.find((e) => e.id === 'file-trash-3');
        expect(trashed?.lifecycle).toBe('deleted');
        expect(trashed?.title).toBe('فاطمة الزبون');
        expect(trashed?.subtitle).toContain('سلة المهملات');
        expect(trashed?._searchStr).toContain('فاطمه');
    });
});
