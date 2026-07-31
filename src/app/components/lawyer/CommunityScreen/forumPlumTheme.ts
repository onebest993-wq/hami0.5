import React from 'react';
import './forumPlumChrome.css';

/**
 * منتدى الزملاء — Quiet Court × Silk Glass × مسماري عراقي
 * كحلي هادئ + ذهب عتيق + زجاج حريري على كل الأسطح.
 */
export const FORUM_PLUM_DEEP = '#0A0F1C';
export const FORUM_PLUM_BASE = '#0A0F1C';
export const FORUM_PLUM_CARD = 'rgba(22,30,44,0.45)';
export const FORUM_PLUM_ELEVATED = 'rgba(18,24,38,0.55)';
export const FORUM_APRICOT = '#C9A86C';
export const FORUM_MARBLE_VEIN = '#9AA3B2';
export const FORUM_MARBLE_WHITE = '#F3F0EA';
export const FORUM_COPPER = '#B8956A';

export const FORUM_PAGE_BG: React.CSSProperties = {
    backgroundColor: '#0A0F1C',
};

export const FORUM_LAYER =
    'fixed inset-0 z-[95] h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]';

export const FORUM_FEED_CARD =
    'hami-forum-feed-card group relative min-h-[160px] rounded-[1.25rem] p-4 ' +
    'will-change-transform transition-[opacity,transform,border-color,background-color,box-shadow] duration-300 ease-out';

export const FORUM_FEED_CARD_PENDING = 'hami-forum-feed-card--pending';
export const FORUM_FEED_CARD_READY = 'hami-forum-feed-card--ready';
export const FORUM_FEED_CARD_READY_REDUCED = 'hami-forum-feed-card--ready transition-none';

export const FORUM_INTERACT_BTN =
    'flex items-center gap-1 rounded-xl px-3 py-2.5 min-h-[44px] touch-manipulation text-[#9AA3B2] ' +
    'hover:text-[#F3F0EA] hover:bg-white/[0.06] active:bg-[#C9A86C]/12 active:text-[#C9A86C] ' +
    'transition-[color,background-color] duration-150';

export const FORUM_INTERACT_ICON = 'text-[#9AA3B2] group-hover:text-[#F3F0EA] transition-colors duration-150';
export const FORUM_INTERACT_ICON_ACTIVE = 'text-[#C9A86C] fill-[#C9A86C]/25';
export const FORUM_INTERACT_LABEL = 'text-[#9AA3B2] text-sm group-hover:text-[#F3F0EA] transition-colors duration-150';
export const FORUM_INTERACT_LABEL_ACTIVE = 'text-[#C9A86C] font-bold text-sm';

export const FORUM_PUBLISH_BTN =
    'hami-forum-cuneiform-btn hami-forum-cuneiform-btn--solid ' +
    'bg-[#C9A86C]/95 hover:bg-[#D4B57C] active:bg-[#B8975C] text-[#1A150C] font-bold ' +
    'transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.97] ' +
    'shadow-lg shadow-black/30 backdrop-blur-sm border border-white/15';

export const FORUM_PUBLISH_BTN_DISABLED =
    'hami-forum-ghost-btn text-[#9AA3B2]/40 cursor-not-allowed opacity-60';

export const FORUM_PUBLISH_BTN_SM = 'text-[11px] px-3 py-1.5 rounded-full font-bold ' + FORUM_PUBLISH_BTN;

/** أنماط زر النشر — التموضع عبر forum-publish-fab-slot في CommunityScreenBody */
export const FORUM_FAB =
    'hami-forum-cuneiform-btn hami-forum-cuneiform-btn--solid ' +
    'flex w-auto max-w-max shrink-0 items-center gap-2 rounded-xl touch-manipulation pointer-events-auto ' +
    'px-5 py-3.5 min-h-[48px] text-sm font-bold ' +
    'bg-[#C9A86C]/95 text-[#1A150C] border border-white/15 ' +
    'active:scale-[0.97] shadow-lg shadow-black/35 backdrop-blur-md ' +
    'transition-[background-color,transform] duration-150';

export const FORUM_PUBLISH_FAB =
    'hami-forum-publish-fab hami-forum-cuneiform-btn hami-forum-cuneiform-btn--solid ' +
    'pointer-events-auto touch-manipulation ' +
    'inline-flex w-auto max-w-max shrink-0 items-center gap-2 rounded-xl ' +
    'text-[#1A150C] px-5 py-3.5 min-h-[48px] font-bold transition-transform active:scale-[0.97]';

export const FORUM_PUBLISH_FAB_ICON =
    'relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1A150C]/12 text-[#1A150C]';

export const FORUM_PUBLISH_FAB_LABEL = 'relative z-[1] text-sm font-bold text-[#1A150C] tracking-wide';

export const FORUM_PUBLISH_FAB_DISABLED =
    'hami-forum-publish-fab pointer-events-none touch-manipulation opacity-45 ' +
    'inline-flex w-auto max-w-max shrink-0 items-center gap-2 rounded-xl hami-forum-ghost-btn text-[#9AA3B2] ' +
    'px-5 py-3.5 min-h-[48px]';

/** حاوية ثابتة لزر النشر داخل طبقة المنتدى (أسفل يمين في RTL) */
export const FORUM_PUBLISH_FAB_SLOT =
    'pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-start ' +
    'px-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))]';

export const FORUM_ACCENT_CHIP =
    'hami-forum-accent-chip hover:bg-[#C9A86C]/14 transition-colors duration-150';

export const FORUM_APP_BAR = 'hami-forum-app-bar sticky top-0 z-10';

export const FORUM_SURFACE_INPUT =
    'hami-forum-input text-[#F3F0EA] ' +
    'focus:outline-none placeholder:text-[#9AA3B2]/70 ' +
    'transition-[border-color] duration-150';

