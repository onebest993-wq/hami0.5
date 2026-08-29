/**
 * Luminous Pearl — إضبارة الأحوال الشخصية (مضغوطة / أخف)
 * لؤلؤي #FFFEF9 · فضي #ECE8E2 · لمسة صدفية #C9B89A
 */
import {
    HUB_DOSSIER_ACTIONS_MENU_Z_CLASS,
    HUB_DOSSIER_MODAL_Z_CLASS,
} from '@/app/components/lawyer/dashboard/hubOverlayStack';

const PS_GLASS_SHADOW = '';
const PS_GLASS_SHADOW_SM = '';

const PS_FLOW_MENU =
    `relative w-full min-w-0 max-w-[18rem] font-['Tajawal'] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-150 rounded-lg border border-white/[0.12] bg-[#16161F] overflow-hidden pointer-events-auto`;

export const PS_PAGE = 'relative min-h-full bg-[#0B1021]';

/** لوحة بسيطة — بلا ظل ثقيل */
export const PS_PANEL =
    `relative overflow-hidden rounded-lg border border-white/[0.09] bg-[#16161F]`;

export const PS_PANEL_BEIGE =
    `relative overflow-hidden rounded-lg border border-white/[0.10] bg-[#181820]`;

const PS_PANEL_ROSE_GLASS =
    `relative overflow-hidden rounded-lg border border-[#F0A8B4]/14 bg-[#F5C6D0]/[0.04] ${PS_GLASS_SHADOW_SM}`;

export const PS_PANEL_ELEPHANT = PS_PANEL_ROSE_GLASS;

export const PS_SECTION_HEAD_ROSE =
    'flex items-center justify-between gap-2 px-2 py-1 border-b border-[#F0A8B4]/14';

export const PS_SECTION_LABEL_ROSE =
    'text-[11px] font-bold text-[#FFD4DC]/90';

export const PS_SECTION_LABEL_SAND =
    'text-[11px] font-bold text-[#C9B89A]/90';

export const PS_TEXT_PEARL = 'text-[#FFFEF9]';
export const PS_TEXT_MUTED = 'text-[#9894A0]';
export const PS_TEXT_BEIGE = 'text-[#ECE8E2]';

export const PS_SECTION_HEAD =
    'flex items-center justify-between gap-2 px-2 py-1.5 border-b border-white/[0.08]';

export const PS_SECTION_LABEL =
    'text-[11px] font-bold text-[#C9B89A]';

export const PS_SECTION_BODY = 'p-2 min-h-0';

export const PS_DOCK_BTN_ROSE =
    'min-h-[44px] min-w-[44px] w-11 h-11 rounded-md flex items-center justify-center transition-colors duration-150 border border-white/[0.12] bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:border-white/[0.18] hover:text-white active:scale-95 touch-manipulation';

const PS_TILE_INTERACTIVE =
    `${PS_PANEL} transition-colors duration-150 hover:border-white/[0.18] active:scale-[0.99]`;

