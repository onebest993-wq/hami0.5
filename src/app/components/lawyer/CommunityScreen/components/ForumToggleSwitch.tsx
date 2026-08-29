import React from 'react';

export function ForumToggleSwitch({ on, tone = 'gold' }: { on: boolean; tone?: 'gold' | 'amber' }) {
    const trackOn = tone === 'amber' ? 'bg-amber-400/35' : 'bg-[#E6C673]/35';
    const knobOn = tone === 'amber' ? 'bg-amber-300' : 'bg-[#E6C673]';
    return (
        <div
            className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 flex ${on ? trackOn : 'bg-white/10'}`}
            aria-hidden
        >
            <div
                className={`w-5 h-5 rounded-full transition-[margin,background-color] duration-200 ${
                    on ? `${knobOn} ms-auto` : 'bg-white/30'
                }`}
            />
        </div>
    );
}
