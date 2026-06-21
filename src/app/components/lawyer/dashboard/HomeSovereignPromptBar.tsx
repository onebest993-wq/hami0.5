import React, { useEffect, useId, useRef } from 'react';
import { Mic, PencilLine } from 'lucide-react';
import { motion } from 'motion/react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { HAMI_FOCUS_SOVEREIGN_PROMPT } from './sovereignPromptFocus';
export type HomeSovereignPromptBarProps = {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onVoiceClick: () => void;
    accent?: string;
    disabled?: boolean;
    className?: string;
};

export function HomeSovereignPromptBar({
    value,
    onChange,
    onSubmit,
    onVoiceClick,
    accent = '#C4A075',
    disabled = false,
    className = '',
}: HomeSovereignPromptBarProps) {
    const reduceMotion = useReduceMotion();
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const onFocusRequest = () => inputRef.current?.focus();
        window.addEventListener(HAMI_FOCUS_SOVEREIGN_PROMPT, onFocusRequest);
        return () => window.removeEventListener(HAMI_FOCUS_SOVEREIGN_PROMPT, onFocusRequest);
    }, []);

    const focusInput = () => inputRef.current?.focus();

    const handlePencilClick = () => {
        if (disabled) return;
        if (value.trim()) {
            onSubmit();
            return;
        }
        focusInput();
    };

    return (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={reduceMotion ? undefined : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`relative mx-auto w-full px-0 ${className}`.trim()}
            dir="rtl"
        >
            <div
                className="pointer-events-none absolute inset-x-6 top-3 h-16 rounded-[2rem] opacity-80 blur-xl"
                style={{
                    background: `radial-gradient(ellipse at center, color-mix(in srgb, ${accent} 42%, transparent), transparent 70%)`,
                }}
                aria-hidden
            />

            <form
                className="relative pt-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!disabled && value.trim()) onSubmit();
                }}
            >
                <button
                    type="button"
                    disabled={disabled}
                    onClick={onVoiceClick}
                    aria-label="تحدث — تسجيل صوتي"
                    className="hami-sovereign-prompt-mic absolute left-1/2 top-0 z-30 flex -translate-x-1/2 items-center justify-center rounded-full border touch-manipulation transition-transform active:scale-95 disabled:opacity-50"
                    style={{
                        background: `linear-gradient(165deg, color-mix(in srgb, ${accent} 22%, rgba(8,12,20,0.92)) 0%, rgba(4,6,12,0.95) 100%)`,
                        borderColor: `color-mix(in srgb, ${accent} 55%, transparent)`,
                        boxShadow: `0 0 28px color-mix(in srgb, ${accent} 38%, transparent), inset 0 1px 0 rgba(255,255,255,0.18)`,
                        color: accent,
                    }}
                >
                    <Mic size={22} strokeWidth={1.75} />
                </button>

                <div className="hami-sovereign-prompt-track relative flex items-center gap-2.5 rounded-[2rem] border px-4 sm:px-5 md:px-6">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={handlePencilClick}
                        aria-label={value.trim() ? 'حفظ في الملاحظات' : 'اكتب طلبك'}
                        className="shrink-0 touch-manipulation transition-opacity active:scale-95 disabled:opacity-50"
                    >
                        <PencilLine
                            size={17}
                            strokeWidth={1.75}
                            className="opacity-80"
                            style={{ color: accent }}
                            aria-hidden
                        />
                    </button>
                    <input
                        ref={inputRef}
                        id={inputId}
                        data-testid="hami-sovereign-prompt-input"
                        type="text"
                        name="nlp-task"
                        value={value}
                        disabled={disabled}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="تحدث أو اكتب طلبك..."
                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#F5F0E6]/92 placeholder:text-[#C9BCA8]/42 outline-none disabled:opacity-50"
                        style={{ direction: 'rtl' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!disabled && value.trim()) onSubmit();
                            }
                        }}
                    />
                    <span className="w-10 shrink-0" aria-hidden />
                </div>
            </form>
        </motion.div>
    );
}
