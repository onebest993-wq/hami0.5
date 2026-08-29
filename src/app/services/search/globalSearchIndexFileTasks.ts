import type { FileData, Task } from '@/app/components/lawyer/LawyerShared';

/** عناوين مهام الملف داخل وثيقة الملف — بلا وثيقة Fuse لكل مهمة. */
export function fileTasksSearchHaystack(f: FileData): string {
    const parts: string[] = [];
    for (const t of f.tasks ?? []) {
        const title = (t as Task).title?.trim() || (t as { text?: string }).text?.trim();
        if (title) parts.push(title);
        const details = (t as Task).details?.trim();
        if (details) parts.push(details);
    }
    return parts.join(' ');
}
