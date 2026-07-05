import React from 'react';
import { Check } from 'lucide-react';

export type TaskRingToggleProps = {
    checked: boolean;
    onToggle: () => void;
    disabled?: boolean;
    label: string;
    tone?: 'emerald' | 'violet' | 'sky';
    size?: 'sm' | 'md';
};

const TONE_CLASS = {
    emerald: {
        idle: 'border-[#1A7059]/55 text-transparent hover:border-[#1A7059]/80',
        done: 'border-[#6BC4A8] bg-[#1A7059]/35 text-[#E8F5F0]',
    },
    violet: {
        idle: 'border-violet-400/45 text-transparent hover:border-violet-400/70',
        done: 'border-violet-300/80 bg-violet-500/25 text-violet-100',
    },
    sky: {
        idle: 'border-sky-400/45 text-transparent hover:border-sky-400/70',
        done: 'border-sky-300/80 bg-sky-500/20 text-sky-100',
    },
} as const;

export function TaskRingToggle({
    checked,
    onToggle,
    disabled = false,
    label,
    tone = 'emerald',
    size = 'md',
}: TaskRingToggleProps) {
    const dim = size === 'sm' ? 'size-6' : 'size-7';
    const icon = size === 'sm' ? 'size-3' : 'size-3.5';
    const toneClass = TONE_CLASS[tone][checked ? 'done' : 'idle'];

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={onToggle}
            className={`${dim} shrink-0 inline-flex items-center justify-center rounded-full border-2 transition-all duration-200 touch-manipulation disabled:opacity-40 ${toneClass}`}
        >
            {checked ? <Check className={icon} strokeWidth={2.5} aria-hidden /> : null}
        </button>
    );
}
