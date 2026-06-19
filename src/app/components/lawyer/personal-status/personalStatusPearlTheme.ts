/**
 * Luminous Pearl — إضبارة الأحوال الشخصية
 * لؤلؤي مضيء #FFFEF9 · فضي لؤلؤي #ECE8E2 · صدفي للّمسات فقط #C9B89A
 */
export const PS_PEARL = {
    ink: '#101018',
    surface: '#16161F',
    /** لؤلؤي مضيء */
    luminous: '#FFFEF9',
    pearl: '#F8F6F0',
    pearlSoft: '#ECE8E2',
    pearlDim: '#D4CFC8',
    /** صدفي — لمسات صغيرة فقط (عناوين/أيقونات) */
    sand: '#C9B89A',
    sandLight: '#D9CCB8',
    muted: '#9894A0',
    charcoal: '#2A2830',
    /** زجاج وردي — لمسات لامعة */
    rose: '#F0A8B4',
    roseSoft: '#E8B4C0',
    roseGlass: '#F5C6D0',
    roseBloom: '#FFD4DC',
} as const;

/** ظل زجاجي بارد — بدون بني/قهوة */
export const PS_GLASS_SHADOW =
    'shadow-[0_10px_36px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.08)]';

export const PS_GLASS_SHADOW_SM =
    'shadow-[0_6px_24px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.06)]';

/** ظل زجاج وردي — توهج لامع */
export const PS_ROSE_GLASS_SHADOW =
    'shadow-[0_8px_28px_rgba(240,168,180,0.14),0_4px_16px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,220,228,0.30)]';

export const PS_ROSE_GLASS_SHADOW_SM =
    'shadow-[0_6px_22px_rgba(240,168,180,0.12),0_3px_12px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,220,228,0.26)]';

export const PS_PAGE = 'relative min-h-full bg-[#101018]';

/** زجاج لؤلؤي — أبيض/فضي وليس بيج/قهوة */
export const PS_PANEL =
    `relative overflow-hidden rounded-xl border border-white/[0.12] bg-gradient-to-br from-white/[0.07] via-[#F8F6F0]/[0.04] to-[#ECE8E2]/[0.03] backdrop-blur-md ${PS_GLASS_SHADOW}`;

export const PS_PANEL_BEIGE =
    `relative overflow-hidden rounded-xl border border-white/[0.14] bg-gradient-to-br from-white/[0.08] to-[#F8F6F0]/[0.05] backdrop-blur-md ${PS_GLASS_SHADOW_SM}`;

export const PS_PANEL_ROSE =
    `relative overflow-hidden rounded-xl border border-[#F0A8B4]/20 bg-gradient-to-br from-[#FFD4DC]/[0.10] via-white/[0.05] to-[#ECE8E2]/[0.04] backdrop-blur-md ${PS_GLASS_SHADOW_SM}`;

/** زجاج وردي لامع — للحاويات العمودية والأقسام المميزة */
export const PS_PANEL_ROSE_GLASS =
    `relative overflow-hidden rounded-xl border border-[#F0A8B4]/20 bg-gradient-to-br from-[#F5C6D0]/[0.10] via-[#FFD4DC]/[0.05] to-white/[0.03] backdrop-blur-md ${PS_ROSE_GLASS_SHADOW_SM}`;

export const PS_PANEL_ELEPHANT = PS_PANEL_ROSE_GLASS;

export const PS_PEARL_GLASS = PS_PANEL;

export const PS_PEARL_GLASS_STRONG =
    'bg-white/[0.10] backdrop-blur-md border border-white/[0.18]';

export const PS_BEIGE_INSET = PS_PANEL_BEIGE;

export const PS_ELEPHANT_PANEL = PS_PANEL_ROSE_GLASS;

export const PS_SECTION_HEAD_ROSE =
    'flex items-center justify-between gap-2 px-2 py-1.5 border-b border-[#F0A8B4]/18';

export const PS_SECTION_LABEL_ROSE =
    'text-[9px] font-black tracking-[0.14em] text-[#FFD4DC]/90 uppercase';

export const PS_TEXT_PEARL = 'text-[#FFFEF9]';
export const PS_TEXT_MUTED = 'text-[#9894A0]';
export const PS_TEXT_BEIGE = 'text-[#ECE8E2]';
export const PS_TEXT_SAND = 'text-[#C9B89A]';
export const PS_TEXT_ON_PEARL = 'text-[#2A2830]';

