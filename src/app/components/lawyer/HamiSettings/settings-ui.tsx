import React from 'react';
import type { LucideIcon } from 'lucide-react';

/** زجاج شفاف — يظهر الزخرفة من خلفه */
export const SETTING_GLASS =
    'rounded-2xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-xl overflow-hidden shadow-[0_4px_28px_rgba(0,0,0,0.14)] ring-1 ring-inset ring-white/[0.04]';

export const SETTING_GLASS_INNER =
    'bg-white/[0.03] backdrop-blur-sm border border-white/[0.06]';

export const SectionHeader = ({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon: LucideIcon }) => (
    <div className="flex items-start gap-3 mb-3 mt-2 px-0.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${SETTING_GLASS_INNER}`}>
            <Icon size={18} className="text-[#E6C673]" />
        </div>
        <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            {subtitle && <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
    </div>
);

export const SettingCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`${SETTING_GLASS} ${className}`}>
        {children}
    </div>
);

export const SettingRow = ({
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
}) => (
    <div
        className={`flex items-center justify-between gap-3 p-4 ${!isLast ? 'border-b border-white/[0.03]' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
        <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white/70 shrink-0 ${SETTING_GLASS_INNER}`}>
                <Icon size={17} />
            </div>
            <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{label}</div>
                {subLabel && <div className="text-[10px] text-white/40 leading-snug mt-0.5">{subLabel}</div>}
            </div>
        </div>
        <div className="shrink-0">{action}</div>
    </div>
);

export const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-full relative transition-all duration-300 ${checked ? 'bg-[#E6C673] shadow-[0_0_12px_rgba(230,198,115,0.35)]' : 'bg-white/10'} ${disabled ? 'opacity-40' : ''}`}
    >
        <div
            className={`absolute top-1 right-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${checked ? '-translate-x-5' : 'translate-x-0'}`}
        />
    </button>
);

export const Segmented = <T extends string>({
    value,
    options,
    onChange,
    tone = 'dark',
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
    tone?: 'dark' | 'light';
}) => (
    <div className={`flex p-0.5 rounded-xl ${SETTING_GLASS_INNER}`}>
        {options.map((opt) => (
            <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
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

export const SliderRow = ({
    label,
    value,
    min,
    max,
    step,
    format,
    onChange,
    hint,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
    onChange: (v: number) => void;
    hint?: string;
}) => (
    <div className="p-4 border-b border-white/[0.03] last:border-0">
        <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-white">{label}</span>
            <span className="text-xs font-mono text-[#E6C673]">{format(value)}</span>
        </div>
        {hint ? <p className="text-[10px] text-amber-400/80 mb-2 leading-snug">{hint}</p> : null}
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#E6C673] [&::-webkit-slider-thumb]:rounded-full"
        />
    </div>
);

export const SelectRow = ({
    label,
    value,
    options,
    onChange,
    hint,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    hint?: string;
}) => (
    <div className="p-4 border-b border-white/[0.03] last:border-0">
        <label className="text-sm font-semibold text-white block mb-2">{label}</label>
        {hint ? <p className="text-[10px] text-amber-400/80 mb-2 leading-snug">{hint}</p> : null}
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-xl py-2.5 px-3 text-sm text-white outline-none focus:border-[#E6C673]/40 ${SETTING_GLASS_INNER}`}
        >
            {options.map((o) => (
                <option key={o.value || 'empty'} value={o.value} className="bg-[#0B1021]">
                    {o.label || '— اختر —'}
                </option>
            ))}
        </select>
    </div>
);