export const FORUM_FIELD_LABEL =
    'block text-xs font-bold text-[#9AA3B2] mb-1.5 text-right';

/** شريط معلومات زجاجي (عدد النتائج / الترتيب) */
export const FORUM_META_BAR =
    'hami-forum-glass-chip rounded-xl px-3 py-2.5 flex items-center gap-3 min-h-[36px]';

/** صف خيار في ورقة النشر — زجاجي موحّد */
export const FORUM_OPTION_ROW =
    'w-full rounded-2xl px-4 py-3 flex items-center gap-3 border transition-colors hami-forum-glass-chip';

export const FORUM_OPTION_ROW_ACTIVE =
    'border-[#C9A86C]/35 bg-[#C9A86C]/10 text-[#F3F0EA]';

export const FORUM_OPTION_ROW_URGENT_ACTIVE =
    'border-amber-400/35 bg-amber-500/10 text-[#F3F0EA]';

export const FORUM_OPTION_ROW_IDLE =
    'border-white/10 text-[#9AA3B2] hover:border-white/15 hover:text-[#F3F0EA]';

export const FORUM_PANEL = 'hami-forum-panel rounded-2xl';

export const FORUM_SHEET =
    'hami-forum-panel border-t border-white/[0.12] rounded-t-[28px] hami-forum-app-bar';

export const FORUM_MODAL = 'hami-forum-modal-glass rounded-3xl';

export const FORUM_ICON_BTN =
    'min-h-[44px] min-w-[44px] w-11 h-11 touch-manipulation rounded-full border-0 bg-transparent text-[#9AA3B2] flex items-center justify-center ' +
    'hover:text-[#C9A86C] hover:bg-[#C9A86C]/10 active:bg-[#C9A86C]/14 ' +
    'transition-[color,background-color] duration-150 shadow-none outline-none';

export const FORUM_APP_BAR_ICON =
    'hami-forum-glass-chip min-h-[44px] min-w-[44px] w-11 h-11 touch-manipulation rounded-full flex items-center justify-center transition-colors';

export const FORUM_GHOST_BTN =
    'hami-forum-ghost-btn rounded-xl ' +
    'transition-[color,border-color,background-color] duration-150';

export const FORUM_COMMENT_CARD = 'hami-forum-panel rounded-2xl p-4';
export const FORUM_COMMENT_BEST = 'hami-forum-panel border-[#C9A86C]/35';
export const FORUM_STAT_BOX = 'hami-forum-panel rounded-xl p-3 text-center';

export const FORUM_TEXT_PRIMARY = 'text-[#F3F0EA]';
export const FORUM_TEXT_MUTED = 'text-[#9AA3B2]';
export const FORUM_TEXT_APRICOT = 'text-[#C9A86C]';

export const FORUM_SECTION_ACTIVE = 'hami-forum-section-active';
export const FORUM_SECTION_IDLE = 'hami-forum-section-idle';

export const FORUM_DROPDOWN_PANEL =
    'hami-forum-panel rounded-2xl shadow-2xl shadow-black/50 overflow-hidden';

export const FORUM_FILTER_CHIP_SELECTED =
    'bg-[#C9A86C]/14 hami-forum-accent-chip text-[#F3F0EA]';

export const FORUM_FILTER_CHIP_IDLE = 'hami-forum-ghost-btn text-[#9AA3B2]';

export const FORUM_FILTER_CHIP_ICON_SELECTED = 'bg-[#C9A86C]/18';
export const FORUM_FILTER_CHIP_ICON_IDLE = 'hami-forum-glass-chip';
export const FORUM_FILTER_SECTION_LABEL = 'text-[#9AA3B2] text-[10px] font-bold tracking-wide';

export const FORUM_REPO_SEARCH_BAR =
    'hami-forum-search-bar flex items-center h-11 w-full rounded-xl overflow-hidden ' +
    'transition-all duration-200';

export const FORUM_SEARCH_FILTER_BTN =
    'relative h-11 min-w-[44px] px-3 flex items-center justify-center shrink-0 transition-colors touch-manipulation ' +
    'text-[#9AA3B2] hover:text-[#C9A86C] hover:bg-[#C9A86C]/10';

export const FORUM_SEARCH_FILTER_BTN_ACTIVE =
    'relative h-11 min-w-[44px] px-3 flex items-center justify-center shrink-0 transition-colors touch-manipulation ' +
    'text-[#C9A86C] bg-[#C9A86C]/12';

export const FORUM_EMPTY_CTA =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl ' +
    'bg-[#C9A86C]/95 text-[#1A150C] text-sm font-bold touch-manipulation ' +
    'shadow-lg shadow-black/25 active:scale-[0.97] transition-transform backdrop-blur-sm';

export const FORUM_SEARCH_SHELL = 'hami-forum-silk-root flex flex-col isolate';

export const FORUM_SEARCH_HEADER =
    'hami-forum-search-chrome px-4 py-3 flex items-center gap-3 shrink-0';

export const FORUM_SEARCH_FILTERS =
    'hami-forum-search-chrome px-4 py-3 space-y-3 shrink-0';

export function ForumPlumPage({
    children,
    className = '',
    'data-testid': dataTestId = 'forum-screen',
}: {
    children: React.ReactNode;
    className?: string;
    'data-testid'?: string;
}) {
    return React.createElement(
        'div',
        {
            dir: 'rtl',
            'data-testid': dataTestId,
            'data-forum-silk': '1',
            className: `hami-forum-silk-root w-full h-full flex flex-col relative overflow-hidden z-0 ${className}`,
            style: FORUM_PAGE_BG,
        },
        children,
    );
}
