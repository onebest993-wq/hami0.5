import { formatNumberInput } from '@/app/components/lawyer/FinancialOperationsCenter/utils';

export const GLASS_CHIP =
    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold shrink-0 leading-none';

export const MAIN_FILE_CATEGORIES = new Set(['lawsuit', 'transaction', 'execution']);

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

export function displayCaseNo(caseNo: unknown): string {
    const raw = String(caseNo ?? '').trim();
    return raw || '---/---';
}

export const PARTY_STRIP_SHELL =
    'rounded-[18px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] backdrop-blur-xl shadow-[0_12px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.03]';

/** بطاقة الأطراف المنفصلة عن ترويسة القضية */
export const PARTIES_CARD_SHELL =
    'rounded-[22px] mb-1.5 backdrop-blur-2xl bg-[radial-gradient(circle_at_top,rgba(230,198,115,0.09),transparent_34%),linear-gradient(180deg,rgba(12,18,31,0.94),rgba(8,12,22,0.96))] border border-[#E6C673]/12 shadow-[0_18px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-visible';

export const CLIENT_MARKER_SLOT = 'shrink-0 min-w-[2.25rem] flex items-center justify-center';
