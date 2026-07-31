import {
    HUB_DOSSIER_Z_CLASS,
    HUB_NESTED_OVERLAY_Z_CLASS,
} from '@/app/components/lawyer/dashboard/hubOverlayStack';

/**
 * سطح بصري لمسار الأحوال الشخصية — نفس عائلة قسم الدعاوى (كحلي + ذهبي زجاجي)
 * دون استيراد مكوّنات/تخطيط نموذج القضاء المدني.
 */
export const PERSONAL_STATUS_FORM_SHELL =
    `fixed inset-0 ${HUB_NESTED_OVERLAY_Z_CLASS} flex flex-col overflow-hidden bg-[#080c14] font-['Tajawal']`;

export const PERSONAL_STATUS_FORM_GRADIENT =
    'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(230,198,115,0.07),transparent_52%)]';

export const PERSONAL_STATUS_FORM_GRADIENT_2 =
    'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_100%,rgba(90,120,180,0.06),transparent_48%)]';

export const PERSONAL_STATUS_DOSSIER_ROOT =
    `fixed inset-0 ${HUB_DOSSIER_Z_CLASS} bg-[#0B1021] font-['Tajawal'] overflow-hidden pointer-events-auto print:static print:bg-transparent print:overflow-visible`;

export const PERSONAL_STATUS_DOSSIER_PANEL = 'w-full h-full max-w-none mx-0 my-0 bg-[#0B1021]';

export const PERSONAL_STATUS_DOSSIER_INNER =
    'flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0B1021] relative';

export const PERSONAL_STATUS_ACCENT = '#E6C673';

export const PERSONAL_STATUS_FIELD =
    'w-full rounded-xl border border-white/[0.1] bg-white/[0.05] backdrop-blur-sm px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#E6C673]/55 focus:ring-1 focus:ring-[#E6C673]/20';

export const PERSONAL_STATUS_FIELD_ERROR = 'border-amber-500/60 ring-1 ring-amber-500/20';

export const PERSONAL_STATUS_LABEL = 'text-[10px] text-white/55 mb-1.5 block';

export const PERSONAL_STATUS_SECTION =
    'border-b border-white/[0.06] bg-white/[0.028] backdrop-blur-md p-5';

export const PERSONAL_STATUS_SECTION_TITLE =
    'text-xs font-bold text-[#E6C673]/88 tracking-wide mb-4';

export const PERSONAL_STATUS_TAB_BAR =
    'sticky top-0 z-30 border-b border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';

export const PERSONAL_STATUS_TAB_ACTIVE =
    'border border-[#E6C673]/35 bg-[#E6C673]/12 text-[#F5EED8]';

export const PERSONAL_STATUS_FOOTER =
    'shrink-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/[0.08] bg-[#080c14]/75 backdrop-blur-xl';

export const PERSONAL_STATUS_SAVE_BTN =
    'w-full h-12 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/15 backdrop-blur-sm text-[#F5EED8] font-bold text-sm shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-[#E6C673]/22 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation';

export const PERSONAL_STATUS_LAW_CHIP_ACTIVE =
    'border-[#E6C673]/45 bg-[#E6C673]/10 text-[#E6C673] shadow-[0_0_12px_rgba(230,198,115,0.08)]';

export const PERSONAL_STATUS_LAW_CHIP_IDLE =
    'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/15 hover:text-white/65';

export const PERSONAL_STATUS_PARTIES_WRAP = 'px-4 py-4 border-b border-white/[0.06]';

export const PERSONAL_STATUS_PARTIES_CARD =
    'rounded-xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] p-4';

export const PERSONAL_STATUS_PARTIES_TITLE = 'text-xs font-bold text-[#E6C673]/88 tracking-wide mb-3';

export function personalFieldClass(hasError?: boolean): string {
    return `${PERSONAL_STATUS_FIELD} ${hasError ? PERSONAL_STATUS_FIELD_ERROR : ''}`;
}
