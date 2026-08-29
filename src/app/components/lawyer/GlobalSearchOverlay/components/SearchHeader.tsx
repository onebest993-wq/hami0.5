import { type RefObject } from 'react';
import { HomeSearchIcon, HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { GLOBAL_SEARCH_LISTBOX_ID } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchA11yIds';
import { useGlobalSearchInputFocus } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchInputFocus';
import {
    SEARCH_SCOPE_CHIPS,
    type GlobalSearchScopeId,
} from '@/app/components/lawyer/GlobalSearchOverlay/searchScopes';
import { SearchScopeChipList } from '@/app/components/lawyer/GlobalSearchOverlay/components/SearchScopeChipList';

const EMPTY_SEARCH_INPUT_REF: RefObject<HTMLInputElement | null> = { current: null };

export interface SearchHeaderProps {
    open?: boolean;
    query: string;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    isBusy: boolean;
    listExpanded?: boolean;
    inputRef?: RefObject<HTMLInputElement>;
    scope?: GlobalSearchScopeId;
    onScopeChange?: (scope: GlobalSearchScopeId) => void;
    focusArmed?: boolean;
    compact?: boolean;
}

export function SearchHeader({
    open = true,
    query,
    onQueryChange,
    onClose,
    isBusy,
    listExpanded = false,
    inputRef,
    scope = 'all',
    onScopeChange = () => undefined,
    focusArmed = true,
    compact = false,
}: SearchHeaderProps) {
    const scopeActive = scope !== 'all';
    const scopeLabel = SEARCH_SCOPE_CHIPS.find((c) => c.id === scope)?.label ?? 'الكل';
    const hasQuery = query.trim().length > 0;

    useGlobalSearchInputFocus(open, inputRef ?? EMPTY_SEARCH_INPUT_REF, focusArmed);

    const fieldSettled = open || hasQuery || scopeActive;
    const focusInput = () => inputRef?.current?.focus({ preventScroll: true });

    return (
        <div className="hami-gs-header" data-compact={compact ? 'true' : 'false'}>
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

            <div className={`hami-gs-field-shell ${fieldSettled ? 'hami-gs-field-shell--active' : ''}`}>
                <div className="flex items-center gap-1 min-h-[44px] pe-1 ps-1">
                    <button
                        type="button"
                        onClick={focusInput}
                        aria-label={scopeActive ? `تصنيف البحث: ${scopeLabel}` : 'تصنيف البحث'}
                        data-testid="global-search-scope-trigger"
                        className={`relative shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 ${
                            scopeActive ? 'text-[#E6C673]' : 'text-white/50'
                        }`}
                    >
                        <HomeSearchIcon size={18} strokeWidth={2.25} aria-hidden />
                        {scopeActive ? (
                            <span
                                className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-[#E6C673]"
                                aria-hidden
                            />
                        ) : null}
                    </button>

                    <input
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        aria-label="بحث في التطبيق"
                        aria-controls={GLOBAL_SEARCH_LISTBOX_ID}
                        aria-expanded={listExpanded}
                        aria-autocomplete="list"
                        aria-haspopup="listbox"
                        data-testid="global-search-input"
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder="بحث"
                        enterKeyHint="search"
                        inputMode="search"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        aria-busy={isBusy || undefined}
                        className="flex-1 min-w-0 bg-transparent text-[16px] sm:text-base font-medium text-white placeholder-white/28 outline-none border-none py-2"
                    />

                    <div className="shrink-0 w-11 h-11 flex items-center justify-center">
                        {hasQuery ? (
                            <button
                                type="button"
                                onClick={() => onQueryChange('')}
                                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center text-white/45 active:text-white touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40"
                                aria-label="مسح البحث"
                                data-testid="global-search-clear-query"
                            >
                                <HomeXIcon size={14} strokeWidth={2.4} aria-hidden />
                            </button>
                        ) : scopeActive ? (
                            <button
                                type="button"
                                onClick={() => onScopeChange('all')}
                                className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-full flex items-center justify-center text-white/50 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40"
                                aria-label={`إلغاء تصنيف ${scopeLabel}`}
                                data-testid="global-search-scope-clear"
                            >
                                <HomeXIcon size={14} strokeWidth={2.4} aria-hidden />
                            </button>
                        ) : null}
                    </div>
                </div>

                <SearchScopeChipList
                    scope={scope}
                    onScopeChange={onScopeChange}
                    onAfterSelect={focusInput}
                />
            </div>
        </div>
    );
}
