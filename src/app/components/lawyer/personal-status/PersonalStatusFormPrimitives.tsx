import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export type PersonalFormStep = 'identity' | 'parties';

export const PERSONAL_FORM_STEPS: ReadonlyArray<{ id: PersonalFormStep; label: string }> = [
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
    const idx = PERSONAL_FORM_STEPS.findIndex((s) => s.id === active);
    const progress = ((idx + 1) / PERSONAL_FORM_STEPS.length) * 100;

    return (
        <div className="sticky top-0 z-30 px-4 pt-3 pb-2 bg-[#0e0812]/92 backdrop-blur-xl border-b border-violet-300/10">
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-3">
                <motion.div
                    className="h-full bg-gradient-to-l from-violet-400 via-fuchsia-400 to-teal-300"
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                />
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
                {PERSONAL_FORM_STEPS.map((step, i) => {
                    const isActive = step.id === active;
                    const done = completion[step.id];
                    return (
                        <button
                            key={step.id}
                            type="button"
                            onClick={() => onChange(step.id)}
                            className={`snap-start shrink-0 min-w-[7.5rem] rounded-2xl px-3 py-2.5 text-right transition-all duration-300 border ${
                                isActive
                                    ? 'border-violet-300/40 bg-violet-500/12 shadow-[0_8px_28px_rgba(139,92,246,0.18)] scale-[1.02]'
                                    : done
                                      ? 'border-teal-300/25 bg-teal-400/8 text-teal-100/80'
                                      : 'border-white/8 bg-white/[0.03] text-white/45 hover:border-white/14'
                            }`}
                        >
                            <span className="block text-[10px] font-black tracking-wide">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="block text-xs font-bold mt-0.5">{step.label}</span>
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
    const filled = value.trim().length > 0;
    return (
        <label className="group block relative">
            <span
                className={`absolute right-3 transition-all duration-200 pointer-events-none font-bold ${
                    filled || placeholder
                        ? '-top-2 text-[9px] text-violet-200/75 bg-[#120a18] px-1.5 rounded'
                        : 'top-3 text-[11px] text-white/35'
                }`}
            >
                {label}
            </span>
            <input
                ref={inputRef}
                type="text"
                inputMode={inputMode}
                dir={dir}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full rounded-[1.35rem] border-b-2 border-t border-x border-white/8 bg-[#16101f]/70 px-4 pt-5 pb-3 text-sm text-white outline-none transition-all
                    focus:border-violet-300/50 focus:bg-[#1a1228]/90 focus:shadow-[inset_0_-2px_0_0_rgba(167,139,250,0.55)]
                    ${mono ? 'font-mono tracking-wide' : ''}
                    ${error ? 'border-amber-400/50' : ''}`}
            />
            {error ? (
                <span className="flex items-center gap-1 text-[10px] text-amber-400/90 mt-1.5 font-medium">
                    <AlertCircle size={10} /> {error}
                </span>
            ) : null}
        </label>
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
    const scrollBy = (dir: -1 | 1) => {
        scrollRef.current?.scrollBy({ left: dir * 140, behavior: 'smooth' });
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black text-violet-200/80 tracking-wider">المرحلة الحالية</span>
                <div className="flex gap-1">
                    <button type="button" onClick={() => scrollBy(1)} className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/50 hover:text-white/80">
                        <ChevronRight size={14} />
                    </button>
                    <button type="button" onClick={() => scrollBy(-1)} className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/50 hover:text-white/80">
                        <ChevronLeft size={14} />
                    </button>
                </div>
            </div>
            <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1">
                {options.map((opt) => {
                    const active = value === opt;
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onChange(opt)}
                            className={`snap-start shrink-0 max-w-[11rem] rounded-full px-4 py-2.5 text-[11px] font-bold border transition-all duration-250 ${
                                active
                                    ? 'border-fuchsia-300/50 bg-gradient-to-l from-fuchsia-500/20 to-violet-500/15 text-fuchsia-50 shadow-[0_0_20px_rgba(217,70,239,0.15)]'
                                    : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-violet-200/25 hover:text-white/75'
                            }`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
            <select ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} className="sr-only" aria-hidden tabIndex={-1}>
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
    options: ReadonlyArray<{ id: string; label: string; subtitle: string }>;
    error?: string;
}) {
    return (
        <div className="space-y-2">
            <span className="text-[10px] font-black text-teal-200/80 tracking-wider block">القانون المطبق</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map(({ id, label, subtitle }) => {
                    const active = value === id;
                    return (
                        <motion.button
                            key={id}
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onChange(id)}
                            className={`relative overflow-hidden rounded-[1.6rem] p-4 text-right border min-h-[5.5rem] transition-colors ${
                                active
                                    ? 'border-teal-300/45 bg-gradient-to-br from-teal-500/14 via-[#14101c] to-violet-500/10'
                                    : 'border-white/10 bg-[#14101c]/80 hover:border-teal-200/20'
                            }`}
                        >
                            <div className={`absolute top-0 left-0 w-full h-0.5 ${active ? 'bg-gradient-to-l from-teal-300 to-violet-400' : 'bg-white/5'}`} />
                            <span className={`text-xs font-black leading-snug block ${active ? 'text-teal-50' : 'text-white/70'}`}>{label}</span>
                            <span className="text-[9px] text-white/40 mt-1.5 block">{subtitle}</span>
                            {active ? (
                                <span className="absolute top-3 left-3 w-2 h-2 rounded-full bg-teal-300 shadow-[0_0_10px_rgba(94,234,212,0.8)]" />
                            ) : null}
                        </motion.button>
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
    accent = 'violet',
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    accent?: 'violet' | 'teal' | 'fuchsia';
}) {
    const accentBar =
        accent === 'teal'
            ? 'from-teal-400/80 to-emerald-300/40'
            : accent === 'fuchsia'
              ? 'from-fuchsia-400/80 to-violet-300/40'
              : 'from-violet-400/80 to-fuchsia-300/40';

    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative mx-4 mb-4 rounded-[2rem] border border-white/[0.07] bg-[#120a18]/75 backdrop-blur-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
        >
            <div className={`h-1 bg-gradient-to-l ${accentBar}`} />
            <div className="p-5 pt-4">
                <header className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-base font-black text-white/95">{title}</h3>
                        {subtitle ? <p className="text-[10px] text-white/40 mt-1">{subtitle}</p> : null}
                    </div>
                    <div className="w-9 h-9 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center rotate-12 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-300/60 to-teal-300/40" />
                    </div>
                </header>
                {children}
            </div>
        </motion.section>
    );
}
