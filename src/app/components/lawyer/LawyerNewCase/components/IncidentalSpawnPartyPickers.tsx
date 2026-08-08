import React from 'react';
import type { Party } from '../types';

type PickerBlockProps = {
    title: string;
    hint: string;
    candidates: Party[];
    selectedId: string | null;
    onSelect: (partyId: string) => void;
    error?: string;
};

function PickerBlock({ title, hint, candidates, selectedId, onSelect, error }: PickerBlockProps) {
    return (
        <div className="px-4 py-4 border-b border-[#E6C673]/12 bg-[#E6C673]/[0.04]">
            <p className="text-[11px] font-bold text-[#E6C673] mb-2">{title}</p>
            <p className="text-[10px] text-white/45 mb-3 leading-relaxed">{hint}</p>
            <div className="space-y-2">
                {candidates.map((party) => {
                    const active = selectedId === party.id;
                    return (
                        <button
                            key={party.id}
                            type="button"
                            onClick={() => onSelect(party.id)}
                            className={`w-full text-right rounded-xl border px-3 py-2.5 transition-colors ${
                                active
                                    ? 'border-[#E6C673]/40 bg-[#E6C673]/12 text-[#F4E9CD]'
                                    : 'border-white/[0.08] bg-white/[0.03] text-white/80 hover:border-[#E6C673]/22'
                            }`}
                        >
                            <span className="text-sm font-bold">{party.name || '—'}</span>
                            {party.status ? (
                                <span className="block text-[10px] text-white/40 mt-0.5">{party.status}</span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
            {error ? <p className="text-amber-500/90 text-[10px] mt-2 font-bold">{error}</p> : null}
        </div>
    );
}

type IncidentalSpawnPartyPickersProps = {
    spawnType: 'joined' | 'counter';
    filingCandidates: Party[];
    opposingCandidates: Party[];
    filingPartyId: string | null;
    opposingPartyId: string | null;
    onFilingPartySelect: (partyId: string) => void;
    onOpposingPartySelect: (partyId: string) => void;
    filingPartyError?: string;
    opposingPartyError?: string;
};

export function IncidentalSpawnPartyPickers({
    spawnType,
    filingCandidates,
    opposingCandidates,
    filingPartyId,
    opposingPartyId,
    onFilingPartySelect,
    onOpposingPartySelect,
    filingPartyError,
    opposingPartyError,
}: IncidentalSpawnPartyPickersProps) {
    const showFiling = filingCandidates.length > 1;
    const showOpposing = opposingCandidates.length > 1;

    if (!showFiling && !showOpposing) return null;

    const filingCopy =
        spawnType === 'joined'
            ? {
                  title: 'مقدّم الدعوى المنضمة',
                  hint: 'الدعوى المنضمة يقيمها المدعي — حدّد أي مدعٍ يقدّمها في هذه الإضبارة.',
              }
            : {
                  title: 'مقدّم الدعوى المتقابلة',
                  hint: 'الدعوى المتقابلة يقيمها المدعى عليه — حدّد أي مدعى عليه يقدّمها في هذه الإضبارة.',
              };

    const opposingCopy =
        spawnType === 'joined'
            ? {
                  title: 'المدعى عليه في الدعوى المنضمة',
                  hint: 'حدّد ضد أي مدعى عليه تُقام الدعوى المنضمة.',
              }
            : {
                  title: 'المدعي في الدعوى المتقابلة',
                  hint: 'حدّد ضد أي مدعٍ تُقام الدعوى المتقابلة.',
              };

    return (
        <>
            {showFiling ? (
                <PickerBlock
                    title={filingCopy.title}
                    hint={filingCopy.hint}
                    candidates={filingCandidates}
                    selectedId={filingPartyId}
                    onSelect={onFilingPartySelect}
                    error={filingPartyError}
                />
            ) : null}
            {showOpposing ? (
                <PickerBlock
                    title={opposingCopy.title}
                    hint={opposingCopy.hint}
                    candidates={opposingCandidates}
                    selectedId={opposingPartyId}
                    onSelect={onOpposingPartySelect}
                    error={opposingPartyError}
                />
            ) : null}
        </>
    );
}
