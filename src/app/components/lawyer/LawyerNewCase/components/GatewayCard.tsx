import React from 'react';
import type { MainGatewayItem } from '../constants';

export interface GatewayCardProps {
    item: MainGatewayItem;
    onClick: () => void;
}

export const GatewayCard = ({ item, onClick }: GatewayCardProps) => {
    const Icon = item.icon;
    return (
        <button type="button"
            onClick={onClick}
            className="p-6 rounded-2xl bg-[#1A1E2E] border border-white/5 hover:border-[#E6C673]/50 flex items-center gap-4 text-right"
        >
            <div className="w-12 h-12 rounded-full bg-black/20 flex items-center justify-center text-[#E6C673]">
                <Icon size={24} color={item.color} />
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="text-xs text-white/40">{item.subtitle}</p>
            </div>
        </button>
    );
};
