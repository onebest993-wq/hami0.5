export const REPOSITORY_UPLOAD_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
export const REPOSITORY_UPLOAD_DOCUMENT_EXTENSIONS = ['.pdf', '.docx'] as const;
export const REPOSITORY_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const REPOSITORY_UPLOAD_TITLE_MAX = 200;
export const REPOSITORY_UPLOAD_DESCRIPTION_MAX = 4_000;

export type RepositoryUploadKind = 'image' | 'document';

function fileExtension(name: string): string {
    const parts = name.split('.');
    if (parts.length < 2) return '';
    return `.${parts.pop()?.toLowerCase() ?? ''}`;
}

export function validateRepositoryUploadFile(
    file: File,
    kind: RepositoryUploadKind,
): string | null {
    const ext = fileExtension(file.name);
    const allowed =
        kind === 'image' ? REPOSITORY_UPLOAD_IMAGE_EXTENSIONS : REPOSITORY_UPLOAD_DOCUMENT_EXTENSIONS;
    if (!allowed.some((candidate) => candidate === ext)) {
        return kind === 'image'
            ? 'اختر صورة بصيغة JPG أو PNG أو WEBP'
            : 'اختر ملفاً بصيغة PDF أو DOCX';
    }
    if (file.size > REPOSITORY_UPLOAD_MAX_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        return `حجم الملف كبير جداً (${mb}MB). الحد الأقصى هو 10MB`;
    }
    if (file.size <= 0) {
        return 'الملف فارغ';
    }
    return null;
}

export function sanitizeRepositoryUploadTitle(value: string): string {
    return value.trim().slice(0, REPOSITORY_UPLOAD_TITLE_MAX);
}

export function sanitizeRepositoryUploadDescription(value: string): string {
    return value.trim().slice(0, REPOSITORY_UPLOAD_DESCRIPTION_MAX);
}

export function repositoryUploadAcceptValue(kind: RepositoryUploadKind): string {
    return (kind === 'image'
        ? REPOSITORY_UPLOAD_IMAGE_EXTENSIONS
        : REPOSITORY_UPLOAD_DOCUMENT_EXTENSIONS
    ).join(',');
}
