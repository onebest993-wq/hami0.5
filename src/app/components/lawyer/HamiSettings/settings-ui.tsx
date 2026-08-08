import React, { memo, useCallback, useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';

/** زجاج ملكي — إطار خفيف يتأثر بـ --hami-primary */
export const SETTING_GLASS =
    'hami-setting-glass rounded-2xl overflow-hidden';

export const SETTING_GLASS_INNER =
    'hami-setting-glass-inner rounded-xl';

export const SETTING_ROW_BORDER = 'border-b border-white/[0.03]';

const SETTING_ICON_BOX = `w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${SETTING_GLASS_INNER}`;

const SETTING_FOCUS_RING =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1021]';

const SETTING_FOCUS_RING_COMPACT =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B1021]';

export const SettingCard = memo(function SettingCard({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <div className={`${SETTING_GLASS} ${className}`}>{children}</div>;
});

export const SettingRow = memo(function SettingRow({
    icon: Icon,
    label,
    subLabel,
    action,
    isLast,
    disabled,
}: {
    icon: LucideIcon;
    label: string;
    subLabel?: string;
    action: React.ReactNode;
    isLast?: boolean;
    disabled?: boolean;
}) {
    const labelId = useId();
    const actionHostRef = useRef<HTMLDivElement>(null);

    const activateRowSwitch = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (disabled || event.button !== 0) return;
            const target = event.target;
            if (target instanceof Element && target.closest('[role="switch"]')) return;
            const sw = actionHostRef.current?.querySelector('[role="switch"]');
            if (!(sw instanceof HTMLButtonElement) || sw.getAttribute('aria-disabled') === 'true') return;
            event.preventDefault();
            event.stopPropagation();
            sw.click();
        },
        [disabled],
    );

    return (
        <div
            className={`flex items-center justify-between gap-3 p-4 touch-manipulation ${!isLast ? SETTING_ROW_BORDER : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            onPointerDown={activateRowSwitch}
        >
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className={`${SETTING_ICON_BOX} text-white/70`}>
                    <Icon size={17} />
                </div>
                <div className="min-w-0">
                    <div id={labelId} className="text-sm font-semibold text-white truncate">
                        {label}
                    </div>
                    {subLabel ? (
                        <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{subLabel}</p>
                    ) : null}
                </div>
            </div>
            <div ref={actionHostRef} className="relative z-[2] shrink-0">
                {React.isValidElement(action)
                    ? (() => {
                          const props = action.props as Record<string, unknown>;
                          const hasAriaLabel = typeof props['aria-label'] === 'string' && String(props['aria-label']).trim();
                          const hasAriaLabelledBy =
                              typeof props['aria-labelledby'] === 'string' && String(props['aria-labelledby']).trim();
                          if (hasAriaLabel || hasAriaLabelledBy) return action;
                          return React.cloneElement(action, {
                              'aria-labelledby': labelId,
                          } as Record<string, unknown>);
                      })()
                    : action}
            </div>
        </div>
    );
});

export const Toggle = memo(function Toggle({
    checked,
    onChange,
    disabled,
    label,
    testId,
    optimistic: optimisticUi = true,
    'aria-labelledby': ariaLabelledBy,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    label?: string;
    testId?: string;
    optimistic?: boolean;
    'aria-labelledby'?: string;
}) {
    const [optimistic, setOptimistic] = useState<boolean | null>(null);
    const pointerCommitRef = useRef(false);
    const displayed = optimisticUi ? (optimistic ?? checked) : checked;

    useEffect(() => {
        if (!optimisticUi) return;
        if (optimistic !== null && checked === optimistic) {
            setOptimistic(null);
        }
    }, [checked, optimistic, optimisticUi]);

    const commit = (next: boolean, event: React.SyntheticEvent) => {
        event.stopPropagation();
        if (disabled) return;
        if (optimisticUi) setOptimistic(next);
        onChange(next);
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={displayed}
            aria-label={label}
            aria-labelledby={ariaLabelledBy}
            disabled={disabled}
            data-testid={testId}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                pointerCommitRef.current = true;
                commit(!displayed, event);
            }}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (pointerCommitRef.current) {
                    pointerCommitRef.current = false;
                    return;
                }
                commit(!displayed, event);
            }}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            className={`relative z-[2] inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full touch-manipulation active:scale-[0.97] ${SETTING_FOCUS_RING} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
        >
            <div
                aria-hidden
                className={`pointer-events-none relative h-7 w-12 rounded-full hami-settings-toggle-track ${displayed ? 'bg-[#E6C673] shadow-[0_0_12px_rgba(230,198,115,0.35)]' : 'bg-white/10'}`}
            >
                <div
                    className={`pointer-events-none absolute top-1 right-1 h-5 w-5 rounded-full bg-white shadow-md hami-settings-toggle-thumb ${displayed ? '-translate-x-5' : 'translate-x-0'}`}
                />
            </div>
        </button>
    );
});

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
            className={`flex gap-1 p-1 rounded-2xl w-full ${nowrap ? 'hami-settings-segmented-nowrap flex-nowrap overflow-x-auto overscroll-x-contain' : ''} ${SETTING_GLASS_INNER}`}
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
                        onPointerDown={(event) => {
                            if (event.button !== 0) return;
                            select(opt.value, event);
                        }}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        className={`${equal ? 'flex-1' : ''} ${nowrap ? 'shrink-0' : ''} min-h-[44px] px-2 sm:px-3 py-2.5 rounded-xl text-xs font-bold touch-manipulation active:scale-[0.98] hami-settings-segment ${SETTING_FOCUS_RING_COMPACT} ${
                            selected
                                ? tone === 'light'
                                    ? 'bg-black/[0.08] text-[#3f4654] ring-1 ring-inset ring-black/[0.08] shadow-sm'
                                    : 'bg-gradient-to-b from-[#E6C673]/22 to-[#E6C673]/10 text-[#E6C673] ring-1 ring-inset ring-[#E6C673]/35 shadow-[0_2px_12px_rgba(230,198,115,0.12)]'
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

export const SliderRow = memo(function SliderRow({
    label,
    value,
    min,
    max,
    step,
    format,
    onChange,
    debounceMs,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
    onChange: (v: number) => void;
    /** تأخير commit أثناء السحب — يخفّف applySettingsToDom على الأجهزة الضعيفة */
    debounceMs?: number;
}) {
    const [localValue, setLocalValue] = useState(value);
    const timerRef = useRef<number | null>(null);
    const pendingRef = useRef<number | null>(null);

    useEffect(() => {
        if (debounceMs && pendingRef.current !== null) return;
        setLocalValue(value);
    }, [debounceMs, value]);

    useEffect(() => {
        return () => {
            if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        };
    }, []);

    const flush = (next: number) => {
        pendingRef.current = null;
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        onChange(next);
    };

    const handleChange = (next: number) => {
        if (!debounceMs) {
            onChange(next);
            return;
        }
        setLocalValue(next);
        pendingRef.current = next;
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => flush(next), debounceMs);
    };

    const displayed = debounceMs ? localValue : value;

    return (
    <div className={`p-4 ${SETTING_ROW_BORDER} last:border-0`}>
        <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-white">{label}</span>
            <span className="text-xs font-mono text-[#E6C673]">{format(displayed)}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayed}
            onChange={(e) => handleChange(parseFloat(e.target.value))}
            onPointerUp={() => {
                if (debounceMs && pendingRef.current !== null) flush(pendingRef.current);
            }}
            onBlur={() => {
                if (debounceMs && pendingRef.current !== null) flush(pendingRef.current);
            }}
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={displayed}
            aria-valuetext={format(displayed)}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#E6C673] [&::-webkit-slider-thumb]:rounded-full touch-manipulation"
        />
    </div>
    );
});

export const SelectRow = memo(function SelectRow({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { value: string; label: string; testId?: string }[];
    onChange: (v: string) => void;
}) {
    const labelId = useId();

    return (
        <div className={`p-4 ${SETTING_ROW_BORDER} last:border-0`}>
            <span id={labelId} className="text-sm font-semibold text-white block mb-2.5">
                {label}
            </span>
            <Segmented
                value={value}
                options={options}
                onChange={onChange}
                nowrap
                aria-labelledby={labelId}
            />
        </div>
    );
});
