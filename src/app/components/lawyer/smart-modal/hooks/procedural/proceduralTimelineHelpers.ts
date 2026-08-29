import type { AppointmentType } from '../../../LawyerShared';

export function buildTimelineVaultDocSnapshot(doc: Record<string, unknown> | undefined) {
    return doc
        ? {
              id: typeof doc.id === 'string' ? doc.id : '',
              title: typeof doc.title === 'string' ? doc.title : '',
              type: doc.type,
              tags: Array.isArray(doc.tags) ? doc.tags : [],
              authorId: typeof doc.authorId === 'string' ? doc.authorId : '',
              createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : '',
              updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : '',
              fileSize: typeof doc.fileSize === 'number' ? doc.fileSize : 0,
              fileName: typeof doc.fileName === 'string' ? doc.fileName : '',
              mimeType: typeof doc.mimeType === 'string' ? doc.mimeType : '',
              storagePath: typeof doc.storagePath === 'string' ? doc.storagePath : '',
              signedUrl: null,
              aiSummary: typeof doc.aiSummary === 'string' ? doc.aiSummary : null,
              lawyerNote: typeof doc.lawyerNote === 'string' ? doc.lawyerNote : null,
              customCategory: typeof doc.customCategory === 'string' ? doc.customCategory : null,
              isProcessing: Boolean(doc.isProcessing),
              boundDossierId: typeof doc.boundDossierId === 'string' ? doc.boundDossierId : null,
          }
        : undefined;
}

export function resolveAppointmentSubType(purpose: string, tags: string[]): AppointmentType {
    const blob = `${purpose} ${tags.join(' ')}`.toLowerCase();
    if (blob.includes('مرافعة')) return 'pleading';
    if (blob.includes('شهود') || blob.includes('شاهد')) return 'witness';
    if (blob.includes('قرار') || blob.includes('حكم')) return 'verdict';
    if (blob.includes('تحقيق') || blob.includes('كشف') || blob.includes('خبير')) return 'investigation';
    return 'other';
}

export function textImpliesPleadingsClosed(title: string, details: string): boolean {
    return (
        title.includes('ختام المرافعة') ||
        title.includes('حجز الدعوى') ||
        details.includes('ختام المرافعة') ||
        details.includes('حجز الدعوى')
    );
}
