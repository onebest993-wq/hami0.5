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
            className="relative overflow-hidden rounded-2xl border border-[#E6C673]/16 bg-[#0C1220]/92 shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
            role="list"
            aria-label="اختصاص الدعوى"
        >
            {items.map((item, index) => (
                <button
                    key={item.id}
                    type="button"
                    role="listitem"
                    onClick={() => onSelect(item.id)}
                    onPointerEnter={() => onItemPointerEnter?.(item.id)}
                    onFocus={() => onItemPointerEnter?.(item.id)}
                    data-testid={`new-case-jurisdiction-${item.id}`}
                    className={`group relative w-full min-h-[4.75rem] px-5 py-4 text-right transition-colors duration-200 hover:bg-white/[0.045] focus-visible:outline-none focus-visible:bg-white/[0.06] active:bg-white/[0.07] touch-manipulation ${
                        index < items.length - 1 ? 'border-b border-white/[0.06]' : ''
                    }`}
                >
                    <span className="relative z-[1] block text-[1.05rem] font-bold leading-relaxed text-white/[0.92] transition-colors group-hover:text-[#F4F0E8]">
                        {item.title}
                    </span>
                </button>
            ))}
        </div>
    );
}
