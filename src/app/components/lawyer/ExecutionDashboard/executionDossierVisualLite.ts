/** الإضبارة التنفيذية — سطح مسطّح خفيف؛ بلاطات صفّ 44px بلا عمود 92px. */

/** شبكة هيدر الهاتف: عمودا الأيقونات ≥ 44px لتفادي تداخل الاستشارة/السلة. */
export const EXECUTION_DOSSIER_PHONE_HEADER_GRID =
    'grid w-full grid-cols-[4.75rem_minmax(0,1fr)_2.75rem_2.75rem] items-center gap-2 px-2 py-1.5';

export const EXECUTION_DOSSIER_PHONE_HEADER_SHELL =
    'mx-2 mt-1 rounded-lg border border-white/[0.06] bg-[#0B1120]';

export const EXECUTION_DOSSIER_HEADER_ICON_BTN =
    'inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border transition-colors touch-manipulation';

export const EXECUTION_DOSSIER_CONSULT_BTN =
    `${EXECUTION_DOSSIER_HEADER_ICON_BTN} justify-self-center border-[#E6C673]/22 bg-[#E6C673]/[0.06] px-0 text-[#E6C673] hover:bg-[#E6C673]/[0.12]`;

export const EXECUTION_DOSSIER_TRASH_BTN =
    `${EXECUTION_DOSSIER_HEADER_ICON_BTN} relative justify-self-end border-white/[0.06] bg-transparent text-slate-400 hover:border-amber-500/25 hover:bg-amber-500/[0.06] hover:text-amber-200/90`;

export const EXECUTION_DOSSIER_SUMMARY_TOGGLE =
    'relative w-full overflow-hidden bg-transparent border border-amber-500/22 px-2.5 py-1.5 touch-manipulation';

export const EXECUTION_DOSSIER_SUMMARY_EXPANDED =
    'overflow-hidden bg-transparent border border-t-0 border-amber-500/22 rounded-b-lg -mt-px';

export const EXECUTION_DOSSIER_ACTION_GRID_SHELL =
    'relative mx-3 mt-2 overflow-visible rounded-lg border border-white/[0.06] bg-transparent p-1.5';

export const EXECUTION_DOSSIER_TIMELINE_SHELL =
    'mx-3 mt-2 rounded-lg border border-white/[0.06] bg-transparent p-0.5';

export const EXECUTION_PARTY_FRAME_BASE =
    'relative isolate w-full overflow-visible rounded-lg border bg-transparent text-right transition-[border-color] duration-150';

export const EXECUTION_ACTION_TILE_CLASS =
    'group relative flex min-h-[44px] w-full items-center justify-start gap-2 overflow-hidden rounded-lg border px-2.5 text-right transition-colors duration-150 focus:outline-none focus-visible:ring-2 touch-manipulation';

export const EXECUTION_ACTION_TILE_ICON_WRAP =
    'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-transparent';

export const EXECUTION_ACTION_LAW_ROW_CLASS =
    'group relative flex min-h-[44px] w-full items-center justify-center gap-2 overflow-hidden rounded-lg border border-[#E6C673]/18 bg-[#E6C673]/[0.05] px-3 text-center transition-colors duration-150 hover:border-[#E6C673]/32 hover:bg-[#E6C673]/[0.09] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/25 touch-manipulation';

/** نغمات بلاطات الأدوات — هوية لونية أخف. */
export const EXECUTION_ACTION_TILE_TONES = {
    appt: {
        tone: 'border-violet-400/14 bg-violet-500/[0.04] hover:border-violet-300/28 hover:bg-violet-500/[0.08] focus-visible:ring-violet-400/25',
        iconWrapClass: 'group-hover:border-violet-300/25 group-hover:bg-violet-500/[0.08]',
        iconClass: 'text-violet-200/90',
    },
    notes: {
        tone: 'border-orange-400/14 bg-orange-500/[0.04] hover:border-orange-300/28 hover:bg-orange-500/[0.08] focus-visible:ring-orange-400/25',
        iconWrapClass: 'group-hover:border-orange-300/25 group-hover:bg-orange-500/[0.08]',
        iconClass: 'text-orange-200/90',
    },
    documents: {
        tone: 'border-sky-400/14 bg-sky-500/[0.04] hover:border-sky-300/28 hover:bg-sky-500/[0.08] focus-visible:ring-sky-400/25',
        iconWrapClass: 'group-hover:border-sky-300/28 group-hover:bg-sky-500/[0.1]',
        iconClass: 'text-sky-200/90',
    },
    decisions: {
        tone: 'border-rose-400/16 bg-rose-500/[0.05] hover:border-rose-300/30 hover:bg-rose-500/[0.09] focus-visible:ring-rose-400/25',
        iconWrapClass: 'group-hover:border-rose-300/28 group-hover:bg-rose-500/[0.08]',
        iconClass: 'text-rose-200/90',
    },
    followup: {
        tone: 'border-emerald-400/14 bg-emerald-500/[0.04] hover:border-emerald-300/28 hover:bg-emerald-500/[0.08] focus-visible:ring-emerald-400/25',
        iconWrapClass: 'group-hover:border-emerald-300/25 group-hover:bg-emerald-500/[0.08]',
        iconClass: 'text-emerald-200/90',
    },
    finance: {
        tone: 'border-amber-400/16 bg-amber-500/[0.05] hover:border-amber-300/30 hover:bg-amber-500/[0.09] focus-visible:ring-amber-400/25',
        iconWrapClass: 'group-hover:border-amber-300/28 group-hover:bg-amber-500/[0.08]',
        iconClass: 'text-amber-200/90',
    },
} as const;
