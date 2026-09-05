/** قشرة ستارة الميدان — سلاسل مطابقة لـ tasksBoucleTheme بلا استيراده إلى FullBoot */

export const FIELD_TASKS_INSTANT_DISMISS_EVENT = 'hami:field-tasks-instant-dismiss';

export const FIELD_TASKS_INSTANT_LAYER_CLASS =
    'hami-field-tasks-layer hami-field-tasks-layer--visible';

export const FIELD_TASKS_INSTANT_BACKDROP_CLASS =
    'fixed inset-0 z-[214] bg-[#05060D]/64 border-0 cursor-default opacity-100';

export const FIELD_TASKS_INSTANT_SHEET_CLASS =
    "fixed bottom-0 left-0 right-0 z-[215] max-h-[min(88dvh,640px)] flex flex-col rounded-t-[20px] " +
    "border border-white/[0.08] border-b-0 font-['Tajawal','Cairo',sans-serif] " +
    'bg-[#0A0F1C] overflow-hidden translate-y-0 pb-[max(0px,env(safe-area-inset-bottom))]';

export const FIELD_TASKS_INSTANT_HANDLE_WRAP_CLASS =
    'hami-field-tasks-swipe-handle shrink-0 flex flex-col items-center justify-center min-h-[44px] pt-2.5 pb-1 relative z-[1]';

export const FIELD_TASKS_INSTANT_HANDLE_CLASS = 'w-8 h-0.5 rounded-full bg-white/28';

export const FIELD_TASKS_INSTANT_HEADER_CLASS =
    'shrink-0 flex items-center justify-between gap-2 px-3 pb-2 border-b border-white/[0.06] relative z-[1]';

export const FIELD_TASKS_INSTANT_TITLE_CLASS = 'text-[#F4F4F5] font-semibold text-base truncate';

export const FIELD_TASKS_INSTANT_CLOSE_CLASS =
    'shrink-0 w-11 h-11 rounded-xl border border-white/[0.08] bg-transparent flex items-center justify-center text-[#F4F4F5]/80 hover:bg-white/[0.05] touch-manipulation';

export const FIELD_TASKS_INSTANT_SCROLLER_CLASS =
    'hami-field-tasks-scroller flex-1 overflow-y-auto overscroll-y-contain px-3 py-2 min-h-0 relative z-[1]';

export const FIELD_TASKS_INSTANT_BONE_CLASS =
    'rounded-xl border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 min-h-[4.5rem]';

export const FIELD_TASKS_INSTANT_BONE_COUNT = 3;

export const FIELD_TASKS_INSTANT_FOOTER_CLASS =
    'shrink-0 p-3 pt-2 border-t border-white/[0.06] bg-[#0A0F1C] relative z-[1]';

export const FIELD_TASKS_INSTANT_MANAGE_CLASS =
    'w-full min-h-[44px] py-2.5 rounded-xl font-semibold text-sm text-[#E6C673] ' +
    'border border-[#E6C673]/28 bg-[#E6C673]/8 active:opacity-90 touch-manipulation';

export const FIELD_TASKS_INSTANT_CARD_CLASS =
    'hami-field-tasks-list-item relative rounded-xl border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 text-right';

export const FIELD_TASKS_INSTANT_CARD_FATAL_CLASS = 'border-rose-400/35';

export const FIELD_TASKS_INSTANT_TASK_TITLE_CLASS =
    'text-[#F4F4F5] text-[14px] font-semibold leading-snug break-words';

export const FIELD_TASKS_INSTANT_LOCATION_CLASS =
    'mt-0.5 text-[11px] font-medium text-white/55 flex flex-row-reverse items-center gap-1 justify-end';

export const FIELD_TASKS_INSTANT_COMPLETE_CLASS =
    'min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl border border-[#34D399]/35 bg-[#34D399]/10 text-[#A7F3D0] text-[12px] font-semibold whitespace-nowrap touch-manipulation';

export const FIELD_TASKS_INSTANT_COUNT_CLASS = 'text-[11px] text-white/45 font-medium';

export const FIELD_TASKS_INSTANT_EMPTY_CLASS =
    'rounded-xl border border-white/[0.07] bg-white/[0.02] flex flex-col items-center py-8 px-3 text-center';

export type FieldTasksInstantChromeCard = {
    id: string;
    title: string;
    location: string | null;
    isFatalDeadline: boolean;
};

