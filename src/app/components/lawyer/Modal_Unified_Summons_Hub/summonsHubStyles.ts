/** أنماط زجاجية لمركز التبليغ — مستخرجة دون تغيير بصري */
/* ————— نظام زجاجي موحّد لمركز التبليغ — Deep Navy + توهجات ————— */
const HUB_BTN_BASE =
    'w-full rounded-2xl flex flex-row-reverse items-center justify-center gap-2 transition-all duration-200 active:scale-[0.985] backdrop-blur-xl';
export const HUB_BTN_EMERALD = `${HUB_BTN_BASE} py-3 text-[13px] font-black border border-emerald-400/30 bg-gradient-to-br from-emerald-500/25 via-emerald-600/15 to-teal-600/10 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_30px_rgba(16,185,129,0.16)] hover:border-emerald-300/45 hover:from-emerald-500/35 hover:to-teal-600/20`;
export const HUB_BTN_VIOLET = `${HUB_BTN_BASE} py-3 text-[13px] font-black border border-violet-400/30 bg-gradient-to-br from-violet-500/25 via-violet-600/15 to-fuchsia-600/10 text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_30px_rgba(139,92,246,0.16)] hover:border-violet-300/45 hover:from-violet-500/35 hover:to-fuchsia-600/20`;
export const HUB_BTN_AMBER = `${HUB_BTN_BASE} py-3 text-[13px] font-black border border-amber-400/30 bg-gradient-to-br from-amber-500/25 via-amber-600/15 to-orange-600/10 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_30px_rgba(245,158,11,0.14)] hover:border-amber-300/45 hover:from-amber-500/35 hover:to-orange-600/20`;
export const HUB_BTN_ROSE = `${HUB_BTN_BASE} py-3 text-[13px] font-black border border-rose-400/30 bg-gradient-to-br from-rose-500/25 via-rose-600/15 to-red-600/10 text-rose-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_30px_rgba(244,63,94,0.14)] hover:border-rose-300/45 hover:from-rose-500/35 hover:to-red-600/20`;
export const HUB_BTN_GHOST = `${HUB_BTN_BASE} py-2.5 text-[12px] font-bold border border-white/10 bg-white/[0.04] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.08] hover:border-white/20`;
export const HUB_BTN_GHOST_ROSE = `${HUB_BTN_BASE} py-2.5 text-[12px] font-bold border border-rose-400/25 bg-rose-500/[0.07] text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-rose-500/[0.13] hover:border-rose-300/35`;
export const HUB_BTN_GHOST_EMERALD = `${HUB_BTN_BASE} py-2.5 text-[12px] font-bold border border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-emerald-500/[0.14] hover:border-emerald-300/40`;
export const HUB_GLASS_INFO_CYAN =
    'rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/[0.10] via-[#0A0F1C]/50 to-transparent p-3.5 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-xl';
export const HUB_GLASS_INPUT =
    'w-full rounded-xl border border-white/10 bg-[#0A0F1C]/60 px-4 py-2.5 text-right text-sm text-white backdrop-blur-md transition-colors focus:outline-none focus:border-[#E6C673]/45 focus:ring-1 focus:ring-[#E6C673]/25 placeholder:text-slate-500';

/** قشرة مركز التبليغ — التصميم العام للتنفيذ (ذهبي + Navy) */
export const HUB_SHELL_CLASS =
    'bg-[#0B1021] border border-[#E6C673]/30 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col shadow-2xl';

export const HUB_HEADER_CLASS =
    'border-b border-white/10 bg-[#0B1021]/95 p-4 flex justify-between items-center';

export const HUB_TITLE_CLASS =
    'text-[#E6C673] font-bold text-lg flex items-center gap-2 flex-row-reverse';

export const HUB_SECTION_CARD_CLASS =
    'rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/20 backdrop-blur-xl';

export const HUB_SELECT_CLASS =
    'w-full rounded-xl border border-white/10 bg-[#0A0F1C]/80 px-4 py-2.5 text-right text-sm text-white focus:border-[#E6C673]/40 focus:outline-none focus:ring-1 focus:ring-[#E6C673]/20';

export const HUB_GOLD_ACTION_CLASS =
    'w-full rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/10 py-3 text-[12px] font-black text-[#F5F0E6] hover:bg-[#E6C673]/16 hover:border-[#E6C673]/45 transition-colors';
