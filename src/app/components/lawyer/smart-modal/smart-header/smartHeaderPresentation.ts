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
    'rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.045] to-white/[0.015] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-inset ring-white/[0.04]';

/** بطاقة الأطراف المنفصلة عن ترويسة القضية */
export const PARTIES_CARD_SHELL =
    'rounded-2xl mb-2 backdrop-blur-xl bg-[#0A0F1C]/48 border border-[#E6C673]/12 shadow-[0_10px_36px_rgba(0,0,0,0.28)] overflow-hidden';

export const CLIENT_MARKER_SLOT = 'shrink-0 w-10 flex items-center justify-center';
