import {
    HUB_DOSSIER_Z_CLASS,
} from '@/app/components/lawyer/dashboard/hubOverlayStack';

/**
 * سطح بصري لمسار الأحوال الشخصية — مضغوط وأخف (بدون blur ثقيل)
 */
export const PERSONAL_STATUS_DOSSIER_ROOT =
    `fixed inset-0 ${HUB_DOSSIER_Z_CLASS} bg-[#0B1021] font-['Tajawal'] overflow-hidden pointer-events-auto print:static print:bg-transparent print:overflow-visible flex`;

export const PERSONAL_STATUS_DOSSIER_PANEL =
    'hami-shell-overlay-column w-full h-full mx-auto my-0 bg-[#0B1021]';

export const PERSONAL_STATUS_DOSSIER_INNER =
    'flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0B1021] relative';

export const PERSONAL_STATUS_FIELD =
    'w-full min-h-[44px] rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#E6C673]/5 focus:ring-1 focus:ring-[#E6C673]/15';

export const PERSONAL_STATUS_FIELD_ERROR = 'border-amber-500/60 ring-1 ring-amber-500/20';

export const PERSONAL_STATUS_LABEL = 'text-[10px] text-white/55 mb-1 block';

export const PERSONAL_STATUS_SECTION =
    'border-b border-white/[0.06] bg-white/[0.015] p-2.5';

export const PERSONAL_STATUS_SECTION_TITLE =
    'text-[11px] font-bold text-[#E6C673]/85 tracking-wide mb-2.5';

export const PERSONAL_STATUS_TAB_BAR =
    'sticky top-0 z-30 border-b border-white/[0.06] bg-[#0B1021]/95';

export const PERSONAL_STATUS_TAB_ACTIVE =
    'border border-[#E6C673]/3 bg-[#E6C673]/1 text-[#F5EED8]';

export const PERSONAL_STATUS_FOOTER =
    'shrink-0 z-50 p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/[0.07] bg-[#080c14]/9';

export const PERSONAL_STATUS_SAVE_BTN =
    'w-full h-11 min-h-[44px] rounded-lg border border-[#E6C673]/3 bg-[#E6C673]/12 text-[#F5EED8] font-bold text-sm hover:bg-[#E6C673]/18 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation';

export const PERSONAL_STATUS_LAW_CHIP_ACTIVE =
    'border-[#E6C673]/4 bg-[#E6C673]/08 text-[#E6C673]';

export const PERSONAL_STATUS_LAW_CHIP_IDLE =
    'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/15 hover:text-white/65';

export function personalFieldClass(hasError?: boolean): string {
    return `${PERSONAL_STATUS_FIELD} ${hasError ? PERSONAL_STATUS_FIELD_ERROR : ''}`;
}