export const PS_SECTION_HEAD =
    'flex items-center justify-between gap-2 px-2 py-1.5 border-b border-white/[0.10]';

export const PS_SECTION_LABEL =
    'text-[9px] font-black tracking-[0.14em] text-[#ECE8E2]/90 uppercase';

export const PS_SECTION_BODY = 'p-2 min-h-0';

export const PS_DOCK_BTN =
    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border border-white/[0.16] bg-white/[0.07] text-[#ECE8E2] hover:bg-white/[0.12] hover:border-white/[0.24] hover:text-[#FFFEF9] active:scale-95 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-sm';

/** أزرار داخل الشريط العمودي — زجاج وردي */
export const PS_DOCK_BTN_ROSE =
    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border border-[#F0A8B4]/30 bg-gradient-to-br from-[#F5C6D0]/[0.18] to-[#E8B4BC]/[0.08] text-[#FFE8EC] hover:from-[#F5C6D0]/[0.26] hover:to-[#FFD4DC]/[0.12] hover:border-[#F0A8B4]/42 hover:text-white active:scale-95 shadow-[inset_0_1px_0_rgba(255,220,228,0.34),0_4px_14px_rgba(240,168,180,0.14)] backdrop-blur-sm';

export const PS_TILE_INTERACTIVE =
    `${PS_PANEL} transition-all duration-200 hover:border-white/[0.22] hover:from-white/[0.14] active:scale-[0.99]`;

export const PS_BTN_PEARL =
    'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.10] border border-white/[0.18] text-[#FFFEF9] text-[10px] font-bold hover:bg-white/[0.14] transition-colors';

export const PS_EMPTY_LINE = 'text-[10px] text-[#9894A0] py-1 leading-snug';

export function personalPearlHubTheme() {
    return {
        trigger: PS_TILE_INTERACTIVE,
        overlay: "fixed inset-0 z-[150] bg-[#101018]/92 backdrop-blur-md font-['Tajawal']",
        shell:
            'w-full h-full flex flex-col bg-gradient-to-b from-[#1A1A24] via-[#16161F] to-[#101018] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        header:
            'relative px-4 sm:px-6 py-2.5 border-b border-white/[0.10] bg-gradient-to-l from-white/[0.06] to-transparent flex justify-between items-center shrink-0',
        body: 'flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 sm:px-6 py-3 space-y-2.5 max-w-5xl w-full mx-auto',
        field:
            'w-full min-w-0 bg-white/[0.06] border border-white/[0.14] rounded-lg px-3 py-2 text-sm text-[#FFFEF9] outline-none focus:border-white/[0.28] focus:bg-white/[0.09] transition-all [color-scheme:dark]',
        label: 'text-[10px] font-bold text-[#ECE8E2]/85 mb-1 block',
        section: `${PS_PANEL_BEIGE} p-3`,
        btn: 'w-full max-w-5xl mx-auto py-2.5 rounded-xl bg-white/[0.10] border border-white/[0.18] text-[#FFFEF9] text-sm font-bold transition-all hover:bg-white/[0.14] disabled:opacity-40 shrink-0',
        accentText: 'text-[#FFFEF9]',
        accentIcon: 'text-[#C9B89A]',
        footerBar: 'px-4 sm:px-6 py-2.5 border-t border-white/[0.08] shrink-0 bg-[#16161F]/95',
    };
}

export function personalPearlModalTheme() {
    return {
        overlay:
            "fixed inset-0 z-[160] flex items-center justify-center bg-[#101018]/88 backdrop-blur-md p-4 font-['Tajawal']",
        shell: 'relative overflow-visible animate-in zoom-in-95 duration-200',
        shellCard:
            'relative overflow-hidden w-full rounded-2xl border border-white/[0.14] bg-gradient-to-br from-white/[0.11] via-[#F8F6F0]/[0.06] to-[#ECE8E2]/[0.04] backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.14)]',
        header:
            'relative px-4 py-3 border-b border-white/[0.10] bg-gradient-to-l from-white/[0.05] to-transparent flex justify-between items-center gap-2',
        headerTitle: 'font-bold flex items-center gap-2 text-[13px] text-[#FFFEF9]',
        headerIcon: 'text-[#C9B89A] shrink-0',
        body: 'p-4 space-y-3 max-h-[75vh] overflow-y-auto scrollbar-hide',
        field:
            'w-full bg-white/[0.06] border border-white/[0.14] rounded-lg px-3 py-2.5 text-sm text-[#FFFEF9] outline-none focus:border-white/[0.26] focus:bg-white/[0.09] transition-all [color-scheme:dark]',
        select:
            'w-full bg-[#16161F]/90 border border-white/[0.14] rounded-lg px-3 py-2.5 text-sm text-[#FFFEF9] outline-none focus:border-white/[0.26] transition-all cursor-pointer appearance-none [color-scheme:dark]',
        label: 'block text-[10px] font-bold text-[#ECE8E2]/80 mb-1',
        btn: 'w-full bg-gradient-to-br from-[#F5C6D0]/[0.18] to-[#E8B4BC]/[0.10] border border-[#F0A8B4]/30 text-[#FFFEF9] py-2.5 rounded-xl font-bold text-sm transition-all hover:from-[#F5C6D0]/[0.26] hover:border-[#F0A8B4]/42 shadow-[inset_0_1px_0_rgba(255,220,228,0.28),0_4px_16px_rgba(240,168,180,0.12)] disabled:opacity-45 disabled:cursor-not-allowed flex justify-center items-center gap-2 backdrop-blur-sm',
        btnDisabled: 'disabled:opacity-45 disabled:cursor-not-allowed',
        closeBtn:
            'p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-[#9894A0] hover:text-[#FFFEF9] hover:bg-white/[0.10] transition-colors shrink-0',
        chip: 'px-2.5 py-1 rounded-full text-[10px] font-bold border border-white/[0.12] bg-white/[0.04] text-[#9894A0] hover:text-[#ECE8E2] transition-all',
        chipActive:
            'px-2.5 py-1 rounded-full text-[10px] font-bold border border-white/[0.22] bg-white/[0.10] text-[#FFFEF9]',
        sectionTitle: 'px-1 pb-1.5 text-[9px] font-black tracking-[0.12em] text-[#ECE8E2]/90 uppercase',
        actionRow:
            'flex items-center gap-2.5 w-full text-right px-2.5 py-2 rounded-lg border transition-all duration-200 group active:scale-[0.99] bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] hover:border-white/[0.18]',
        actionRowDanger:
            'flex items-center gap-2.5 w-full text-right px-2.5 py-2 rounded-lg border transition-all duration-200 group active:scale-[0.99] bg-rose-500/[0.06] border-rose-400/18 hover:bg-rose-500/[0.10]',
        actionRowIcon:
            'w-7 h-7 shrink-0 rounded-md flex items-center justify-center border bg-white/[0.05] border-white/[0.10] group-hover:border-white/[0.18] transition-colors',
        actionRowIconDanger:
            'w-7 h-7 shrink-0 rounded-md flex items-center justify-center border bg-rose-500/10 border-rose-400/22 transition-colors',
        sheet:
            'fixed bottom-0 left-0 right-0 z-[101] max-h-[78vh] overflow-y-auto scrollbar-hide rounded-t-[1.35rem] border-t border-white/[0.12] bg-gradient-to-b from-white/[0.07] to-[#16161F]/96 backdrop-blur-2xl shadow-[0_-16px_48px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.10)] px-3 pt-2.5 pb-8',
        sheetHandle: 'w-8 h-0.5 rounded-full bg-white/[0.22] mx-auto mb-3',
        sheetTitle: 'text-[#FFFEF9] font-bold text-sm mb-3 text-center flex items-center justify-center gap-2',
        accentText: 'text-[#C9B89A]',
        flowPanel:
            'fixed top-[72px] left-1/2 -translate-x-1/2 w-[92vw] max-w-[320px] z-[9999] font-[\'Tajawal\'] animate-in zoom-in-95 fade-in duration-200 rounded-xl border border-white/[0.14] bg-gradient-to-br from-white/[0.10] to-[#F8F6F0]/[0.05] backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.38)] overflow-hidden',
        flowBackdrop: 'fixed inset-0 z-[9998] bg-[#101018]/55 backdrop-blur-[2px] animate-in fade-in duration-200',
    };
}
