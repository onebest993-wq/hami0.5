import React, { memo } from 'react';

export function formatHubSparkAttentionBadge(count: number): string {
    if (count <= 0) return '';
    return count > 99 ? '99+' : String(count);
}

export function shouldShowHubSparkAttentionBadge(count?: number): boolean {
    return typeof count === 'number' && count > 0;
}

const GLASS_BADGE_BASE =
    'absolute z-[4] pointer-events-none backdrop-blur-md border border-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]';

export const HubSparkAttentionBadge = memo(function HubSparkAttentionBadge({
    count,
    variant = 'count',
}: {
    count?: number;
    variant?: 'count' | 'dot';
}) {
    if (!shouldShowHubSparkAttentionBadge(count)) return null;

    if (variant === 'dot') {
        return (
            <span
                className={`${GLASS_BADGE_BASE} top-2 left-2.5 rounded-full bg-white/12 ring-1 ring-white/10`}
                style={{
                    width: `calc(9px * var(--hami-content-scale, 1))`,
                    height: `calc(9px * var(--hami-content-scale, 1))`,
                    boxShadow:
                        '0 0 12px rgba(140, 190, 255, 0.35), inset 0 1px 0 rgba(255,255,255,0.35)',
                }}
                aria-hidden
                data-testid="hub-spark-attention-dot"
            />
        );
    }

    return (
        <span
            className={`${GLASS_BADGE_BASE} top-2 left-2 min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full bg-gradient-to-br from-white/22 via-white/10 to-white/5 text-[10px] font-bold tabular-nums text-white/95`}
            style={{
                boxShadow:
                    '0 4px 16px rgba(0,0,0,0.4), 0 0 14px rgba(120, 175, 255, 0.22), inset 0 1px 0 rgba(255,255,255,0.35)',
            }}
            aria-hidden
            data-testid="hub-spark-attention-badge"
            data-hub-spark-count={formatHubSparkAttentionBadge(count!)}
        >
            {formatHubSparkAttentionBadge(count!)}
        </span>
    );
});
