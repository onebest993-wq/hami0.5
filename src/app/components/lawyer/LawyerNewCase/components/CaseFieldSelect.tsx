import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from '@/app/components/ui/lucideIcons';
import { ncFieldClass } from '../newCaseGlassTheme';

export type CaseFieldSelectProps = {
    value: string;
    onChange: (value: string) => void;
    options: readonly string[];
    placeholder?: string;
    hasError?: boolean;
    disabled?: boolean;
    'aria-label'?: string;
};

export const CaseFieldSelect = forwardRef<HTMLButtonElement, CaseFieldSelectProps>(function CaseFieldSelect(
    { value, onChange, options, placeholder = 'اختر...', hasError, disabled = false, 'aria-label': ariaLabel },
    ref,
) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

    const setRefs = (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof ref === 'function') {
            ref(node);
        } else if (ref) {
            ref.current = node;
        }
    };

    const updatePosition = () => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const listMaxHeight = Math.min(280, window.innerHeight * 0.5);
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const openUpward = spaceBelow < 160 && rect.top > listMaxHeight;
        setPosition({
            top: openUpward ? Math.max(8, rect.top - listMaxHeight - 4) : rect.bottom + 4,
            left: rect.left,
            width: rect.width,
        });
    };

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
            }
        };
        const onReposition = () => updatePosition();

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('resize', onReposition);
        window.addEventListener('scroll', onReposition, true);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('resize', onReposition);
            window.removeEventListener('scroll', onReposition, true);
        };
    }, [open]);

    const label = value || placeholder;

    const list = open ? (
        <div
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            className="fixed z-[260] max-h-[min(280px,50dvh)] overflow-y-auto overscroll-y-contain rounded-xl border border-white/[0.12] bg-[#121826] shadow-2xl py-1 touch-manipulation"
            style={{ top: position.top, left: position.left, width: position.width }}
        >
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={value === option}
                    data-testid={`case-field-option-${option}`}
                    onClick={() => {
                        onChange(option);
                        setOpen(false);
                    }}
                    className={`w-full min-h-[44px] px-3 py-2.5 text-right text-sm touch-manipulation ${
                        value === option
                            ? 'bg-[#E6C673]/15 text-[#E6C673] font-bold'
                            : 'text-white/90 hover:bg-white/[0.06]'
                    }`}
                >
                    {option}
                </button>
            ))}
        </div>
    ) : null;

    return (
        <>
            <button
                ref={setRefs}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => {
                    if (!disabled) setOpen((current) => !current);
                }}
                className={`${ncFieldClass(hasError)} flex w-full items-center justify-between gap-2 text-right touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed`}
            >
                <span className={`truncate ${value ? 'text-white' : 'text-white/30'}`}>{label}</span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                />
            </button>
            {typeof document !== 'undefined' && list ? createPortal(list, document.body) : null}
        </>
    );
});
