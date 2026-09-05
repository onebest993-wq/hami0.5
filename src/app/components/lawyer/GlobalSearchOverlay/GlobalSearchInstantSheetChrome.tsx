import React, { useCallback, useState } from 'react';
import { HomeSearchIcon, HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { GLOBAL_SEARCH_LISTBOX_ID } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchA11yIds';
import {
    GS_CLOSE_BTN_CLASS,
    GS_FIELD_ROW_CLASS,
    GS_SCOPE_ICON_WRAP_CLASS,
    GS_SEARCH_INPUT_CLASS,
    GS_TITLE_ROW_CLASS,
} from '@/app/components/lawyer/GlobalSearchOverlay/searchInstantChromeClasses';
import {
    GLOBAL_SEARCH_IDLE_HINT,
    GLOBAL_SEARCH_SCOPE_CHIP_LABELS,
} from '@/app/components/lawyer/GlobalSearchOverlay/searchScopeChipLabels';
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
                <div className={GS_TITLE_ROW_CLASS}>
                    <div className="hami-gs-title-text min-w-0 text-right">
                        <p className="hami-gs-title">البحث الشامل</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${GS_CLOSE_BTN_CLASS} focus-visible:ring-2 focus-visible:ring-[#E6C673]/45`}
                        aria-label="إغلاق البحث"
                        data-testid="global-search-close"
                    >
                        <HomeXIcon size={16} strokeWidth={2.2} aria-hidden />
                    </button>
                </div>

                <div className="hami-gs-field-shell hami-gs-field-shell--active">
                    <div className={GS_FIELD_ROW_CLASS}>
                        <span
                            className={`${GS_SCOPE_ICON_WRAP_CLASS} text-white/50`}
                            aria-hidden
                        >
                            <HomeSearchIcon size={16} strokeWidth={2.25} />
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
                            className={GS_SEARCH_INPUT_CLASS}
                        />
                        <div className="shrink-0 w-11 h-11" />
                    </div>
                    <div
                        className="hami-gs-scope-rail"
                        role="listbox"
                        aria-label="تصنيف البحث"
                        data-testid="global-search-scope-menu"
                    >
                        {GLOBAL_SEARCH_SCOPE_CHIP_LABELS.map((chip) => {
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
                    {GLOBAL_SEARCH_IDLE_HINT}
                </p>
            </div>
        </>
    );
}
