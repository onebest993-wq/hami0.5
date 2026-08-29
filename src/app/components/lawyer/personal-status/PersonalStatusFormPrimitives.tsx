import React, { useRef } from 'react';
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';
import { Check } from '@/app/components/ui/icons/Check';
import {
    PERSONAL_STATUS_FIELD,
    PERSONAL_STATUS_FIELD_ERROR,
    PERSONAL_STATUS_LABEL,
    PERSONAL_STATUS_LAW_CHIP_ACTIVE,
    PERSONAL_STATUS_LAW_CHIP_IDLE,
    PERSONAL_STATUS_SECTION,
    PERSONAL_STATUS_SECTION_TITLE,
    PERSONAL_STATUS_TAB_ACTIVE,
    PERSONAL_STATUS_TAB_BAR,
} from './personalStatusVisualTheme';

export type PersonalFormStep = 'identity' | 'parties';

const PERSONAL_FORM_STEPS: ReadonlyArray<{ id: PersonalFormStep; label: string }> = [
    { id: 'identity', label: 'بيانات الدعوى' },
    { id: 'parties', label: 'الأطراف' },
];

export function PersonalFormStepRail({
    active,
    onChange,
    completion,
}: {
    active: PersonalFormStep;
    onChange: (step: PersonalFormStep) => void;
    completion: Record<PersonalFormStep, boolean>;
}) {
    return (
        <div className={PERSONAL_STATUS_TAB_BAR}>
            <div className="flex gap-1.5 px-3 py-1.5">
                {PERSONAL_FORM_STEPS.map((step, index) => {
                    const isActive = step.id === active;
                    const done = completion[step.id];
                    return (
                        <button
                            key={step.id}
                            type="button"
                            onClick={() => onChange(step.id)}
                            className={`flex-1 min-w-0 rounded-lg px-2.5 py-2 text-right border transition-colors touch-manipulation ${
                                isActive
                                    ? PERSONAL_STATUS_TAB_ACTIVE
                                    : done
                                      ? 'border-[#E6C673]/25 bg-[#E6C673]/8 text-[#E6C673]/90'
                                      : 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/14 hover:text-white/70'
                            }`}
                        >
                            <span className="block text-[10px] font-bold truncate">
                                <span className="text-white/35 tabular-nums">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <span className="mx-1 text-white/20" aria-hidden>·</span>
                                {step.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function PersonalFloatingField({
    label,
    value,
    onChange,
    placeholder,
    inputRef,
    error,
    inputMode = 'text',
    dir = 'rtl',
    mono = false,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    error?: string;
    inputMode?: 'text' | 'numeric';
    dir?: 'rtl' | 'ltr';
    mono?: boolean;
}) {
    return (
        <div>
            <label className={PERSONAL_STATUS_LABEL}>{label}</label>
            <input
                ref={inputRef}
                type="text"
                inputMode={inputMode}
                dir={dir}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`${PERSONAL_STATUS_FIELD} ${error ? PERSONAL_STATUS_FIELD_ERROR : ''} ${mono ? 'font-mono tracking-wide text-left [unicode-bidi:plaintext]' : ''}`}
            />
            {error ? (
                <span className="flex items-center gap-1 text-[10px] text-amber-400/90 mt-1.5 font-medium">
                    <AlertCircle size={10} /> {error}
                </span>
            ) : null}
        </div>
    );
}

export function PersonalStagePillRail({
    options,
    value,
    onChange,
    inputRef,
    error,
}: {
    options: readonly string[];
    value: string;
    onChange: (v: string) => void;
    inputRef?: React.RefObject<HTMLSelectElement | null>;
    error?: string;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className="space-y-1.5">
            {/* سحب أفقي فقط — بلا أزرار تمرير */}
            <div
                ref={scrollRef}
                className="flex gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-0.5 -mx-0.5 px-0.5 touch-pan-x"
            >
                {options.map((opt) => {
                    const active = value === opt;
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onChange(opt)}
                            className={`snap-start shrink-0 max-w-[10.5rem] min-h-[44px] rounded-md px-2.5 py-1.5 text-[11px] font-bold border transition-colors touch-manipulation ${
                                active
                                    ? 'border-[#E6C673]/45 bg-[#E6C673]/10 text-[#E6C673]'
                                    : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/15 hover:text-white/75'
                            }`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
            <select
                ref={inputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
                aria-hidden
                tabIndex={-1}
            >
                <option value="">—</option>
                {options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                ))}
            </select>
            {error ? (
                <span className="flex items-center gap-1 text-[10px] text-amber-400/90 font-medium">
                    <AlertCircle size={10} /> {error}
                </span>
            ) : null}
        </div>
    );
}

export function PersonalLawSelector({
    value,
    onChange,
    options,
    error,
}: {
    value: string;
    onChange: (id: string) => void;
    options: ReadonlyArray<{ id: string; label: string; subtitle?: string }>;
    error?: string;
}) {
    return (
        <div className="space-y-2">
            <span className={PERSONAL_STATUS_LABEL}>القانون المطبق</span>
            <div className="flex flex-col gap-1.5">
                {options.map(({ id, label }) => {
                    const active = value === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            role="checkbox"
                            aria-checked={active}
                            onClick={() => onChange(id)}
                            className={`flex min-h-[44px] items-center gap-2 w-full rounded-lg border px-2.5 py-2 text-[10px] font-medium text-right transition-all touch-manipulation ${
                                active ? PERSONAL_STATUS_LAW_CHIP_ACTIVE : PERSONAL_STATUS_LAW_CHIP_IDLE
                            }`}
                        >
                            <span
                                className={`shrink-0 w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-colors ${
                                    active ? 'border-[#E6C673] bg-[#E6C673] text-[#0F172A]' : 'border-white/25 bg-transparent'
                                }`}
                            >
                                {active && <Check size={9} strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 flex-1 leading-tight font-bold">{label}</span>
                        </button>
                    );
                })}
            </div>
            {error ? (
                <span className="flex items-center gap-1 text-[10px] text-amber-400/90 font-medium">
                    <AlertCircle size={10} /> {error}
                </span>
            ) : null}
        </div>
    );
}

export function PersonalSectionShell({
    title,
    subtitle,
    children,
}: {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    const showHeader = Boolean(title || subtitle);
    return (
        <section className={PERSONAL_STATUS_SECTION}>
            {showHeader ? (
                <header className="mb-4">
                    {title ? <h3 className={PERSONAL_STATUS_SECTION_TITLE}>{title}</h3> : null}
                    {subtitle ? <p className="text-[10px] text-white/40 mt-1">{subtitle}</p> : null}
                </header>
            ) : null}
            {children}
        </section>
    );
}
