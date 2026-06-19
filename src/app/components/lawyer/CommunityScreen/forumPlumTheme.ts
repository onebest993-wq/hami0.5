import React from 'react';

/** Deep Plum · Grey-Plum Cards · Soft Apricot — tuned for interaction perf (no blur / heavy inset shadows) */
export const FORUM_PLUM_DEEP = '#0E0812';
export const FORUM_PLUM_BASE = '#140A18';
export const FORUM_PLUM_CARD = '#38303E';
export const FORUM_PLUM_ELEVATED = '#221A28';
export const FORUM_APRICOT = '#F0B896';

/** خلفية ثابتة — تدرج واحد (أخف من طبقات radial متعددة) */
export const FORUM_PAGE_BG: React.CSSProperties = {
    background: 'linear-gradient(155deg, #0E0812 0%, #140A18 48%, #1A1020 100%)',
};

export const FORUM_LAYER = 'fixed inset-0 z-[95] h-[100dvh] bg-[#0E0812]';

export const FORUM_FEED_CARD =
    'group rounded-xl p-4 border bg-[#38303E] border-[#4A3D52]/55 text-[#E6E0E4] ' +
    'hover:border-[#F0B896]/28 active:border-[#F0B896]/40 active:bg-[#3A3442] ' +
    'transition-[border-color,background-color] duration-150 relative';

export const FORUM_INTERACT_BTN =
    'flex items-center gap-1 rounded-lg px-2 py-1.5 text-[#9A9098] ' +
    'hover:text-[#F0B896] hover:bg-[#F0B896]/10 active:bg-[#F0B896]/16 active:text-[#F8C4A8] ' +
    'transition-[color,background-color] duration-150';

export const FORUM_INTERACT_ICON = 'text-[#8A8088] group-hover:text-[#F0B896] transition-colors duration-150';
export const FORUM_INTERACT_ICON_ACTIVE = 'text-[#F0B896] fill-[#F0B896]/20';
export const FORUM_INTERACT_LABEL = 'text-[#9A9098] text-sm group-hover:text-[#E6E0E4] transition-colors duration-150';
export const FORUM_INTERACT_LABEL_ACTIVE = 'text-[#F0B896] font-bold text-sm';

export const FORUM_PUBLISH_BTN =
    'bg-[#F0B896] hover:bg-[#F8C4A8] active:bg-[#E8A882] text-[#2A1520] font-bold ' +
    'transition-[background-color,transform] duration-150 active:scale-[0.98]';

export const FORUM_PUBLISH_BTN_DISABLED = 'bg-[#342C3A] text-[#9A9098]/50 cursor-not-allowed';

export const FORUM_PUBLISH_BTN_SM = 'text-[11px] px-3 py-1.5 rounded-full font-bold ' + FORUM_PUBLISH_BTN;

export const FORUM_ACCENT_CHIP =
    'text-[#F0B896]/92 bg-[#F0B896]/10 border border-[#F0B896]/24 ' +
    'hover:bg-[#F0B896]/16 transition-colors duration-150';

export const FORUM_APP_BAR =
    'bg-[#140A18] border-b border-[#4A3D52]/40 sticky top-0 z-10';

export const FORUM_SURFACE_INPUT =
    'bg-[#221A28] text-[#E6E0E4] border border-[#4A3D52]/45 ' +
    'focus:border-[#F0B896]/45 focus:outline-none placeholder:text-[#9A9098]/55 ' +
    'transition-[border-color] duration-150';

export const FORUM_PANEL = 'bg-[#221A28] border border-[#4A3D52]/50 rounded-xl';

export const FORUM_SHEET = 'bg-[#221A28] border-t border-[#4A3D52]/50 rounded-t-[24px]';

export const FORUM_MODAL = 'bg-[#38303E] border border-[#4A3D52]/55 rounded-2xl shadow-lg';

export const FORUM_ICON_BTN =
    'rounded-full bg-[#342C3A] text-[#9A9098] flex items-center justify-center ' +
    'hover:text-[#F0B896] hover:bg-[#3A3040] active:bg-[#403848] ' +
    'transition-[color,background-color] duration-150';

export const FORUM_GHOST_BTN =
    'rounded-xl bg-[#342C3A] border border-[#4A3D52]/50 text-[#B4AEB6] ' +
    'hover:text-[#E6E0E4] hover:border-[#F0B896]/25 transition-[color,border-color,background-color] duration-150';

export const FORUM_COMMENT_CARD =
    'rounded-2xl p-4 border bg-[#38303E] border-[#4A3D52]/50';

export const FORUM_COMMENT_BEST = 'bg-[#38303E] border-[#F0B896]/35';

export const FORUM_STAT_BOX = 'bg-[#342C3A] rounded-lg p-3 text-center border border-[#4A3D52]/40';

export const FORUM_TEXT_PRIMARY = 'text-[#E6E0E4]';
export const FORUM_TEXT_MUTED = 'text-[#9A9098]';
export const FORUM_TEXT_APRICOT = 'text-[#F0B896]';

export const FORUM_ENTRY_BTN =
    'w-full rounded-2xl border border-[#F0B896]/22 bg-[#140A18] px-4 py-4 ' +
    'flex items-center justify-between hover:bg-[#1A1020] hover:border-[#F0B896]/35 ' +
    'transition-[background-color,border-color] duration-150 active:bg-[#1A1020]/90';

export const FORUM_ENTRY_ICON_WRAP =
    'w-10 h-10 rounded-xl flex items-center justify-center border border-[#F0B896]/20 ' +
    'bg-[#F0B896]/8 text-[#F0B896]';

export const FORUM_SECTION_ACTIVE =
    'bg-[#F0B896]/14 border border-[#F0B896]/35 text-[#F0B896]';

export const FORUM_SECTION_IDLE =
    'bg-[#342C3A] border border-[#4A3D52]/45 text-[#9A9098] hover:border-[#F0B896]/20';

export function ForumPlumPage({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return React.createElement(
        'div',
        {
            dir: 'rtl',
            className: `w-full h-full flex flex-col relative overflow-hidden z-0 ${className}`,
            style: FORUM_PAGE_BG,
        },
        children,
    );
}
