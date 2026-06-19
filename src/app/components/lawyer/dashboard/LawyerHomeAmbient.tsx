import React from 'react';

/** طبقة جوّية خفيفة — لا تحجب خلفية الإعدادات (اللون + الزخرفة) */
export function LawyerHomeAmbient() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
                className="hami-sovereign-aurora absolute -top-[30%] left-1/2 -translate-x-1/2 w-[140%] h-[70%] opacity-50"
                style={{
                    background:
                        'radial-gradient(ellipse 50% 60% at 50% 40%, color-mix(in srgb, var(--hami-primary, #E6C673) 14%, transparent) 0%, color-mix(in srgb, var(--hami-primary, #E6C673) 4%, transparent) 45%, transparent 70%)',
                }}
            />
            <div
                className="absolute bottom-0 inset-x-0 h-[32%]"
                style={{
                    background:
                        'linear-gradient(to top, color-mix(in srgb, var(--hami-surface-bg, #0B1021) 90%, transparent) 0%, transparent 100%)',
                }}
            />
            <div className="hami-sovereign-grain absolute inset-0 opacity-20" />
            <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                    background:
                        'linear-gradient(to left, transparent, color-mix(in srgb, var(--hami-primary, #E6C673) 24%, transparent), transparent)',
                }}
            />
        </div>
    );
}
