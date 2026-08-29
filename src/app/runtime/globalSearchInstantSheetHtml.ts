/** كروم ورقة الطلاء الفوري — نفس رأس البحث دون سحب الفهرس/Fuse إلى مسار العدسة */

export const GLOBAL_SEARCH_INSTANT_IDLE_HINT = 'اكتب للبحث في الملفات والمواعيد والملاحظات';

export const GLOBAL_SEARCH_INSTANT_SCOPE_CHIPS: readonly { id: string; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'execution', label: 'تنفيذ' },
    { id: 'lawsuit', label: 'دعاوى' },
    { id: 'criminal', label: 'جزائي' },
    { id: 'transactions', label: 'معاملات' },
    { id: 'tasks', label: 'مهام' },
    { id: 'calendar', label: 'تقويم' },
    { id: 'vault', label: 'المستودع' },
    { id: 'notes', label: 'ملاحظات' },
    { id: 'notifications', label: 'إشعارات' },
];

const SEARCH_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>';

const CLOSE_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

function instantScopeChipsHtml(): string {
    return GLOBAL_SEARCH_INSTANT_SCOPE_CHIPS.map((chip) => {
        const selected = chip.id === 'all';
        const active = selected ? ' hami-gs-scope-chip--active' : '';
        return `<button type="button" tabindex="-1" role="option" aria-selected="${selected ? 'true' : 'false'}" data-testid="global-search-scope-${chip.id}" class="hami-gs-scope-chip outline-none${active}">${chip.label}</button>`;
    }).join('');
}

/** محتوى `.hami-gs-sheet` — رأس + حقل + تلميح حتى لا تنهار الورقة على سطح المكتب */
export function buildGlobalSearchInstantSheetInnerHtml(): string {
    return `<div class="hami-gs-handle-hit" aria-hidden="true"><div class="hami-gs-handle"></div></div>
        <div class="hami-gs-header" data-compact="false">
          <div class="hami-gs-title-row flex items-center justify-between gap-2 mb-1.5">
            <div class="hami-gs-title-text min-w-0 text-right">
              <p class="hami-gs-title">البحث الشامل</p>
            </div>
            <button type="button" class="hami-gs-close shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 ms-auto flex items-center justify-center touch-manipulation outline-none" aria-label="إغلاق البحث" data-testid="global-search-close">${CLOSE_ICON_SVG}</button>
          </div>
          <div class="hami-gs-field-shell hami-gs-field-shell--active">
            <div class="flex items-center gap-1 min-h-[44px] pe-1 ps-1">
              <span class="relative shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center text-white/50" aria-hidden="true">${SEARCH_ICON_SVG}</span>
              <input type="text" role="combobox" aria-label="بحث في التطبيق" aria-controls="global-search-listbox" aria-expanded="false" aria-autocomplete="list" data-testid="global-search-paint-input" placeholder="بحث" enterkeyhint="search" inputmode="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" class="flex-1 min-w-0 bg-transparent text-[16px] sm:text-base font-medium text-white placeholder-white/28 outline-none border-none py-2" />
              <div class="shrink-0 w-11 h-11"></div>
            </div>
            <div class="hami-gs-scope-rail" role="listbox" aria-label="تصنيف البحث" data-testid="global-search-scope-menu">${instantScopeChipsHtml()}</div>
          </div>
        </div>
        <div data-testid="global-search-idle">
          <p class="hami-gs-idle-hint" data-testid="global-search-idle-hint">${GLOBAL_SEARCH_INSTANT_IDLE_HINT}</p>
        </div>`;
}
