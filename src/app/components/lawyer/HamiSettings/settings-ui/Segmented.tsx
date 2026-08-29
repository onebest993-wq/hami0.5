import React, { memo, useEffect, useRef, useState } from 'react';
import { SETTING_FOCUS_RING_COMPACT, SETTING_GLASS_INNER } from './tokens';

export const Segmented = memo(function Segmented<T extends string>({
    value,
    options,
    onChange,
    tone = 'dark',
    equal = false,
    nowrap = false,
    'aria-labelledby': ariaLabelledBy,
}: {
    value: T;
    options: { value: T; label: string; testId?: string }[];
    onChange: (v: T) => void;
    tone?: 'dark' | 'light';
    equal?: boolean;
    /** صف أفقي قابل للتمرير — لخيارات كثيرة مثل قفل تلقائي */
    nowrap?: boolean;
    'aria-labelledby'?: string;
}) {
    const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const [optimistic, setOptimistic] = useState<T | null>(null);
    const displayed = optimistic ?? value;

    useEffect(() => {
        if (optimistic !== null && value === optimistic) {
            setOptimistic(null);
        }
    }, [value, optimistic]);

    const select = (next: T, event: React.SyntheticEvent) => {
        event.stopPropagation();
        if (next === displayed) return;
        setOptimistic(next);
        onChange(next);
    };

    const focusOption = (index: number) => {
        const opt = options[index];
        if (!opt) return;
        onChange(opt.value);
        buttonRefs.current[index]?.focus();
    };

    const onOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
        let next = index;

        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = options.length - 1;
        else if (event.key === 'ArrowRight') next = rtl ? index - 1 : index + 1;
        else if (event.key === 'ArrowLeft') next = rtl ? index + 1 : index - 1;
        else return;

        event.preventDefault();
        next = Math.max(0, Math.min(options.length - 1, next));
        focusOption(next);
    };

    return (
        <div
            role="radiogroup"
            aria-labelledby={ariaLabelledBy}
            className={`flex gap-0.5 p-0.5 rounded-lg w-full ${nowrap ? 'hami-settings-segmented-nowrap flex-nowrap overflow-x-auto overscroll-x-contain pe-3' : ''} ${SETTING_GLASS_INNER}`}
        >
            {options.map((opt, index) => {
                const selected = displayed === opt.value;
                return (
                    <button
                        key={opt.value}
                        ref={(node) => {
                            buttonRefs.current[index] = node;
                        }}
                        type="button"
                        role="radio"
                        data-testid={opt.testId}
                        aria-checked={selected}
                        tabIndex={selected ? 0 : -1}
                        onKeyDown={(event) => onOptionKeyDown(event, index)}
                        onClick={(event) => {
                            event.preventDefault();
                            select(opt.value, event);
                        }}
                        className={`${equal ? 'flex-1' : ''} ${nowrap ? 'shrink-0' : ''} min-h-[44px] min-w-[44px] px-2 sm:px-2.5 py-2 rounded-md text-[12px] font-semibold touch-manipulation hami-settings-segment ${SETTING_FOCUS_RING_COMPACT} ${
                            selected
                                ? tone === 'light'
                                    ? 'bg-black/[0.08] text-[#3f4654] ring-1 ring-inset ring-black/[0.08]'
                                    : 'bg-[#E6C673]/16 text-[#f7ebc4] ring-1 ring-inset ring-[#E6C673]/28'
                                : tone === 'light'
                                  ? 'text-black/40 hover:text-black/55 hover:bg-black/[0.04]'
                                  : 'text-white/45 hover:text-white/75 hover:bg-white/[0.05]'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}) as <T extends string>(props: {
    value: T;
    options: { value: T; label: string; testId?: string }[];
    onChange: (v: T) => void;
    tone?: 'dark' | 'light';
    equal?: boolean;
    nowrap?: boolean;
    'aria-labelledby'?: string;
}) => React.ReactElement;
