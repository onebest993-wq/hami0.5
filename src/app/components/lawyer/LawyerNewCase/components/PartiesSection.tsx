import React from 'react';
import { Plus } from 'lucide-react';
import { PartyCard } from './PartyCard';
import type { Party } from '../types';
import { NC_GLASS_CARD, NC_SECTION_TITLE } from '../newCaseGlassTheme';

export interface PartiesSectionProps {
    side: 1 | 2;
    parties: Party[];
    onUpdate: (side: 1 | 2, id: string, field: keyof Party, value: string | boolean) => void;
    onRemove: (side: 1 | 2, id: string) => void;
    onAdd: (side: 1 | 2) => void;
    labels: { p1Main: string; p2Main: string; courtPlaceholder: string; typePlaceholder: string };
    errorMap: Record<string, string>;
    addButtonText: string;
    clientError?: string;
}

const SIDE_TITLE = {
    1: 'الطرف الأول',
    2: 'الطرف الثاني',
} as const;

export const PartiesSection = ({
    side, parties, onUpdate, onRemove, onAdd,
    labels, errorMap, addButtonText, clientError,
}: PartiesSectionProps) => {
    return (
        <div className="px-4 py-4 border-b border-white/[0.06]">
            <div className={`${NC_GLASS_CARD} p-4`}>
                <h3 className={`${NC_SECTION_TITLE} mb-3 text-base text-white/90`}>{SIDE_TITLE[side]}</h3>
                {clientError ? (
                    <p className="text-[10px] text-amber-400/90 font-medium mb-3">{clientError}</p>
                ) : null}
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
                            labels={labels}
                            errorMap={errorMap}
                        />
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => onAdd(side)}
                    className="mt-4 w-full py-2.5 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] flex items-center justify-center gap-2 text-white/40 text-xs hover:border-[#E6C673]/35 hover:text-[#E6C673]/90 hover:bg-white/[0.04] transition-colors"
                >
                    <Plus size={14} /> <span>{addButtonText}</span>
                </button>
            </div>
        </div>
    );
};
