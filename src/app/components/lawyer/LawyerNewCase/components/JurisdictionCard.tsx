import React from 'react';
import type { JurisdictionItem } from '../constants';

export interface JurisdictionCardProps {
    item: JurisdictionItem;
    onClick: () => void;
}

export const JurisdictionCard = ({ item, onClick }: JurisdictionCardProps) => {
    const Icon = item.icon;
    return (
        <button type="button"
            onClick={onClick}
            className="h-28 rounded-xl bg-[#1A1E2E] border border-white/5 hover:border-[#E6C673] flex flex-col items-center justify-center gap-2"
        >
            <Icon size={24} color={item.color} />
            <span className="text-sm font-bold text-white">{item.title}</span>
        </button>
    );
};
