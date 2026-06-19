import React from 'react';
import type { MainGatewayItem } from '../constants';

export interface GatewayCardProps {
    item: MainGatewayItem;
    onClick: () => void;
}

export const GatewayCard = ({ item, onClick }: GatewayCardProps) => {
    const Icon = item.icon;
    return (
        <button
            type="button"
            onClick={onClick}
            className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#E6C673]/25 hover:bg-white/[0.06] flex items-center gap-4 text-right transition-colors"
        >
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#E6C673]">
                <Icon size={24} color={item.color} />
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-bold text-white/95">{item.title}</h3>
                <p className="text-xs text-white/40">{item.subtitle}</p>
            </div>
        </button>
    );
};
