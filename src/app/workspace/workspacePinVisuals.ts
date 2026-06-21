import type { WorkspacePinType } from './types';

export type WorkspacePinVisual = {
    /** شكل حاوية التثبيت */
    shell: string;
    /** شكل الزر */
    button: string;
    /** شكل شارة القسم في القائمة */
    chip: string;
    /** لون النص/الأيقونة */
    accent: string;
    /** اختصار القسم */
    shortLabel: string;
};

/** تمييز بصري لكل نوع تثبيت — أشكال وألوان مختلفة */
export const WORKSPACE_PIN_VISUAL: Record<WorkspacePinType, WorkspacePinVisual> = {
    hub: {
        shell: 'rounded-xl',
        button: 'rounded-lg border-white/10',
        chip: 'rounded-md bg-white/8 border-white/12 text-white/55',
        accent: 'text-white/55',
        shortLabel: 'اخت',
    },
    lawsuit: {
        shell: 'rounded-xl border-l-2 border-l-[#E6C673]/70',
        button: 'rounded-lg border-[#E6C673]/35 bg-[#E6C673]/10',
        chip: 'rounded-md bg-[#E6C673]/12 border border-[#E6C673]/35 text-[#E6C673]',
        accent: 'text-[#E6C673]',
        shortLabel: 'مد',
    },
    criminal: {
        shell: 'rounded-lg border-l-2 border-l-rose-400/75',
        button: 'rounded-md border-rose-400/35 bg-rose-500/12',
        chip: 'rounded-sm bg-rose-500/12 border border-rose-400/35 text-rose-300',
        accent: 'text-rose-300',
        shortLabel: 'جز',
    },
    execution: {
        shell: 'rounded-2xl border-l-2 border-l-slate-300/60',
        button: 'rounded-xl border-slate-400/30 bg-slate-500/12',
        chip: 'rounded-full bg-slate-500/15 border border-slate-400/30 text-slate-200',
        accent: 'text-slate-200',
        shortLabel: 'تن',
    },
    transaction: {
        shell: 'rounded-xl border-l-2 border-l-violet-400/65',
        button: 'rounded-lg border-violet-400/35 bg-violet-500/12',
        chip: 'rounded-md bg-violet-500/12 border border-violet-400/35 text-violet-200',
        accent: 'text-violet-200',
        shortLabel: 'مل',
    },
    threading: {
        shell: 'rounded-sm border-l-2 border-l-[#C4782F]/75',
        button: 'rounded-sm border-[#C4782F]/40 bg-[#C4782F]/12',
        chip: 'rounded-[3px] bg-[#C4782F]/12 border border-[#C4782F]/40 text-[#D49248]',
        accent: 'text-[#D49248]',
        shortLabel: 'إد',
    },
    urgent: {
        shell: 'rounded-xl border-l-2 border-l-orange-400/75',
        button: 'rounded-lg border-orange-400/35 bg-orange-500/12',
        chip: 'rounded-md bg-orange-500/12 border border-orange-400/35 text-orange-200',
        accent: 'text-orange-200',
        shortLabel: 'ع',
    },
    notepad: {
        shell: 'rounded-2xl border-l-2 border-l-sky-400/60',
        button: 'rounded-full border-sky-400/30 bg-sky-500/10',
        chip: 'rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-200',
        accent: 'text-sky-200',
        shortLabel: 'م',
    },
    task: {
        shell: 'rounded-lg border-l-2 border-l-emerald-400/70',
        button: 'rounded-md border-emerald-400/35 bg-emerald-500/12',
        chip: 'rounded-sm bg-emerald-500/12 border border-emerald-400/35 text-emerald-200',
        accent: 'text-emerald-200',
        shortLabel: 'مي',
    },
};

export function workspacePinVisual(type: WorkspacePinType): WorkspacePinVisual {
    return WORKSPACE_PIN_VISUAL[type] ?? WORKSPACE_PIN_VISUAL.hub;
}
