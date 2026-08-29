import {
    LV_BTN_GOLD,
    LV_INSET,
    LV_INSET_HOVER,
} from '@/app/components/lawyer/lawyerShared/lawsuitVisualLite';

/** Flat lawsuit glass buttons — lighter than bloom/glow stacks. */
export const GLASS_BTN =
    'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border touch-manipulation min-h-[44px]';
export const GLASS_BTN_GOLD = `${GLASS_BTN} ${LV_BTN_GOLD}`;
export const GLASS_BTN_NEUTRAL = `${GLASS_BTN} ${LV_INSET} ${LV_INSET_HOVER} text-white/80 hover:text-white`;
export const GLASS_BTN_INDIGO = `${GLASS_BTN} bg-indigo-500/10 border-indigo-400/25 text-indigo-200 hover:bg-indigo-500/18`;
export const GLASS_BTN_ROSE = `${GLASS_BTN} bg-rose-500/10 border-rose-400/25 text-rose-200 hover:bg-rose-500/18`;
export const GLASS_BTN_EMERALD = `${GLASS_BTN} bg-emerald-500/10 border-emerald-400/25 text-emerald-200 hover:bg-emerald-500/18`;
