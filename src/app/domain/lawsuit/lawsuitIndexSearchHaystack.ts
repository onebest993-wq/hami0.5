import type { FileData } from './lawsuitFileTypes';

const MAX_HAYSTACK_CHARS = 640;

function partySearchBlob(parties: FileData['parties']): string {
    if (!Array.isArray(parties) || parties.length === 0) return '';
    return parties
        .map((p) => [p.name, p.phone, p.role].filter(Boolean).join(' '))
        .join(' ');
}

function noteSearchBlob(notes: FileData['notes']): string {
    if (!Array.isArray(notes) || notes.length === 0) return '';
    return notes.map((n) => n.text || '').join(' ');
}

/** نص بحث مضغوط — يُخزَّن في lifecycleIndex للمخزن/المهملات دون تحميل segment */
export function buildLawsuitIndexSearchHaystack(file: FileData): string {
    const client =
        file.parties?.find((p) => p.isClient)?.name || file.parties?.[0]?.name || '';
    const title = String((file as { title?: string }).title ?? '').trim();
    const jurisdictionHint =
        file.lawsuitJurisdiction === 'personal'
            ? 'أحوال شخصية'
            : file.lawsuitJurisdiction === 'civil'
              ? 'قضاء مدني'
              : '';
    const applicableLaw = String(
        (file as { applicableLaw?: string }).applicableLaw ??
            (file as { personalApplicableLaw?: string }).personalApplicableLaw ??
            '',
    ).trim();
    const blob = [
        file.caseNo,
        title,
        file.court,
        file.docType,
        file.judge,
        client,
        partySearchBlob(file.parties),
        noteSearchBlob(file.notes),
        jurisdictionHint,
        applicableLaw,
    ]
        .filter(Boolean)
        .join(' ');
    return blob.length > MAX_HAYSTACK_CHARS ? blob.slice(0, MAX_HAYSTACK_CHARS) : blob;
}

export function resolveLawsuitIndexClientName(file: FileData): string | undefined {
    const client = file.parties?.find((p) => p.isClient)?.name || file.parties?.[0]?.name;
    const trimmed = client?.trim();
    return trimmed || undefined;
}
