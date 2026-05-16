import React from 'react';

interface HeirToggleProps {
    label: string;
    type: string;
    isAlive: boolean;
    onToggle: (type: string) => void;
}

export const HeirToggle: React.FC<HeirToggleProps> = ({ label, type, isAlive, onToggle }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-[#1A1E2E] rounded-xl border border-white/5">
            <span className="text-white font-bold text-sm">{label}</span>
            <button type="button"
                onClick={() => onToggle(type)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isAlive ? 'bg-[#E6C673] text-black' : 'bg-white/5 text-white/50'}`}
            >
                {isAlive ? 'موجود' : 'متوفى'}
            </button>
        </div>
    );
};
