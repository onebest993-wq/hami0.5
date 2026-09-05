/** كروم ورقة الطلاء الفوري — نفس رأس البحث دون سحب الفهرس/Fuse إلى مسار العدسة */

import {
    GLOBAL_SEARCH_IDLE_HINT,
    GLOBAL_SEARCH_SCOPE_CHIP_LABELS,
} from '@/app/components/lawyer/GlobalSearchOverlay/searchScopeChipLabels';
import {
    GS_CLOSE_BTN_CLASS,
    GS_FIELD_ROW_CLASS,
    GS_SCOPE_ICON_WRAP_CLASS,
    GS_SEARCH_INPUT_CLASS,
    GS_TITLE_ROW_CLASS,
} from '@/app/components/lawyer/GlobalSearchOverlay/searchInstantChromeClasses';

const SEARCH_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>';

const CLOSE_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

function instantScopeChipsHtml(): string {
    return GLOBAL_SEARCH_SCOPE_CHIP_LABELS.map((chip) => {
        const selected = chip.id === 'all';
        const active = selected ? ' hami-gs-scope-chip--active' : '';
        return `<button type="button" tabindex="-1" role="option" aria-selected="${selected ? 'true' : 'false'}" data-testid="global-search-scope-${chip.id}" class="hami-gs-scope-chip outline-none${active}">${chip.label}</button>`;
    }).join('');
}

/** محتوى `.hami-gs-sheet` — رأس + حقل + تلميح حتى لا تنهار الورقة على سطح المكتب */
export function buildGlobalSearchInstantSheetInnerHtml(): string {
    return `<div class="hami-gs-handle-hit" aria-hidden="true"><div class="hami-gs-handle"></div></div>
        <div class="hami-gs-header" data-compact="false">
          <div class="${GS_TITLE_ROW_CLASS}">
            <div class="hami-gs-title-text min-w-0 text-right">
              <p class="hami-gs-title">البحث الشامل</p>
            </div>
            <button type="button" class="${GS_CLOSE_BTN_CLASS}" aria-label="إغلاق البحث" data-testid="global-search-close">${CLOSE_ICON_SVG}</button>
          </div>
          <div class="hami-gs-field-shell hami-gs-field-shell--active">
            <div class="${GS_FIELD_ROW_CLASS}">
              <span class="${GS_SCOPE_ICON_WRAP_CLASS} text-white/50" aria-hidden="true">${SEARCH_ICON_SVG}</span>
              <input type="text" role="combobox" aria-label="بحث في التطبيق" aria-controls="global-search-listbox" aria-expanded="false" aria-autocomplete="list" data-testid="global-search-paint-input" placeholder="بحث" enterkeyhint="search" inputmode="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" class="${GS_SEARCH_INPUT_CLASS}" />
              <div class="shrink-0 w-11 h-11"></div>
            </div>
            <div class="hami-gs-scope-rail" role="listbox" aria-label="تصنيف البحث" data-testid="global-search-scope-menu">${instantScopeChipsHtml()}</div>
          </div>
        </div>
        <div data-testid="global-search-idle">
          <p class="hami-gs-idle-hint" data-testid="global-search-idle-hint">${GLOBAL_SEARCH_IDLE_HINT}</p>
        </div>`;
}
