import type { FileData } from './lawsuitFileTypes';
import { sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';

const MAX_HAYSTACK_CHARS = 640;
const LEGAL_XSS_WHITELIST = /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s\,\.\-\(\)\u060C\u061B\u061F\u200C-\u200F]/g;

function whitelistPlain(raw: string): string {
    return String(raw ?? '').replace(LEGAL_XSS_WHITELIST, '');
}

function safeInbound(raw: unknown, maxLen: number): string {
    const step1 = sanitizeProfilePlainText(raw, maxLen);
    return whitelistPlain(step1);
}

function partySearchBlob(parties: FileData['parties']): string {
    if (!Array.isArray(parties) || parties.length === 0) return '';
    return parties
        .map((p) => [safeInbound(p.name, 200), safeInbound(p.phone, 40), safeInbound(p.role, 80)].filter(Boolean).join(' '))
        .join(' ');
}

function noteSearchBlob(notes: FileData['notes']): string {
    if (!Array.isArray(notes) || notes.length === 0) return '';
    return notes.map((n) => safeInbound(n.text, 400)).join(' ');
}

/** نص بحث مضغوط — يُخزَّن في lifecycleIndex للمخزن/المهملات دون تحميل segment */
export function buildLawsuitIndexSearchHaystack(file: FileData): string {
    const client = safeInbound(
        file.parties?.find((p) => p.isClient)?.name || file.parties?.[0]?.name || '',
        200,
    );
    const title = safeInbound((file as { title?: string }).title ?? '', 300);
    const jurisdictionHint =
        file.lawsuitJurisdiction === 'personal'
            ? 'أحوال شخصية'
            : file.lawsuitJurisdiction === 'civil'
              ? 'قضاء مدني'
              : '';
    const applicableLaw = safeInbound(
        (file as { applicableLaw?: string }).applicableLaw ??
            (file as { personalApplicableLaw?: string }).personalApplicableLaw ??
            '',
        200,
    );
    const blob = [
        safeInbound(file.caseNo, 80),
        title,
        safeInbound(file.court, 200),
        safeInbound(file.docType, 120),
        safeInbound(file.judge, 120),
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
    const client = safeInbound(
        file.parties?.find((p) => p.isClient)?.name || file.parties?.[0]?.name,
        200,
    );
    const trimmed = client?.trim();
    return trimmed || undefined;
}
