export type DecisionCardEnforcementVisual =
    | 'enforced'
    | 'paused'
    | 'not_enforced'
    | 'lifecycle_reset'
    | 'pending'
    | 'withdrawn'
    | 'neutral';

/** زجاج سائل هادئ — أساس البطاقة */
export const DECISION_CARD_GLASS_SHELL =
    'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C1220]/90 p-3 text-right shadow-[0_6px_18px_rgba(0,0,0,0.2)] transition-colors duration-200 hover:border-white/[0.12]';

const CARD_ACCENT: Record<DecisionCardEnforcementVisual, string> = {
    enforced:
        "before:absolute before:inset-y-2 before:right-0 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-emerald-200/70 before:to-emerald-500/30 before:content-['']",
    paused:
        "before:absolute before:inset-y-2 before:right-0 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-amber-200/70 before:to-amber-500/30 before:content-['']",
    lifecycle_reset:
        "before:absolute before:inset-y-2 before:right-0 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-violet-200/70 before:to-violet-500/30 before:content-['']",
    not_enforced:
        "before:absolute before:inset-y-2 before:right-0 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-rose-200/60 before:to-rose-500/25 before:content-['']",
    pending:
        "before:absolute before:inset-y-2 before:right-0 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-yellow-200/60 before:to-yellow-500/25 before:content-['']",
    withdrawn:
        "before:absolute before:inset-y-2 before:right-0 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-slate-300/40 before:to-slate-500/20 before:content-['']",
    neutral:
        "before:absolute before:inset-y-2 before:right-0 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-white/12 before:to-white/[0.04] before:content-['']",
};

export function decisionCardGlassClasses(visual: DecisionCardEnforcementVisual): string {
    return `flex h-full min-h-0 flex-col justify-between gap-2 ${DECISION_CARD_GLASS_SHELL} ${CARD_ACCENT[visual]}`;
}
