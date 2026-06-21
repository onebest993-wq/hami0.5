import type { CaseShareVisibleFields, DossierShareSource } from '../caseShareTypes';
import { DEFAULT_CASE_SHARE_VISIBLE_FIELDS } from '../caseShareTypes';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { extractLawsuitShareSource } from '../caseShareExtractors';
import { clearCaseShareRecords } from '../caseShareLocalStore';

/** شخصيات الاختبار — محاكاة محامين في شبكة المتابعة */
export const PERSONAS = {
    sender: { id: 'lawyer-ahmad-id', name: 'أ. أحمد الراوي' },
    recipient: { id: 'dev-colleague-sara', name: 'أ. سارة الحيدري' },
    outsider: { id: 'lawyer-outsider-unknown', name: 'أ. كريم الجبouri' },
} as const;

export function resetCaseShareStore(): void {
    const g = globalThis as unknown as { __HAMI_CASE_SHARES?: unknown[] };
    g.__HAMI_CASE_SHARES = [];
    void clearCaseShareRecords();
}

/** إضبارة دعوى غنية للسيناريوهات */
export function buildRichLawsuitFile(): FileData {
    return {
        id: 9001,
        caseNo: '4521/2024',
        court: 'محكمة بداءة الرصافة — الغرفة 7 — القاضي علي حسين',
        subInfo: 'بغداد',
        parties: [
            { id: 1, name: 'محمد جاسم الكاظمي', role: 'مدعي', isClient: true },
            { id: 2, name: 'شركة النور للتجارة', role: 'مدعى عليه', isClient: false },
        ],
        notes: [
            { id: 101, text: 'الموكل يرفض التسوية — مبلغ 8000000 دينار', meta: 'استراتيجية', stageCtx: 'ابتدائي', date: '2024-03-01' },
            { id: 102, text: 'تأجيل الجلسة لعدم حضور الخصم', meta: 'جلسة', stageCtx: 'ابتدائي', date: '2024-04-10' },
            { id: 103, text: 'سري — رقم هاتف الشاهد: 07701234567', meta: 'شاهد', stageCtx: 'ابتدائي', date: '2024-05-01' },
        ],
        images: [
            { url: 'blob:contract', name: 'عقد_بيع.pdf' },
            { url: 'blob:check', name: 'شيك_مرتجع.jpg' },
        ],
        stages: [
            {
                stageName: 'ابتدائي',
                caseNo: '4521/2024',
                court: 'محكمة بداءة الرصافة — الغرفة 7',
                parties: [
                    { id: 1, name: 'محمد جاسم الكاظمي', role: 'مدعي', isClient: true },
                    { id: 2, name: 'شركة النور للتجارة', role: 'مدعى عليه', isClient: false },
                ],
                timeline: [
                    {
                        id: 'tl-1',
                        type: 'appointment',
                        date: '2024-06-15',
                        time: '10:00',
                        title: 'جلسة مرافعة',
                        details: 'تقديم مذكرة دفاع',
                    },
                    {
                        id: 'tl-2',
                        type: 'document',
                        date: '2024-06-01',
                        title: 'مذكرة دفاع',
                        details: 'مرفق PDF',
                        isAttachment: true,
                    },
                ],
            },
        ],
        activeStageIndex: 0,
    } as unknown as FileData;
}

export function richLawsuitSource(): DossierShareSource {
    return extractLawsuitShareSource(buildRichLawsuitFile());
}

export function fieldsWith(overrides: Partial<CaseShareVisibleFields>): CaseShareVisibleFields {
    return { ...DEFAULT_CASE_SHARE_VISIBLE_FIELDS, ...overrides };
}