export function escapeFieldTasksInstantChromeText(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const LOCATION_SVG =
    '<svg class="size-3 shrink-0 opacity-70" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

export function buildFieldTasksInstantChromeEmptyHtml(): string {
    return (
        `<div class="${FIELD_TASKS_INSTANT_EMPTY_CLASS}" data-testid="field-tasks-instant-empty" role="status">` +
        `<p class="text-[#F4F4F5]/55 text-sm font-medium leading-relaxed max-w-xs">` +
        'لا مهام ميدانية ظاهرة الآن. أضف مهمة من مدير المهام، أو ثبّتها على الستارة، أو اجعل موعدها اليوم أو متأخراً ضمن الأسبوع.' +
        `</p></div>`
    );
}

export function buildFieldTasksInstantChromeCardsHtml(
    cards: readonly FieldTasksInstantChromeCard[],
): string {
    const items = cards
        .map((card) => {
            const fatal = card.isFatalDeadline;
            const loc = card.location?.trim() ? escapeFieldTasksInstantChromeText(card.location.trim()) : '';
            const title = escapeFieldTasksInstantChromeText(card.title);
            const id = escapeFieldTasksInstantChromeText(card.id);
            const cardClass = fatal
                ? `${FIELD_TASKS_INSTANT_CARD_CLASS} ${FIELD_TASKS_INSTANT_CARD_FATAL_CLASS}`
                : FIELD_TASKS_INSTANT_CARD_CLASS;
            const fatalBadge = fatal
                ? '<div class="flex flex-wrap items-center gap-1 justify-end mb-0.5"><span class="text-[10px] font-semibold text-rose-200/90 bg-rose-500/12 px-1.5 py-0.5 rounded-md">حتمي</span></div>'
                : '';
            const locationRow = loc
                ? `<p class="${FIELD_TASKS_INSTANT_LOCATION_CLASS}">${LOCATION_SVG}${loc}</p>`
                : '';
            return (
                `<li class="${cardClass}" data-field-tasks-instant-card="${id}">` +
                `<div class="flex flex-row items-start gap-2">` +
                `<div class="flex-1 min-w-0">${fatalBadge}<p class="${FIELD_TASKS_INSTANT_TASK_TITLE_CLASS}">${title}</p>${locationRow}</div>` +
                `<button type="button" class="${FIELD_TASKS_INSTANT_COMPLETE_CLASS}" data-field-tasks-instant-complete="${id}" aria-label="إنهاء ${title}">إنهاء</button>` +
                `</div></li>`
            );
        })
        .join('');
    return `<ul class="space-y-2">${items}</ul>`;
}

const CLOSE_SVG =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

export function buildFieldTasksInstantChromeInnerHtml(): string {
    const bones = Array.from(
        { length: FIELD_TASKS_INSTANT_BONE_COUNT },
        () => `<div class="${FIELD_TASKS_INSTANT_BONE_CLASS}" aria-hidden="true"></div>`,
    ).join('');

    return (
        `<button type="button" class="${FIELD_TASKS_INSTANT_BACKDROP_CLASS}" data-field-tasks-instant-backdrop="1" aria-label="إغلاق الستارة"></button>` +
        `<div class="${FIELD_TASKS_INSTANT_SHEET_CLASS}" data-field-tasks-instant-sheet="1" role="status" aria-busy="true" aria-label="مهام اليوم الميدانية">` +
        `<div class="${FIELD_TASKS_INSTANT_HANDLE_WRAP_CLASS}" aria-hidden="true"><div class="${FIELD_TASKS_INSTANT_HANDLE_CLASS}"></div></div>` +
        `<div class="${FIELD_TASKS_INSTANT_HEADER_CLASS}">` +
        `<div class="min-w-0 text-right"><h2 class="${FIELD_TASKS_INSTANT_TITLE_CLASS}">مهام اليوم الميدانية</h2>` +
        `<p class="${FIELD_TASKS_INSTANT_COUNT_CLASS}" data-field-tasks-instant-count hidden></p></div>` +
        `<button type="button" class="${FIELD_TASKS_INSTANT_CLOSE_CLASS}" data-testid="field-tasks-instant-close" aria-label="إغلاق مهام اليوم الميدانية">${CLOSE_SVG}</button>` +
        `</div>` +
        `<div dir="rtl" class="${FIELD_TASKS_INSTANT_SCROLLER_CLASS}" data-field-tasks-instant-scroller="1"><div class="space-y-2">${bones}</div></div>` +
        `<div class="${FIELD_TASKS_INSTANT_FOOTER_CLASS}">` +
        `<button type="button" class="${FIELD_TASKS_INSTANT_MANAGE_CLASS}" data-field-tasks-instant-manage="1">إدارة جميع المهام</button>` +
        `</div></div>`
    );
}
