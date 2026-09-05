/** نوع ملف المستودع — مصدر واحد للواجهة وعمود `media_kind` المولَّد. */
export type RepositoryMediaKind = 'image' | 'pdf' | 'document';

export const REPOSITORY_MEDIA_KIND_COLUMN = 'media_kind';

export function getRepositoryMediaKind(mimeType: string, fileName: string): RepositoryMediaKind {
    if (mimeType.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(fileName)) {
        return 'image';
    }
    if (mimeType === 'application/pdf' || /\.pdf$/i.test(fileName)) {
        return 'pdf';
    }
    return 'document';
}

export function isMissingMediaKindColumn(message: string | null | undefined): boolean {
    if (!message) return false;
    return (
        message.includes(REPOSITORY_MEDIA_KIND_COLUMN) &&
        /does not exist|schema cache|undefined column|42703/i.test(message)
    );
}
