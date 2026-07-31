import type { TimelineEvent } from '@/app/types/execution';

export interface DocumentUploadTimelineInfo {
    title: string;
    category: string;
    fileName: string;
    /** معرّف المستند في الخزينة — يربط حدث السجل بالمستند ويمنع تكرار البطاقة */
    documentId?: string;
}

/** تنظيف اسم ملف خام للعرض: إسقاط الامتداد وتحويل الشرطات السفلية إلى مسافات */
export function prettifyDocumentDisplayName(raw: string): string {
    return String(raw || '')
        .replace(/\.[A-Za-z0-9]{2,5}$/u, '')
        .replace(/_+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * حدث السجل الزمني لرفع مستند — عنوان نظيف ووصف بلا تكرار لاسم الملف:
 * المجلد ونوع الملف دائماً، واسم الملف الأصلي فقط إن اختلف عن العنوان.
 */
export function buildDocumentUploadTimelineEvent(
    id: string,
    info: DocumentUploadTimelineInfo,
    nowIso: string
): TimelineEvent {
    const title = prettifyDocumentDisplayName(info.title) || 'مستند';
    const rawFileName = String(info.fileName || '').trim();
    const extMatch = /\.([A-Za-z0-9]{2,5})$/u.exec(rawFileName);
    const ext = extMatch ? extMatch[1].toUpperCase() : '';
    const fileBase = prettifyDocumentDisplayName(rawFileName);

    const parts: string[] = [];
    const category = String(info.category || '').trim();
    if (category) parts.push(`المجلد: ${category}`);
    if (ext) parts.push(`النوع: ${ext}`);
    if (fileBase && fileBase !== title) parts.push(`الملف الأصلي: ${fileBase}`);

    const documentId = String(info.documentId || '').trim();
    return {
        id,
        type: 'other',
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: `مستند: ${title}`,
        description: parts.join(' · '),
        source: 'المستندات والملفات',
        ...(documentId
            ? {
                  metadata: {
                      timelineThreadKey: `document_upload:${documentId}`,
                      documentId,
                  },
              }
            : {}),
    };
}
