import { HAMI_OVERLAY_SAFE_INSETS_CLASS } from '@/app/utils/overlayPortal';

/** قشرة أجندة المهام — نفس السلاسل في React وinnerHTML حتى لا ينحرف الطلاء الفوري */
export const TASKS_MANAGER_INSTANT_CHROME_ROOT_CLASS =
    `pointer-events-auto fixed inset-0 z-[230] w-[100vw] max-w-[100vw] h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#0A0F1C] ${HAMI_OVERLAY_SAFE_INSETS_CLASS}`;

export const TASKS_MANAGER_INSTANT_INNER_CLASS =
    "relative flex h-full min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[#0A0F1C] font-['Tajawal','Cairo',sans-serif]";

export const TASKS_MANAGER_INSTANT_HEADER_CLASS =
    'flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0A0F1C] px-3 py-2';

export const TASKS_MANAGER_INSTANT_BODY_CLASS =
    'mx-auto w-full max-w-3xl flex-1 space-y-2 px-3 py-3';

export const TASKS_MANAGER_INSTANT_BONE_CLASS = 'h-12 rounded-xl bg-white/[0.04]';
export const TASKS_MANAGER_INSTANT_BONE_COUNT = 5;
/** ارتفاع ثابت داخل innerHTML — لا ينهار إن غابت أداة Tailwind عن السلسلة */
export const TASKS_MANAGER_INSTANT_BONE_STYLE_ATTR =
    'height:48px;min-height:48px;border-radius:12px;background:rgba(255,255,255,0.04)';
export const TASKS_MANAGER_INSTANT_BONE_INLINE_STYLE = {
    height: 48,
    minHeight: 48,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.04)',
} as const;

export function buildTasksManagerInstantChromeBonesHtml(): string {
    const bone =
        `<div class="${TASKS_MANAGER_INSTANT_BONE_CLASS}" data-tasks-manager-instant-bone="1" style="${TASKS_MANAGER_INSTANT_BONE_STYLE_ATTR}"></div>`;
    return bone.repeat(TASKS_MANAGER_INSTANT_BONE_COUNT);
}

export function buildTasksManagerInstantChromeInnerHtml(): string {
    return (
        `<div class="${TASKS_MANAGER_INSTANT_INNER_CLASS}">` +
        `<header class="${TASKS_MANAGER_INSTANT_HEADER_CLASS}">` +
        '<div class="min-w-0 text-right">' +
        '<h1 class="truncate text-base font-semibold text-[#F4F4F5]" style="margin:0">أجندة المهام</h1>' +
        '</div></header>' +
        `<div class="${TASKS_MANAGER_INSTANT_BODY_CLASS}" data-tasks-manager-instant-body="1">` +
        buildTasksManagerInstantChromeBonesHtml() +
        '</div></div>'
    );
}

/** عناوين الأجندة من اللقطة الكاملة — ليست ستارة الميدان فقط */
export function listTasksManagerInstantPeekTitles(
    pending: ReadonlyArray<{ title?: string | null }>,
): string[] {
    const titles: string[] = [];
    for (const task of pending) {
        const title = typeof task.title === 'string' ? task.title.trim() : '';
        if (!title) continue;
        titles.push(title);
        if (titles.length >= TASKS_MANAGER_INSTANT_BONE_COUNT) break;
    }
    return titles;
}

function escapeTasksManagerInstantText(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** صفوف عناوين من اللقطة — بدل عظام فارغة عندما تكون المهام معروفة */
export function buildTasksManagerInstantChromePeekHtml(titles: readonly string[]): string {
    if (titles.length === 0) return '';
    return titles
        .slice(0, TASKS_MANAGER_INSTANT_BONE_COUNT)
        .map(
            (title) =>
                `<div class="${TASKS_MANAGER_INSTANT_BONE_CLASS} px-3 py-3 text-right" data-tasks-manager-instant-bone="1" style="${TASKS_MANAGER_INSTANT_BONE_STYLE_ATTR}">` +
                `<p class="truncate text-sm font-semibold text-[#F4F4F5]">${escapeTasksManagerInstantText(title)}</p>` +
                '</div>',
        )
        .join('');
}
