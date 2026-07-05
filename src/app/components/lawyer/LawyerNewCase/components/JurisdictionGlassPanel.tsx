import React from 'react';
import type { JurisdictionId, JurisdictionItem } from '../constants';

export interface JurisdictionGlassPanelProps {
    items: JurisdictionItem[];
    onSelect: (id: JurisdictionId) => void;
    onItemPointerEnter?: (id: JurisdictionId) => void;
}

export function JurisdictionGlassPanel({ items, onSelect, onItemPointerEnter }: JurisdictionGlassPanelProps) {
    return (
        <div
            className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-white/[0.038] backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.32)] ring-1 ring-inset ring-white/[0.05]"
            role="list"
            aria-label="اختصاص الدعوى"
        >
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/[0.08]"
                aria-hidden
            />

            {items.map((item, index) => (
                <button
                    key={item.id}
                    type="button"
                    role="listitem"
                    onClick={() => onSelect(item.id)}
                    onPointerEnter={() => onItemPointerEnter?.(item.id)}
                    onFocus={() => onItemPointerEnter?.(item.id)}
                    data-testid={`new-case-jurisdiction-${item.id}`}
                    className={`group relative w-full min-h-[5.75rem] px-7 py-6 text-right transition-[background-color] duration-200 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:bg-white/[0.07] active:bg-white/[0.08] ${
                        index < items.length - 1 ? 'border-b border-white/[0.065]' : ''
                    }`}
                >
                    <span className="relative z-[1] block text-[1.2rem] font-bold leading-relaxed text-white/[0.92] transition-colors group-hover:text-[#F4F0E8]">
                        {item.title}
                    </span>
                </button>
            ))}
        </div>
    );
}
