import React from 'react';
import { Minus, Plus } from '@/app/components/ui/lucideIcons';

interface HeirCounterProps {
    label: string;
    type: string;
    count: number;
    onUpdate: (type: string, delta: number) => void;
}

export const HeirCounter: React.FC<HeirCounterProps> = ({ label, type, count, onUpdate }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-[#1A1E2E] rounded-xl border border-white/5">
            <span className="text-white font-bold text-sm">{label}</span>
            <div className="flex items-center gap-3">
                <button type="button"
                    onClick={() => onUpdate(type, -1)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${count > 0 ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/5 text-white/20'}`}
                >
                    <Minus size={16} />
                </button>
                <span className="w-4 text-center text-white font-mono text-lg">{count}</span>
                <button type="button"
                    onClick={() => onUpdate(type, 1)}
                    className="w-8 h-8 rounded-lg bg-[#E6C673]/20 text-[#E6C673] flex items-center justify-center hover:bg-[#E6C673]/30 transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>
        </div>
    );
};
