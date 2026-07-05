import {
    HUB_DOSSIER_Z_CLASS,
    HUB_NESTED_OVERLAY_Z_CLASS,
} from '@/app/components/lawyer/dashboard/hubOverlayStack';

/** فئات بصرية لمسار الأحوال الشخصية — مختلفة جذرياً عن القضاء المدني. */
export const PERSONAL_STATUS_FORM_SHELL =
    `fixed inset-0 ${HUB_NESTED_OVERLAY_Z_CLASS} flex flex-col overflow-hidden bg-[#0e0c0d] font-['Tajawal']`;

export const PERSONAL_STATUS_FORM_GRADIENT = 'pointer-events-none absolute inset-0 opacity-0';

export const PERSONAL_STATUS_FORM_GRADIENT_2 = 'pointer-events-none absolute inset-0 opacity-0';

export const PERSONAL_STATUS_DOSSIER_ROOT =
    `fixed inset-0 ${HUB_DOSSIER_Z_CLASS} bg-[#101018] font-['Tajawal'] overflow-hidden pointer-events-auto print:static print:bg-transparent print:overflow-visible`;

export const PERSONAL_STATUS_DOSSIER_PANEL =
    'w-full h-full max-w-none mx-0 my-0 bg-[#101018]';

export const PERSONAL_STATUS_DOSSIER_INNER =
    'flex-1 flex flex-col min-h-0 overflow-hidden bg-[#101018] relative';

export const PERSONAL_STATUS_ACCENT = '#C9B89A';

export const PERSONAL_STATUS_SECTION =
    'border-b border-rose-300/10 bg-gradient-to-l from-rose-400/[0.06] via-transparent to-emerald-400/[0.04] backdrop-blur-md p-5';

export const PERSONAL_STATUS_SECTION_TITLE =
    'text-[11px] font-black text-rose-200/90 mb-3 flex items-center gap-2';

export const PERSONAL_STATUS_FIELD =
    'w-full rounded-xl border border-rose-200/12 bg-[#1a1018]/80 backdrop-blur-sm px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-rose-300/45 focus:ring-1 focus:ring-rose-300/15';

export const PERSONAL_STATUS_LAW_CHIP_ACTIVE =
    'border-rose-300/45 bg-rose-400/12 text-rose-100 shadow-[0_0_14px_rgba(212,165,181,0.12)]';

export const PERSONAL_STATUS_LAW_CHIP_IDLE =
    'border-white/10 bg-white/[0.03] text-white/50 hover:border-rose-200/20 hover:text-white/70';

export const PERSONAL_STATUS_FIELD_ERROR = 'border-amber-500/60 ring-1 ring-amber-500/20';

export const PERSONAL_STATUS_PARTIES_WRAP = 'px-4 py-4 border-b border-rose-300/10';

export const PERSONAL_STATUS_PARTIES_CARD =
    'rounded-2xl border border-rose-200/12 bg-[#1a1018]/55 backdrop-blur-xl shadow-[0_10px_36px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-rose-200/8 p-4';

export const PERSONAL_STATUS_PARTIES_TITLE = 'text-xs font-bold text-rose-200/90 tracking-wide mb-3';

export const PERSONAL_STATUS_FOOTER =
    'shrink-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-rose-300/15 bg-[#120a10]/85 backdrop-blur-xl';

export function personalFieldClass(hasError?: boolean): string {
    return `${PERSONAL_STATUS_FIELD} ${hasError ? PERSONAL_STATUS_FIELD_ERROR : ''}`;
}
