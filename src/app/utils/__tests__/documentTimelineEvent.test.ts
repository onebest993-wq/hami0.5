import { describe, expect, it } from 'vitest';
import {
    buildDocumentUploadTimelineEvent,
    prettifyDocumentDisplayName,
} from '@/app/utils/documentTimelineEvent';

describe('prettifyDocumentDisplayName', () => {
    it('drops the extension and turns underscores into spaces', () => {
        expect(
            prettifyDocumentDisplayName('قانون_المرافعات_المدنية_رقم_83_لسنة_1969_المعدل (1).pdf')
        ).toBe('قانون المرافعات المدنية رقم 83 لسنة 1969 المعدل (1)');
    });

    it('collapses repeated whitespace', () => {
        expect(prettifyDocumentDisplayName('ملف   مهم .png')).toBe('ملف مهم');
    });
});

describe('buildDocumentUploadTimelineEvent', () => {
    const nowIso = '2026-07-16T14:30:00.000Z';

    it('builds a clean title and non-repetitive description', () => {
        const e = buildDocumentUploadTimelineEvent(
            'tl1',
            {
                title: 'قانون_المرافعات_المدنية_رقم_83_لسنة_1969_المعدل (1)',
                category: 'عام',
                fileName: 'قانون_المرافعات_المدنية_رقم_83_لسنة_1969_المعدل (1).pdf',
                documentId: 'doc-1',
            },
            nowIso
        );
        expect(e.title).toBe('مستند: قانون المرافعات المدنية رقم 83 لسنة 1969 المعدل (1)');
        // اسم الملف مطابق للعنوان — لا يُكرَّر في الوصف
        expect(e.description).toBe('المجلد: عام · النوع: PDF');
        expect(e.date).toBe('2026-07-16');
        expect(e.timestamp).toBe(nowIso);
        expect(e.metadata).toEqual({
            timelineThreadKey: 'document_upload:doc-1',
            documentId: 'doc-1',
        });
    });

    it('mentions the original filename only when it differs from the title', () => {
        const e = buildDocumentUploadTimelineEvent(
            'tl2',
            {
                title: 'صورة محضر الحجز',
                category: 'محاضر',
                fileName: 'Screenshot 2026-07-16 232527.png',
                documentId: 'doc-2',
            },
            nowIso
        );
        expect(e.description).toBe(
            'المجلد: محاضر · النوع: PNG · الملف الأصلي: Screenshot 2026-07-16 232527'
        );
    });

    it('omits thread metadata when no document id is provided', () => {
        const e = buildDocumentUploadTimelineEvent(
            'tl3',
            { title: 'مستند بلا معرف', category: '', fileName: '' },
            nowIso
        );
        expect(e.metadata).toBeUndefined();
        expect(e.description).toBe('');
    });
});
