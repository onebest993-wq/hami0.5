import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Loader2, Search, X } from '@/app/components/ui/lucideIcons';
import { GLOBAL_SEARCH_LISTBOX_ID } from '@/app/components/lawyer/GlobalSearchOverlay/constants';
import { useGlobalSearchInputFocus } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchInputFocus';
import {
    SEARCH_SCOPE_CHIPS,
    type GlobalSearchScopeId,
} from '@/app/components/lawyer/GlobalSearchOverlay/searchScopes';

export interface SearchHeaderProps {
    open?: boolean;
    query: string;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    isBusy: boolean;
    expanded?: boolean;
    inputRef?: RefObject<HTMLInputElement>;
    scope?: GlobalSearchScopeId;
    onScopeChange?: (scope: GlobalSearchScopeId) => void;
    focusArmed?: boolean;
}

/**
 * حقل بحث واحد: أيقونة البحث تكشف شرائح التصنيف داخل نفس الإطار — بلا قائمة منفصلة.
 */
export function SearchHeader({
    open = true,
    query,
    onQueryChange,
    onClose,
    isBusy,
    expanded = false,
    inputRef,
    scope = 'all',
    onScopeChange = () => undefined,
    focusArmed = true,
}: SearchHeaderProps) {
    const [scopeOpen, setScopeOpen] = useState(false);
    const shellRef = useRef<HTMLDivElement>(null);
    const scopeListId = useId();
    const scopeActive = scope !== 'all';
    const scopeLabel = SEARCH_SCOPE_CHIPS.find((c) => c.id === scope)?.label ?? 'الكل';
    const hasQuery = query.trim().length > 0;

    useGlobalSearchInputFocus(open, inputRef ?? { current: null }, focusArmed);

    useEffect(() => {
        if (!scopeOpen) return;
        const onPointer = (event: MouseEvent | TouchEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (shellRef.current?.contains(target)) return;
            setScopeOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setScopeOpen(false);
            }
        };
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('touchstart', onPointer, { passive: true });
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('touchstart', onPointer);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [scopeOpen]);

    const shellActive = hasQuery || scopeActive || scopeOpen;
    /* عند الفتح: ألوان التركيز النهائية فوراً — بلا انتظار focus-within و transition 150ms */
    const fieldSettled = open || shellActive;

    const scopeChipClass = (selected: boolean) =>
        `hami-gs-scope-chip outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40 ${
            selected ? 'hami-gs-scope-chip--active' : 'active:text-white/75'
        }`;

    return (
        <div className="hami-gs-header">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="min-w-0 text-right">
                    <p className="text-[15px] font-black text-white tracking-tight">البحث الشامل</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center text-white/55 active:text-white active:bg-white/[0.08] touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45"
                    aria-label="إغلاق البحث"
                    data-testid="global-search-close"
                >
                    <X size={18} strokeWidth={2.2} aria-hidden />
                </button>
            </div>

            <div
                ref={shellRef}
                className={`hami-gs-field-shell ${fieldSettled ? 'hami-gs-field-shell--active' : ''} ${
                    open ? '' : 'transition-[border-color,background-color] duration-150'
                }`}
            >
                <div className="flex items-center gap-1.5 min-h-[52px] pe-3 ps-1.5">
                    <button
                        type="button"
                        onClick={() => {
                            if (typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches) {
                                setScopeOpen((v) => !v);
                                return;
                            }
                            inputRef?.current?.focus({ preventScroll: true });
                        }}
                        aria-label={scopeActive ? `تصنيف البحث: ${scopeLabel}` : 'تصنيف البحث'}
                        aria-expanded={scopeOpen}
                        aria-controls={scopeListId}
                        data-testid="global-search-scope-trigger"
                        className={`relative shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 ${
                            scopeActive || scopeOpen
                                ? 'bg-[#E6C673]/18 text-[#E6C673]'
                                : 'text-[#E6C673] active:bg-white/[0.06]'
                        }`}
                    >
                        <Search size={18} strokeWidth={2.25} aria-hidden />
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
                        aria-expanded={expanded}
                        aria-autocomplete="list"
                        aria-haspopup="listbox"
                        data-testid="global-search-input"
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder={
                            scopeActive ? `ابحث ضمن «${scopeLabel}»…` : 'ابحث في التنفيذ والدعاوى والمهام…'
                        }
                        enterKeyHint="search"
                        inputMode="search"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        className="flex-1 min-w-0 bg-transparent text-[15px] sm:text-base font-bold text-white placeholder-white/28 outline-none border-none py-3"
                    />

                    <div className="shrink-0 w-11 h-11 flex items-center justify-center">
                        {isBusy ? (
                            <Loader2 size={18} className="text-[#E6C673]/80 animate-spin shrink-0" aria-hidden />
                        ) : hasQuery ? (
                            <button
                                type="button"
                                onClick={() => onQueryChange('')}
                                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/45 active:text-white touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40"
                                aria-label="مسح البحث"
                                data-testid="global-search-clear-query"
                            >
                                <X size={14} strokeWidth={2.4} aria-hidden />
                            </button>
                        ) : scopeActive ? (
                            <button
                                type="button"
                                onClick={() => onScopeChange('all')}
                                className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl flex items-center justify-center text-[#E6C673] bg-[#E6C673]/12 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40"
                                aria-label={`إلغاء تصنيف ${scopeLabel}`}
                                data-testid="global-search-scope-clear"
                            >
                                <X size={14} strokeWidth={2.4} aria-hidden />
                            </button>
                        ) : (
                            <kbd className="hidden sm:inline-flex items-center rounded-lg border border-white/[0.08] bg-black/25 px-1.5 py-1 text-[10px] font-bold text-white/30">
                                Esc
                            </kbd>
                        )}
                    </div>
                </div>

                <div
                    className="hami-gs-scope-rail sm:hidden"
                    role="listbox"
                    aria-label="تصنيف البحث"
                    data-testid="global-search-scope-menu"
                >
                    {SEARCH_SCOPE_CHIPS.map((chip) => {
                        const selected = scope === chip.id;
                        return (
                            <button
                                key={chip.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                data-testid={`global-search-scope-${chip.id}`}
                                onClick={() => {
                                    onScopeChange(chip.id);
                                    inputRef?.current?.focus({ preventScroll: true });
                                }}
                                className={scopeChipClass(selected)}
                            >
                                {chip.label}
                            </button>
                        );
                    })}
                </div>

                {scopeOpen ? (
                    <div
                        id={scopeListId}
                        role="listbox"
                        aria-label="تصنيف البحث"
                        data-testid="global-search-scope-menu-desktop"
                        className="hidden sm:block border-t border-white/[0.07] px-2.5 pt-2 pb-2.5"
                    >
                        <div className="flex flex-wrap justify-end gap-1.5">
                            {SEARCH_SCOPE_CHIPS.map((chip) => {
                                const selected = scope === chip.id;
                                return (
                                    <button
                                        key={chip.id}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        data-testid={`global-search-scope-${chip.id}`}
                                        onClick={() => {
                                            onScopeChange(chip.id);
                                            setScopeOpen(false);
                                            inputRef?.current?.focus({ preventScroll: true });
                                        }}
                                        className={scopeChipClass(selected)}
                                    >
                                        {chip.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
