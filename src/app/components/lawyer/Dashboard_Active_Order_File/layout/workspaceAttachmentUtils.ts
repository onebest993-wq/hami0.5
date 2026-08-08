export type WorkspaceAttachmentKind = 'image' | 'pdf' | 'file';

export function resolveWorkspaceAttachmentKind(name: string, url?: string): WorkspaceAttachmentKind {
    if (url?.startsWith('data:image/')) return 'image';
    if (url?.startsWith('data:application/pdf')) return 'pdf';
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)) return 'image';
    if (/\.pdf$/i.test(name)) return 'pdf';
    return 'file';
}

export function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('تعذّر قراءة الملف'));
        };
        reader.onerror = () => reject(reader.error ?? new Error('تعذّر قراءة الملف'));
        reader.readAsDataURL(file);
    });
}
