import React from 'react';
import { Pencil } from 'lucide-react';
import { getDynamicPartyLabels, ordinalOf } from '../utils/partyLabels';

export type PartyCardItemProps = {
    party: Record<string, unknown>;
    type: 'party1' | 'party2';
    index: number;
    procedureType: string;
    totalCount: number;
    onEdit: (payload: { type: 'party1' | 'party2'; index: number; party: Record<string, unknown> }) => void;
    readOnly: boolean;
};

export function PartyCardItem({ party, type, index, procedureType, totalCount, onEdit, readOnly }: PartyCardItemProps) {
    const labels = getDynamicPartyLabels(procedureType);
    const titleBase = type === 'party1' ? labels.party1 : labels.party2;
    const showOrdinal = totalCount > 1;
    const title = showOrdinal ? `${titleBase} ${ordinalOf(index)}` : titleBase;
    const nameText = String(party?.name ?? '').trim() || '—';

    return (
        <div className="group flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0A0F1C]/50 px-3 py-2 min-h-[44px]">
            <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-white/40 leading-tight">{title}</div>
                <div className="flex items-center gap-2 mt-0.5 min-w-0">
                    <span className="text-sm font-bold text-white/90 truncate">{nameText}</span>
                    {!!party?.isRepresented && (
                        <span className="shrink-0 text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded-full">
                            موكلي
                        </span>
                    )}
                </div>
            </div>
            {!readOnly && (
                <button
                    type="button"
                    onClick={() => onEdit({ type, index, party })}
                    className="shrink-0 w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors touch-manipulation"
                    aria-label="تعديل"
                >
                    <Pencil size={14} />
                </button>
            )}
        </div>
    );
}