export const PS_BTN_PEARL =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/[0.14] text-[#FFFEF9] text-[10px] font-bold hover:bg-white/[0.12] transition-colors';

export const PS_RIBBON_BTN =
    'min-h-[44px] min-w-[44px] w-11 h-11 rounded-md flex items-center justify-center transition-colors duration-150 border border-white/[0.12] bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:border-white/[0.18] hover:text-white active:scale-95 touch-manipulation';

export const PS_TOOLBAR_BTN =
    'inline-flex flex-col items-center justify-center gap-0.5 min-w-[2.5rem] px-1 py-0.5 rounded-md border border-white/[0.08] bg-white/[0.02] text-[#ECE8E2] hover:bg-[#F5C6D0]/[0.06] hover:border-[#F0A8B4]/22 hover:text-[#FFFEF9] active:scale-[0.97] transition-colors touch-manipulation shrink-0';

/** بطاقة محضر الجلسة — مضغوطة */
export const PS_HERO_SESSION =
    'flex w-full min-h-[44px] items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-2.5 text-right transition-colors hover:border-white/[0.16] hover:bg-white/[0.05] active:scale-[0.99] touch-manipulation';

export const PS_HERO_ACTION =
    'flex w-full min-h-[44px] items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-2.5 text-right transition-colors hover:border-white/[0.16] hover:bg-white/[0.05] active:scale-[0.99] touch-manipulation';

export const PS_REQUESTS_ROW =
    'w-full text-right rounded-md border border-white/[0.1] bg-white/[0.03] p-2 transition-colors hover:border-white/[0.16] hover:bg-white/[0.05] group';

export const PS_RAIL_CELL_PRIMARY =
    'flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-1 py-1.5 border-0 bg-transparent text-center transition-colors duration-150 active:scale-[0.98] touch-manipulation min-w-0';

export const PS_RAIL_CELL_SECONDARY =
    'flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-1 py-1.5 border-0 bg-transparent text-white/55 hover:bg-white/[0.05] hover:text-white/85 active:scale-[0.98] transition-colors touch-manipulation min-w-0';

export const PS_RAIL_CELL_FLOW =
    `${PS_RAIL_CELL_PRIMARY} hover:bg-white/[0.05]`;

export function personalPearlHubTheme() {
    return {
        trigger: PS_TILE_INTERACTIVE,
        overlay: `fixed inset-0 ${HUB_DOSSIER_MODAL_Z_CLASS} bg-[#101018]/94 font-['Tajawal'] pointer-events-auto`,
        shell:
            'w-full h-full flex flex-col bg-[#16161F] overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        header:
            'relative px-3 sm:px-4 py-2 border-b border-white/[0.08] bg-[#16161F] flex justify-between items-center shrink-0',
        body: 'flex-1 min-h-0 overflow-y-auto scrollbar-hide px-3 sm:px-4 py-2 space-y-2 max-w-5xl w-full mx-auto',
        field:
            'w-full min-w-0 bg-white/[0.05] border border-white/[0.12] rounded-md px-2.5 py-1.5 text-sm text-[#FFFEF9] outline-none focus:border-white/[0.24] focus:bg-white/[0.07] transition-colors [color-scheme:dark]',
        label: 'text-[10px] font-bold text-[#ECE8E2]/80 mb-0.5 block',
        section: `${PS_PANEL_BEIGE} p-2`,
        btn: 'w-full max-w-5xl mx-auto py-2 rounded-lg bg-white/[0.08] border border-white/[0.14] text-[#FFFEF9] text-sm font-bold transition-colors hover:bg-white/[0.12] disabled:opacity-40 shrink-0',
        accentText: 'text-[#FFFEF9]',
        accentIcon: 'text-[#C9B89A]',
        footerBar: 'px-3 sm:px-4 py-2 border-t border-white/[0.07] shrink-0 bg-[#16161F]',
    };
}

export function personalPearlModalTheme() {
    return {
        overlay: `fixed inset-0 ${HUB_DOSSIER_MODAL_Z_CLASS} flex items-center justify-center bg-[#080c14]/94 p-3 font-['Tajawal'] pointer-events-auto`,
        shell: 'relative overflow-visible motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-150',
        shellCard:
            'relative overflow-hidden w-full rounded-xl border border-white/[0.1] bg-[#16161F] shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
        header:
            'relative px-3 py-2 border-b border-white/[0.08] bg-[#16161F] flex justify-between items-center gap-2',
        headerTitle: 'font-bold flex items-center gap-1.5 text-[12px] text-[#FFFEF9]',
        headerIcon: 'text-[#C9B89A] shrink-0',
        body: 'p-3 space-y-2 max-h-[75vh] overflow-y-auto scrollbar-hide',
        field:
            'w-full bg-white/[0.05] border border-white/[0.12] rounded-md px-2.5 py-2 text-sm text-[#FFFEF9] outline-none focus:border-white/[0.22] focus:bg-white/[0.07] transition-colors [color-scheme:dark]',
        select:
            'w-full bg-[#16161F] border border-white/[0.12] rounded-md px-2.5 py-2 text-sm text-[#FFFEF9] outline-none focus:border-white/[0.22] transition-colors cursor-pointer appearance-none [color-scheme:dark]',
        label: 'block text-[10px] font-bold text-[#ECE8E2]/75 mb-0.5',
        btn: 'w-full bg-[#F5C6D0]/[0.12] border border-[#F0A8B4]/24 text-[#FFFEF9] py-2 rounded-lg font-bold text-sm transition-colors hover:bg-[#F5C6D0]/[0.18] hover:border-[#F0A8B4]/34 disabled:opacity-45 disabled:cursor-not-allowed flex justify-center items-center gap-2',
        btnDisabled: 'disabled:opacity-45 disabled:cursor-not-allowed',
        closeBtn:
            'p-1.5 rounded-md bg-white/[0.05] border border-white/[0.1] text-[#9894A0] hover:text-[#FFFEF9] hover:bg-white/[0.08] transition-colors shrink-0',
        chip: 'px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/[0.1] bg-white/[0.03] text-[#9894A0] hover:text-[#ECE8E2] transition-colors',
        chipActive:
            'px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/[0.18] bg-white/[0.08] text-[#FFFEF9]',
        sectionTitle: 'px-1 pb-1 text-[11px] font-bold text-[#C9B89A]',
        actionRow:
            'flex items-center gap-2 w-full text-right px-2 py-1.5 rounded-md border transition-colors duration-150 group bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.14] min-h-[44px]',
        actionRowDanger:
            'flex items-center gap-2 w-full text-right px-2 py-1.5 rounded-md border transition-colors duration-150 group bg-rose-500/[0.05] border-rose-400/14 hover:bg-rose-500/[0.08] min-h-[44px]',
        actionRowIcon:
            'w-7 h-7 shrink-0 rounded-md flex items-center justify-center border bg-white/[0.04] border-white/[0.08] group-hover:border-white/[0.14] transition-colors',
        actionRowIconDanger:
            'w-7 h-7 shrink-0 rounded-md flex items-center justify-center border bg-rose-500/8 border-rose-400/18 transition-colors',
        sheet: `fixed bottom-0 left-0 right-0 ${HUB_DOSSIER_ACTIONS_MENU_Z_CLASS} flex flex-col max-h-[min(78dvh,32rem)] overflow-hidden rounded-t-xl border-t border-white/[0.1] bg-[#16161F] px-2.5 pt-0.5 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-auto`,
        sheetHandle: 'w-9 h-1 rounded-full bg-white/[0.18]',
        sheetTitle: 'text-[#FFFEF9] font-bold text-sm mb-1.5 text-center flex items-center justify-center gap-1.5',
        accentText: 'text-[#C9B89A]',
        flowHeader:
            'flex h-11 items-center justify-between gap-2 px-2.5 border-b border-white/[0.08] bg-[#16161F]',
        flowClose:
            'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-white/[0.05] text-[#9894A0] hover:text-[#FFFEF9] hover:bg-white/[0.08] touch-manipulation shrink-0',
        flowPopover: PS_FLOW_MENU,
        flowPanel: PS_FLOW_MENU,
        flowBackdrop: `absolute inset-0 bg-[#101018]/58 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150 pointer-events-auto`,
    };
}
