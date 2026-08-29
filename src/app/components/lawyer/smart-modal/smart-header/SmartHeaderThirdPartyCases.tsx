import React from 'react';
import type { IncidentalCase } from '../../LawyerShared';
import { PARTY_STRIP_SHELL } from './smartHeaderPresentation';
import { PartyChip } from './PartyChip';

export function SmartHeaderEntryDecisionActions({
    caseItem,
    isReadOnly,
    onUpdateIncidentalEntryDecision,
}: {
    caseItem: IncidentalCase;
    isReadOnly: boolean;
    onUpdateIncidentalEntryDecision?: (id: string, decision: 'accepted' | 'rejected') => void;
}) {
    if (isReadOnly || !onUpdateIncidentalEntryDecision) return null;
    if (caseItem.entryDecision && caseItem.entryDecision !== 'pending') {
        return (
            <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                    caseItem.entryDecision === 'accepted'
                        ? 'bg-green-500/15 text-green-400 border-green-500/30'
                        : 'bg-red-500/15 text-red-300 border-red-500/30'
                }`}
            >
                {caseItem.entryDecision === 'accepted' ? 'تم قبول الدخول' : 'تم رفض الدخول'}
            </span>
        );
    }
    return (
        <div className="flex gap-2 shrink-0">
            <button
                type="button"
                onClick={() => onUpdateIncidentalEntryDecision(caseItem.id, 'accepted')}
                className="px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg text-[10px] font-bold hover:bg-green-500/20 transition-colors"
            >
                قبول الدخول
            </button>
            <button
                type="button"
                onClick={() => onUpdateIncidentalEntryDecision(caseItem.id, 'rejected')}
                className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold hover:bg-red-500/20 transition-colors"
            >
                رفض الدخول
            </button>
        </div>
    );
}

export function SmartHeaderThirdPartyCases({
    affiliativeThirdParties,
    selfClaimThirdParties,
    activeThirdPartyCasesLength,
    thirdParties,
    interpleadersLength,
    plaintiffsLength,
    defendantsLength,
    isReadOnly,
    onUpdateIncidentalEntryDecision,
}: {
    affiliativeThirdParties: IncidentalCase[];
    selfClaimThirdParties: IncidentalCase[];
    activeThirdPartyCasesLength: number;
    thirdParties?: Array<{ name?: string; role?: string; roleLabel?: string }>;
    interpleadersLength: number;
    plaintiffsLength: number;
    defendantsLength: number;
    isReadOnly: boolean;
    onUpdateIncidentalEntryDecision?: (id: string, decision: 'accepted' | 'rejected') => void;
}) {
    return (
        <>
            {activeThirdPartyCasesLength > 0 ? (
                <div className="w-full mt-2 border-t border-white/[0.05] pt-2 space-y-1.5" dir="rtl">
                    {affiliativeThirdParties.map((c) => (
                        <div
                            key={c.id}
                            className={`${PARTY_STRIP_SHELL} px-2.5 py-2`}
                        >
                            <div className="flex items-center justify-between gap-2 min-w-0">
                                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                    <span className="shrink-0 rounded-md px-1 py-px text-[7px] font-black bg-indigo-500/22 text-indigo-200 border border-indigo-400/25">
                                        انضمام
                                    </span>
                                    <span className="text-[11px] font-bold text-white/85 truncate">{c.partyName}</span>
                                    <span className="text-white/20 shrink-0 text-[10px]">←</span>
                                    <span className="text-[10px] text-white/45 truncate">{c.affiliationPartyName || '—'}</span>
                                </div>
                                <SmartHeaderEntryDecisionActions
                                    caseItem={c}
                                    isReadOnly={isReadOnly}
                                    onUpdateIncidentalEntryDecision={onUpdateIncidentalEntryDecision}
                                />
                            </div>
                        </div>
                    ))}

                    {selfClaimThirdParties.map((c) => (
                        <div
                            key={c.id}
                            className={`${PARTY_STRIP_SHELL} px-2.5 py-2 flex items-center justify-between gap-2`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="shrink-0 rounded-md px-1 py-px text-[7px] font-black bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/28">
                                    اختصام
                                </span>
                                <span className="text-[11px] font-bold text-white/90 truncate">{c.partyName}</span>
                            </div>
                            <SmartHeaderEntryDecisionActions
                                caseItem={c}
                                isReadOnly={isReadOnly}
                                onUpdateIncidentalEntryDecision={onUpdateIncidentalEntryDecision}
                            />
                        </div>
                    ))}
                </div>
            ) : null}

            {thirdParties && thirdParties.length > 0 && interpleadersLength === 0 && plaintiffsLength === 0 && defendantsLength === 0 ? (
                <div className="w-full mt-2 border-t border-white/[0.05] pt-2">
                    <div className="flex flex-wrap gap-1.5">
                        {thirdParties.map((party, index) => (
                            <PartyChip
                                key={index}
                                party={party}
                                accent="gold"
                            />
                        ))}
                    </div>
                </div>
            ) : null}
        </>
    );
}
