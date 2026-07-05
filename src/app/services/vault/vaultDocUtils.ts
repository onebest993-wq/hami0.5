import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { docMatchesCategoryFilter } from '@/app/services/vaultCustomCategories';

export function inferDocType(mimeType: string, fileName?: string): 'pdf' | 'image' {
    const mime = (mimeType || '').toLowerCase();
    const name = fileName || '';
    if (mime.startsWith('image/')) return 'image';
    if (/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name)) return 'image';
    if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
    return 'pdf';
}

export type VaultMediaKind = 'image' | 'pdf' | 'audio' | 'file';

export function resolveVaultMediaKind(doc: SmartVaultDoc): VaultMediaKind {
    const mime = (doc.mimeType || '').toLowerCase();
    const name = (doc.fileName || doc.title || '').toLowerCase();

    if (doc.type === 'image' || mime.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name)) {
        return 'image';
    }
    if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|webm|flac)$/i.test(name)) {
        return 'audio';
    }
    if (doc.type === 'pdf' || mime === 'application/pdf' || /\.pdf$/i.test(name)) {
        return 'pdf';
    }
    return 'file';
}

export function vaultMediaKindLabel(kind: VaultMediaKind): string {
    switch (kind) {
        case 'image':
            return 'صورة';
        case 'pdf':
            return 'PDF';
        case 'audio':
            return 'صوت';
        default:
            return 'ملف';
    }
}

export function inferTags(title: string): string[] {
    const tags: string[] = [];
    if (/عقد|إيجار/.test(title)) tags.push('عقود');
    if (/طابو|تمليك/.test(title)) tags.push('طابو');
    if (/عريضة|عرائض|مرافعات|تعويض/.test(title)) tags.push('عرائض');
    if (tags.length === 0) {
        if (/بحث|مذكرة|دراسة/.test(title)) tags.push('بحث قانوني');
        else if (/حكم|قرار|تمييز/.test(title)) tags.push('قرار حكم');
        else tags.push('أخرى');
    }
    return tags;
}

export function formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatVaultDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'اليوم';
        if (days === 1) return 'أمس';
        if (days < 7) return `منذ ${days} أيام`;
        return d.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
}

export function vaultDocMatchesSearch(doc: SmartVaultDoc, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
        doc.title.toLowerCase().includes(q) ||
        (doc.customCategory?.toLowerCase().includes(q) ?? false) ||
        doc.tags.some((t) => t.toLowerCase().includes(q)) ||
        (doc.lawyerNote?.toLowerCase().includes(q) ?? false) ||
        (doc.aiSummary?.toLowerCase().includes(q) ?? false) ||
        (doc.fileName?.toLowerCase().includes(q) ?? false)
    );
}

export function filterVaultDocs(
    docs: SmartVaultDoc[],
    activeFilter: string,
    searchQuery: string,
): SmartVaultDoc[] {
    return docs.filter(
        (doc) => docMatchesCategoryFilter(doc, activeFilter) && vaultDocMatchesSearch(doc, searchQuery),
    );
}

export function revokeBlobUrlIfNeeded(url: string | null | undefined): void {
    if (!url?.startsWith('blob:')) return;
    try {
        URL.revokeObjectURL(url);
    } catch {
        /* ignore */
    }
}

/** دمج قوائم وثائق المخزن — يحافظ على signedUrl الأحدث */
export function mergeSmartVaultDocs(base: SmartVaultDoc[], overlay: SmartVaultDoc[]): SmartVaultDoc[] {
    const map = new Map<string, SmartVaultDoc>();
    for (const d of base) map.set(d.id, d);
    for (const d of overlay) {
        const prev = map.get(d.id);
        if (!prev) {
            map.set(d.id, d);
            continue;
        }
        const prevTime = Number.isFinite(Date.parse(prev.updatedAt)) ? Date.parse(prev.updatedAt) : 0;
        const nextTime = Number.isFinite(Date.parse(d.updatedAt)) ? Date.parse(d.updatedAt) : 0;
        const winner = nextTime >= prevTime ? d : prev;
        const other = nextTime >= prevTime ? prev : d;
        map.set(d.id, {
            ...winner,
            signedUrl: winner.signedUrl ?? other.signedUrl ?? null,
            storagePath: winner.storagePath || other.storagePath,
        });
    }
    return Array.from(map.values());
}
