import React, { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { GLOBAL_SEARCH_LISTBOX_ID } from '@/app/components/lawyer/GlobalSearchOverlay/constants';
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
    inputRef?: RefObject<HTMLInputElement | null>;
    scope?: GlobalSearchScopeId;
    onScopeChange?: (scope: GlobalSearchScopeId) => void;
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
}: SearchHeaderProps) {
    const [scopeOpen, setScopeOpen] = useState(false);
    const shellRef = useRef<HTMLDivElement>(null);
    const scopeListId = useId();
    const scopeActive = scope !== 'all';
    const scopeLabel = SEARCH_SCOPE_CHIPS.find((c) => c.id === scope)?.label ?? 'الكل';
    const hasQuery = query.trim().length > 0;

    useEffect(() => {
        if (!open) {
            setScopeOpen(false);
            return;
        }
        let cancelled = false;
        let frame2 = 0;
        const focusInput = () => {
            if (cancelled) return;
            inputRef?.current?.focus({ preventScroll: true });
        };
        /* إطاران + تأخير قصير — بعد reveal/inert وswap InstantShell→Overlay */
        const frame1 = requestAnimationFrame(() => {
            focusInput();
            frame2 = requestAnimationFrame(focusInput);
        });
        const retry = window.setTimeout(focusInput, 48);
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame1);
            cancelAnimationFrame(frame2);
            window.clearTimeout(retry);
        };
    }, [inputRef, open]);

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

    return (
        <div className="relative shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-5 sm:pt-4">
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
                className={`overflow-hidden rounded-[1.15rem] border ${
                    open ? '' : 'transition-[border-color,background-color] duration-150'
                } ${
                    fieldSettled
                        ? 'bg-[#E6C673]/[0.07] border-[#E6C673]/30'
                        : 'bg-white/[0.045] border-white/[0.1]'
                }`}
            >
                <div className="flex items-center gap-1.5 min-h-[52px] pe-3 ps-1.5">
                    <button
                        type="button"
                        onClick={() => setScopeOpen((v) => !v)}
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

                    {isBusy ? (
                        <Loader2 size={18} className="text-[#E6C673]/80 animate-spin shrink-0" aria-hidden />
                    ) : hasQuery ? (
                        <button
                            type="button"
                            onClick={() => onQueryChange('')}
                            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/45 active:text-white touch-manipulation shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40"
                            aria-label="مسح البحث"
                            data-testid="global-search-clear-query"
                        >
                            <X size={14} strokeWidth={2.4} aria-hidden />
                        </button>
                    ) : scopeActive ? (
                        <button
                            type="button"
                            onClick={() => onScopeChange('all')}
                            className="shrink-0 min-h-[44px] min-w-[44px] max-w-[6.5rem] truncate rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-[#E6C673] bg-[#E6C673]/12 touch-manipulation"
                            aria-label={`إلغاء تصنيف ${scopeLabel}`}
                            data-testid="global-search-scope-clear"
                        >
                            {scopeLabel}
                        </button>
                    ) : (
                        <kbd className="hidden sm:inline-flex items-center rounded-lg border border-white/[0.08] bg-black/25 px-1.5 py-1 text-[10px] font-bold text-white/30 shrink-0">
                            Esc
                        </kbd>
                    )}
                </div>

                {scopeOpen ? (
                    <div
                        id={scopeListId}
                        role="listbox"
                        aria-label="تصنيف البحث"
                        data-testid="global-search-scope-menu"
                        className="border-t border-white/[0.07] px-2.5 pt-2 pb-2.5"
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
                                        className={`shrink-0 min-h-[44px] min-w-[44px] px-3 rounded-full text-[12px] font-bold touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40 ${
                                            selected
                                                ? 'bg-[#E6C673]/18 text-[#E6C673] shadow-[inset_0_0_0_1px_rgba(230,198,115,0.4)]'
                                                : 'bg-white/[0.04] text-white/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] active:text-white/75'
                                        }`}
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
