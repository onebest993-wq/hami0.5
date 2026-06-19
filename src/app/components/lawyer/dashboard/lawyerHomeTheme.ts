/** Hami Sovereign — design tokens */
export const SOV_GOLD = '#E6C673';
export const SOV_GOLD_DIM = '#B8943F';
export const SOV_PEARL = '#F5F0E6';
export const SOV_COPPER = '#C4782F';
export const SOV_VOID = '#030305';

export const HOME_SCROLL =
    'relative z-[1] flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden gap-6 px-5 sm:px-6 pt-2 pb-56 max-w-[440px] mx-auto w-full scroll-smooth';

export const HOME_GLASS =
    'relative overflow-hidden rounded-[1.625rem] border hami-sovereign-glass hami-sovereign-rim hami-home-themed-border';

export const HOME_NEON_GOLD = SOV_GOLD;
export const HOME_NEON_CYAN = '#A8C4D4';
export const HOME_NEON_ROSE = '#D4A574';

export const HOME_FORUM_CHIP =
    'group relative w-full overflow-hidden rounded-[1.375rem] border hami-sovereign-glass hami-sovereign-rim hami-home-themed-border px-4 py-3.5 flex items-center active:opacity-[0.88] active:scale-[0.985] transition-all duration-300';

export const HOME_NOTE_FIELD =
    'flex items-center gap-2.5 rounded-2xl border border-white/[0.12] bg-black/40 backdrop-blur-xl px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus-within:border-[#E6C673]/35 focus-within:shadow-[0_0_32px_rgba(230,198,115,0.08)] transition-all duration-300';

export const HOME_NOTE_INPUT =
    'flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/28 font-medium min-w-0';

/** @deprecated aliases */
export const HOME_PAGE = HOME_SCROLL;
export const HOME_AMBIENT = 'pointer-events-none absolute inset-0 overflow-hidden';
export const HOME_ALERTS_SHELL = HOME_GLASS;
export const HOME_ALERTS_TITLE = 'text-[#F5F0E6] font-bold text-[13px]';
export const HOME_ALERTS_ICON = 'text-[#E6C673]';
export const HOME_ALERTS_MUTED = 'text-white/38 text-[11px]';
export const HOME_FORUM_BTN = HOME_FORUM_CHIP;
export const HOME_FORUM_ICON = 'w-10 h-10 rounded-xl flex items-center justify-center';
export const HOME_SECTION_LABEL = 'text-[10px] font-bold tracking-[0.2em] uppercase text-white/35';
export const HOME_HUB_TILE = HOME_GLASS;
export const HOME_HUB_EXEC = `${HOME_GLASS} col-span-2`;
export const HOME_DOCK_SHELL = 'relative rounded-[2rem] border hami-sovereign-glass hami-sovereign-rim hami-home-themed-border';
export const HOME_DOCK_ACTION = 'flex flex-col items-center gap-1 min-w-0';
export const HOME_DOCK_BTN = 'relative flex items-center justify-center rounded-2xl';
export const HOME_DOCK_BTN_PRIMARY = HOME_DOCK_BTN;
export const HOME_DOCK_LABEL = 'text-[9px] font-medium text-white/45';
