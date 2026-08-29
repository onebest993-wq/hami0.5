import React from 'react';

export function ClientSideMarker({
    active,
    onToggle,
}: {
    active: boolean;
    onToggle: (next: boolean) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onToggle(!active)}
            aria-pressed={active}
            aria-label={active ? 'إزالة علامة الموكل' : 'تعيين موكل من هذا الجانب'}
            className={[
                'inline-flex items-center gap-1.5 rounded-lg border px-3 min-h-[44px]',
                'text-[11px] font-bold touch-manipulation shrink-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25',
                active
                    ? 'border-[#E6C673]/40 bg-[#E6C673]/12 text-[#E6C673]'
                    : 'border-white/10 bg-transparent text-white/50 hover:bg-white/[0.06] hover:text-white/75',
            ].join(' ')}
        >
            <span>{active ? 'موكل' : 'موكلي'}</span>
        </button>
    );
}
