import type { FileData, Party } from '@/app/components/lawyer/LawyerShared';
import { normalizeArabicSearch } from '@/app/services/search/normalizeArabicSearch';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import type { SearchLifecycle } from '@/app/services/searchLifecycle';

export function withLifecycle(
    entry: Omit<GlobalSearchEntry, 'lifecycle'>,
    lifecycle: SearchLifecycle,
): GlobalSearchEntry {
    return { ...entry, lifecycle };
}

export function isSearchEntryVisible(entry: Pick<GlobalSearchEntry, 'lifecycle'>): boolean {
    return entry.lifecycle !== 'deleted';
}

export function norm(text: string): string {
    return normalizeArabicSearch(text).toLowerCase();
}

export function blob(parts: (string | undefined | null)[]): string {
    return norm(parts.filter(Boolean).join(' '));
}

export function partyNames(parties: Party[] | undefined): string {
    return (parties ?? []).map((p) => `${p.name || ''} ${p.phone || ''} ${p.role || ''}`).join(' ');
}

export function noteTexts(notes: FileData['notes'] | undefined): string {
    return (notes ?? []).map((n) => n.text || '').join(' ');
}
