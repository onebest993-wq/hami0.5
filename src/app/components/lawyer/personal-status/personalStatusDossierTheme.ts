/**
 * إضبارة الأحوال الشخصية — زجاج لؤلؤي مضيء
 */
import { HUB_DOSSIER_MODAL_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
import { personalPearlHubTheme } from './personalStatusPearlTheme';

export const PS_DOSSIER_BG = '#101018';
export const PS_DOSSIER_SURFACE = '#16161F';
export const PS_ACCENT = '#C9B89A';
export const PS_ACCENT_ROSE = '#ECE8E2';
export const PS_ACCENT_DIM = '#9894A0';
export const PS_TEXT = '#FFFEF9';
export const PS_TEXT_MUTED = '#9894A0';

export const PS_CHROME_BAR =
    'sticky top-0 z-50 w-full shrink-0 print:hidden relative overflow-hidden border-b border-white/[0.10] bg-[#16161F]/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.28)]';

export const PS_STAGE_RAIL =
    'sticky top-[56px] z-40 w-full print:hidden relative overflow-hidden border-b border-white/[0.08] bg-[#14141C]/88 backdrop-blur-xl';

export const PS_SCROLL_BODY =
    'flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y scrollbar-hide px-2.5 pb-4 sm:px-3 sm:pb-5 print:overflow-visible print:max-h-max';

export const PS_CHROME_BTN =
    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.14] bg-white/[0.06] text-[#9894A0] hover:text-[#FFFEF9] hover:border-white/[0.22] hover:bg-white/[0.10] transition-all text-xs font-bold backdrop-blur-sm';

export const PS_CHROME_ICON_BTN =
    'p-1.5 rounded-lg border border-[#F0A8B4]/24 bg-gradient-to-br from-[#F5C6D0]/[0.14] to-[#E8B4BC]/[0.07] text-[#F5C6D0] hover:text-[#FFE8EC] hover:border-[#F0A8B4]/38 hover:from-[#F5C6D0]/[0.20] transition-all backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,220,228,0.22)]';

export const PS_CHROME_TRASH_BTN_IDLE =
    'p-1.5 rounded-lg border border-white/[0.14] bg-white/[0.05] text-[#9894A0] hover:text-[#FFD4DC] hover:border-[#F0A8B4]/28 hover:bg-[#F5C6D0]/[0.10] transition-all backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

export const PS_CHROME_TRASH_BTN_ACTIVE =
    'p-1.5 rounded-lg border border-[#F0A8B4]/38 bg-gradient-to-br from-[#F5C6D0]/[0.22] to-[#E8B4BC]/[0.10] text-[#FFD4DC] shadow-[0_0_16px_rgba(240,168,180,0.22),inset_0_1px_0_rgba(255,220,228,0.24)] backdrop-blur-sm transition-all';

export const PS_STAGE_PILL_ACTIVE =
    'border border-[#F0A8B4]/34 bg-gradient-to-l from-[#F5C6D0]/[0.20] via-[#FFD4DC]/[0.10] to-white/[0.05] text-[#FFFEF9] shadow-[0_0_18px_rgba(240,168,180,0.20),inset_0_1px_0_rgba(255,220,228,0.24)] backdrop-blur-sm';

export const PS_STAGE_PILL_IDLE =
    'border border-white/[0.10] bg-white/[0.04] text-[#9894A0] hover:border-white/[0.18] hover:text-[#ECE8E2]';

export const PS_STAGE_PILL_PAST =
    'border border-white/[0.06] text-[#9894A0]/40';

export const PS_CARD =
    'relative rounded-[1.25rem] border border-white/[0.12] bg-gradient-to-br from-white/[0.07] via-[#F8F6F0]/[0.04] to-[#ECE8E2]/[0.03] overflow-hidden backdrop-blur-md shadow-[0_10px_36px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.08)]';

export const PS_CARD_INSET = 'px-3 py-2.5';

export const PS_DIVIDER = 'border-white/[0.10]';

export const PS_TEXT_LABEL = 'text-[9px] font-bold text-[#ECE8E2]/85 tracking-[0.12em]';

export const PS_TEXT_BODY = 'text-xs font-semibold text-[#FFFEF9]';

export const PS_LAW_TRIGGER =
    'w-full py-3 px-3.5 rounded-[1.25rem] border border-white/[0.14] bg-white/[0.06] hover:border-white/[0.22] hover:bg-white/[0.09] flex items-center justify-between gap-3 transition-colors text-right mb-3 backdrop-blur-md';

export const PS_LAW_OVERLAY =
    `fixed inset-0 ${HUB_DOSSIER_MODAL_Z_CLASS} bg-[#101018]/92 backdrop-blur-md font-['Tajawal'] pointer-events-auto`;

export const PS_LAW_SHELL =
    'w-full h-full flex flex-col bg-gradient-to-b from-[#1E1E28] via-[#16161F] to-[#101018] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]';

export const PS_LAW_HEADER =
    'relative px-4 sm:px-6 py-3 border-b border-white/[0.10] bg-gradient-to-l from-white/[0.06] to-transparent flex justify-between items-center shrink-0';

export const PS_TAB_ACTIVE =
    'border-white/[0.22] bg-white/[0.10] text-[#FFFEF9]';

export const PS_TAB_IDLE =
    'border-white/[0.10] bg-white/[0.04] text-[#9894A0] hover:border-white/[0.18] hover:text-[#ECE8E2]';

export const PS_QUICK_BTN =
    'flex-1 min-w-[4.25rem] py-2.5 rounded-lg border border-white/[0.12] bg-white/[0.05] text-[10px] font-semibold text-[#9894A0] hover:border-white/[0.20] hover:text-[#ECE8E2] transition-colors active:scale-[0.98] backdrop-blur-sm';

export function personalHubTheme() {
    return personalPearlHubTheme();
}

export const PS_PANEL_SHELL = PS_CARD;
export const PS_PANEL_TOP_BAR = 'hidden';
export const PS_GLASS_PANEL = PS_CARD;
export const PS_GLASS_PANEL_HEADER = `${PS_CARD_INSET} border-b ${PS_DIVIDER}`;
export const PS_HUB_TRIGGER = PS_LAW_TRIGGER;
export const PS_HUB_OVERLAY = PS_LAW_OVERLAY;
export const PS_HUB_SHELL = PS_LAW_SHELL;
export const PS_HUB_HEADER = PS_LAW_HEADER;
export const PS_HUB_FIELD =
    'w-full min-w-0 bg-white/[0.06] border border-white/[0.14] rounded-xl px-3 py-2.5 text-sm text-[#FFFEF9] outline-none focus:border-white/[0.26] focus:bg-white/[0.09] transition-all [color-scheme:dark]';
export const PS_HUB_BTN =
    'w-full max-w-5xl mx-auto py-3 rounded-xl bg-white/[0.10] border border-white/[0.18] text-[#FFFEF9] text-sm font-bold transition-all hover:bg-white/[0.14] disabled:opacity-40 shrink-0';
export const PS_QUICK_ACTION = PS_QUICK_BTN;
export const PS_TODO_HEADER = `flex items-center justify-between rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-2.5 mb-2 backdrop-blur-sm`;
export const PS_TIMELINE_EMPTY =
    'text-center py-10 rounded-xl border border-dashed border-white/[0.16] bg-white/[0.03]';
