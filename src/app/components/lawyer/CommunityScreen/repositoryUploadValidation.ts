const REPOSITORY_UPLOAD_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
const REPOSITORY_UPLOAD_DOCUMENT_EXTENSIONS = ['.pdf', '.docx'] as const;
export const REPOSITORY_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const REPOSITORY_UPLOAD_TITLE_MAX = 200;
const REPOSITORY_UPLOAD_DESCRIPTION_MAX = 4_000;

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

function startsWithBytes(header: Uint8Array, magic: number[]): boolean {
    if (header.length < magic.length) return false;
    return magic.every((byte, index) => header[index] === byte);
}

/** يرفض SVG/تنفيذاً مموّهاً بامتداد صورة أو مستند */
export function repositoryUploadMagicLooksValid(
    header: Uint8Array,
    kind: RepositoryUploadKind,
    fileName: string,
): boolean {
    const ext = fileExtension(fileName);
    if (kind === 'image') {
        if (ext === '.jpg' || ext === '.jpeg') return startsWithBytes(header, [0xff, 0xd8, 0xff]);
        if (ext === '.png') return startsWithBytes(header, [0x89, 0x50, 0x4e, 0x47]);
        if (ext === '.webp') {
            return startsWithBytes(header, [0x52, 0x49, 0x46, 0x46]) && header.length >= 12
                && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
        }
        return false;
    }
    if (ext === '.pdf') return startsWithBytes(header, [0x25, 0x50, 0x44, 0x46]);
    if (ext === '.docx') return startsWithBytes(header, [0x50, 0x4b]);
    return false;
}

export async function validateRepositoryUploadFileContents(
    file: File,
    kind: RepositoryUploadKind,
): Promise<string | null> {
    const nameError = validateRepositoryUploadFile(file, kind);
    if (nameError) return nameError;
    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!repositoryUploadMagicLooksValid(header, kind, file.name)) {
        return 'نوع الملف لا يطابق امتداده';
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
