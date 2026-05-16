import React from 'react';
import { Plus } from 'lucide-react';
import { PartyCard } from './PartyCard';
import type { Party } from '../types';

export interface PartiesSectionProps {
    side: 1 | 2;
    parties: Party[];
    onUpdate: (side: 1 | 2, id: string, field: keyof Party, value: string | boolean) => void;
    onRemove: (side: 1 | 2, id: string) => void;
    onAdd: (side: 1 | 2) => void;
    onToggleAgent: (side: 1 | 2, id: string) => void;
    labels: { p1Main: string; p2Main: string; courtPlaceholder: string; typePlaceholder: string };
    currentStage: string;
    errorMap: Record<string, string>;
    addButtonText: string;
}

const SIDE_CONFIG = {
    1: { title: 'الطرف الأول', borderColor: 'border-l-4 border-white/20', bgColor: 'bg-[#1A1E2E]' },
    2: { title: 'الطرف الثاني', borderColor: 'border-l-4 border-white/15', bgColor: 'bg-[#151925]' }
} as const;

export const PartiesSection = ({
    side, parties, onUpdate, onRemove, onAdd, onToggleAgent,
    labels, currentStage, errorMap, addButtonText
}: PartiesSectionProps) => {
    const config = SIDE_CONFIG[side];

    return (
        <div className={config.bgColor}>
            <div className={`${config.borderColor} p-4`}>
                <h3 className="text-lg font-bold text-slate-200 mb-2">{config.title}</h3>
                <div className="space-y-4">
                    {parties.map((p, index) => (
                        <PartyCard
                            key={p.id}
                            party={p}
                            index={index}
                            side={side}
                            onUpdate={(f, v) => onUpdate(side, p.id, f, v)}
                            onRemove={() => onRemove(side, p.id)}
                            canRemove={parties.length > 1}
                            onToggleAgent={onToggleAgent}
                            labels={labels}
                            currentStage={currentStage}
                            partyCount={parties.length}
                            errorMap={errorMap}
                        />
                    ))}
                </div>
                <button type="button"
                    onClick={() => onAdd(side)}
                    className="mt-4 w-full py-2 rounded-lg border border-dashed border-white/10 flex items-center justify-center gap-2 text-white/30 text-xs hover:border-[#E6C673] hover:text-[#E6C673] transition-all"
                >
                    <Plus size={14} /> <span>{addButtonText}</span>
                </button>
            </div>
        </div>
    );
};
