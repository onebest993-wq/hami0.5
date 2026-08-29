import React, { useCallback, useState } from 'react';
import { HomeSearchIcon, HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { GLOBAL_SEARCH_LISTBOX_ID } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchA11yIds';
import {
    GLOBAL_SEARCH_INSTANT_IDLE_HINT,
    GLOBAL_SEARCH_INSTANT_SCOPE_CHIPS,
} from '@/app/runtime/globalSearchInstantSheetHtml';
import { peekGlobalSearchDraftQuery, writeGlobalSearchDraftQuery } from '@/app/runtime/globalSearchDraftQuery';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';

type GlobalSearchInstantSheetChromeProps = {
    onClose: () => void;
};

/**
 * رأس البحث + تلميح الخمول أثناء انتظار Host — بلا نتائج/فهرس.
 * يمنع انهيار الورقة على سطح المكتب (height:auto + مقبض مخفي).
 */
export function GlobalSearchInstantSheetChrome({
    onClose,
}: GlobalSearchInstantSheetChromeProps): React.ReactElement {
    const [query, setQueryState] = useState(() => clampGlobalSearchQuery(peekGlobalSearchDraftQuery()));

    const setQuery = useCallback((value: string) => {
        const next = clampGlobalSearchQuery(value);
        setQueryState(next);
        writeGlobalSearchDraftQuery(next);
    }, []);

    return (
        <>
            <div className="hami-gs-handle-hit" aria-hidden>
                <div className="hami-gs-handle" />
            </div>
            <div className="hami-gs-header" data-compact="false">
                <div className="hami-gs-title-row flex items-center justify-between gap-2 mb-1.5">
                    <div className="hami-gs-title-text min-w-0 text-right">
                        <p className="hami-gs-title">البحث الشامل</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="hami-gs-close shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 ms-auto flex items-center justify-center touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45"
                        aria-label="إغلاق البحث"
                        data-testid="global-search-close"
                    >
                        <HomeXIcon size={18} strokeWidth={2.2} aria-hidden />
                    </button>
                </div>

                <div className="hami-gs-field-shell hami-gs-field-shell--active">
                    <div className="flex items-center gap-1 min-h-[44px] pe-1 ps-1">
                        <span
                            className="relative shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center text-white/50"
                            aria-hidden
                        >
                            <HomeSearchIcon size={18} strokeWidth={2.25} />
                        </span>
                        <input
                            type="text"
                            role="combobox"
                            aria-label="بحث في التطبيق"
                            aria-controls={GLOBAL_SEARCH_LISTBOX_ID}
                            aria-expanded={false}
                            aria-autocomplete="list"
                            data-testid="global-search-input"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="بحث"
                            enterKeyHint="search"
                            inputMode="search"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            className="flex-1 min-w-0 bg-transparent text-[16px] sm:text-base font-medium text-white placeholder-white/28 outline-none border-none py-2"
                        />
                        <div className="shrink-0 w-11 h-11" />
                    </div>
                    <div
                        className="hami-gs-scope-rail"
                        role="listbox"
                        aria-label="تصنيف البحث"
                        data-testid="global-search-scope-menu"
                    >
                        {GLOBAL_SEARCH_INSTANT_SCOPE_CHIPS.map((chip) => {
                            const selected = chip.id === 'all';
                            return (
                                <button
                                    key={chip.id}
                                    type="button"
                                    tabIndex={-1}
                                    role="option"
                                    aria-selected={selected}
                                    data-testid={`global-search-scope-${chip.id}`}
                                    className={`hami-gs-scope-chip outline-none ${
                                        selected ? 'hami-gs-scope-chip--active' : ''
                                    }`}
                                >
                                    {chip.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div data-testid="global-search-idle">
                <p className="hami-gs-idle-hint" data-testid="global-search-idle-hint">
                    {GLOBAL_SEARCH_INSTANT_IDLE_HINT}
                </p>
            </div>
        </>
    );
}
