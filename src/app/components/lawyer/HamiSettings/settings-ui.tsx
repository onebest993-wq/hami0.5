import React, { memo, useEffect, useId, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

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
    return (
        <div
            className={`flex items-center justify-between gap-3 p-4 ${!isLast ? SETTING_ROW_BORDER : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={`${SETTING_ICON_BOX} text-white/70`}>
                    <Icon size={17} />
                </div>
                <div className="min-w-0">
                    <div id={labelId} className="text-sm font-semibold text-white truncate">
                        {label}
                    </div>
                    {subLabel ? (
                        <p className="text-[10px] text-white/45 mt-0.5 leading-relaxed">{subLabel}</p>
                    ) : null}
                </div>
            </div>
            <div className="shrink-0">
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
    'aria-labelledby': ariaLabelledBy,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    label?: string;
    testId?: string;
    'aria-labelledby'?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            aria-labelledby={ariaLabelledBy}
            disabled={disabled}
            data-testid={testId}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full touch-manipulation transition-transform duration-100 active:scale-[0.97] ${SETTING_FOCUS_RING} ${disabled ? 'opacity-40' : ''}`}
        >
            <div
                className={`relative h-7 w-12 rounded-full transition-all duration-200 ${checked ? 'bg-[#E6C673] shadow-[0_0_12px_rgba(230,198,115,0.35)]' : 'bg-white/10'}`}
            >
                <div
                    className={`absolute top-1 right-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? '-translate-x-5' : 'translate-x-0'}`}
                />
            </div>
        </button>
    );
});

export const Segmented = <T extends string>({
    value,
    options,
    onChange,
    tone = 'dark',
    'aria-labelledby': ariaLabelledBy,
}: {
    value: T;
    options: { value: T; label: string; testId?: string }[];
    onChange: (v: T) => void;
    tone?: 'dark' | 'light';
    'aria-labelledby'?: string;
}) => (
    <div
        role="group"
        aria-labelledby={ariaLabelledBy}
        className={`flex p-0.5 rounded-xl ${SETTING_GLASS_INNER}`}
    >
        {options.map((opt) => (
            <button
                key={opt.value}
                type="button"
                data-testid={opt.testId}
                aria-pressed={value === opt.value}
                onClick={() => onChange(opt.value)}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-[10px] font-bold touch-manipulation transition-all duration-100 active:scale-[0.98] ${SETTING_FOCUS_RING_COMPACT} ${
                    value === opt.value
                        ? tone === 'light'
                            ? 'bg-black/[0.08] text-[#3f4654] ring-1 ring-inset ring-black/[0.08]'
                            : 'bg-[#E6C673]/18 text-[#E6C673] ring-1 ring-inset ring-[#E6C673]/25'
                        : tone === 'light'
                          ? 'text-black/40 hover:text-black/55 hover:bg-black/[0.04]'
                          : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                }`}
            >
                {opt.label}
            </button>
        ))}
    </div>
);

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

export const SelectRow = ({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
}) => (
    <div className={`p-4 ${SETTING_ROW_BORDER} last:border-0`}>
        <label className="text-sm font-semibold text-white block mb-2">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className={`w-full min-h-[44px] rounded-xl py-2.5 px-3 text-sm text-white outline-none touch-manipulation focus-visible:border-[#E6C673]/40 focus-visible:ring-2 focus-visible:ring-[#E6C673]/40 ${SETTING_GLASS_INNER}`}
        >
            {options.map((o) => (
                <option key={o.value || 'empty'} value={o.value} className="bg-[#0B1021]">
                    {o.label || '— اختر —'}
                </option>
            ))}
        </select>
    </div>
);
