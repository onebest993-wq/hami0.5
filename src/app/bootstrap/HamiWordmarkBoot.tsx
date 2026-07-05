import React from 'react';

const WORDMARK = 'حامي';

export type HamiWordmarkBootPhase = 'enter' | 'idle' | 'exit';

type HamiWordmarkBootProps = {
    phase?: HamiWordmarkBootPhase;
    className?: string;
};

/**
 * كلمة «حامي» — شعار إقلاع مزخرف (CSS-only، بدون motion chunk).
 */
export function HamiWordmarkBoot({
    phase = 'enter',
    className = '',
}: HamiWordmarkBootProps): React.ReactElement {
    return (
        <div
            className={`hami-boot-wordmark-stage hami-boot-wordmark-stage--${phase} ${className}`.trim()}
            data-testid="hami-wordmark-boot"
            aria-hidden
        >
            <div className="hami-boot-wordmark-glow" aria-hidden />
            <div className="hami-boot-wordmark-ornament hami-boot-wordmark-ornament--top" aria-hidden />
            <h1 className="hami-boot-wordmark" aria-label="حامي">
                {WORDMARK.split('').map((char, index) => (
                    <span
                        key={`${char}-${index}`}
                        className="hami-boot-wordmark-char"
                        style={{ '--char-i': index } as React.CSSProperties}
                    >
                        {char}
                    </span>
                ))}
            </h1>
            <div className="hami-boot-wordmark-ornament hami-boot-wordmark-ornament--bottom" aria-hidden />
            <div className="hami-boot-wordmark-shimmer" aria-hidden />
        </div>
    );
}
