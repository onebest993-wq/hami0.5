import { formatNumberInput } from '@/app/utils/execution/amountInputCore';

export const GLASS_CHIP =
    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold shrink-0 leading-none';

const MAIN_FILE_CATEGORIES = new Set(['lawsuit', 'transaction', 'execution']);

export function resolveLawsuitTypeLabel(formData: { docType?: string; type?: string }): string {
    const docType = String(formData.docType ?? '').trim();
    if (docType) return docType;
    const type = String(formData.type ?? '').trim();
    if (type && !MAIN_FILE_CATEGORIES.has(type)) return type;
    return '';
}

export function formatClaimValueDisplay(raw: unknown): string {
    const digits = String(raw ?? '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    return formatNumberInput(digits);
}

export function displayMetaField(value: unknown, empty = 'غير محدد'): string {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '—' || raw === '-' || raw === '–') return empty;
    return raw;
}

export function displayCaseNo(caseNo: unknown): string {
    return displayMetaField(caseNo);
}

export function caseNoTextDir(caseNo: unknown): 'ltr' | 'rtl' {
    const raw = String(caseNo ?? '').trim();
    if (!raw) return 'rtl';
    return /[\u0600-\u06FF]/.test(raw) ? 'rtl' : 'ltr';
}

export const PARTY_STRIP_SHELL =
    'rounded-2xl border border-white/[0.07] bg-[#0C1220]/88 shadow-[0_6px_18px_rgba(0,0,0,0.18)]';

export const CLIENT_MARKER_SLOT = 'shrink-0 min-w-[2.25rem] flex items-center justify-center';
