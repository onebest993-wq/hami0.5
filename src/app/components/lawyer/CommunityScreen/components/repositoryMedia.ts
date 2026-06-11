import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

export type RepositoryMediaKind = 'image' | 'pdf' | 'document';
export type RepositoryMediaIconKind = 'image' | 'file';

export function inferRepositoryMimeType(file: File): string {
    if (file.type) return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return (ext && map[ext]) || 'application/octet-stream';
}

export function getRepositoryMediaKind(mimeType: string, fileName: string): RepositoryMediaKind {
    if (mimeType.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(fileName)) {
        return 'image';
    }
    if (mimeType === 'application/pdf' || /\.pdf$/i.test(fileName)) {
        return 'pdf';
    }
    return 'document';
}

export function repositoryMediaLabel(kind: RepositoryMediaKind): string {
    switch (kind) {
        case 'image':
            return 'صورة';
        case 'pdf':
            return 'PDF';
        default:
            return 'ملف';
    }
}

export function getRepositoryMediaIconKind(
    doc: Pick<RepositoryDocument, 'mimeType' | 'fileName'>,
): RepositoryMediaIconKind {
    return getRepositoryMediaKind(doc.mimeType, doc.fileName) === 'image' ? 'image' : 'file';
}
