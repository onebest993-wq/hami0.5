import React from 'react';
import { Plus, Users } from 'lucide-react';
import type { Party } from '../LawyerNewCase/types';
import { PersonalSectionShell } from './PersonalStatusFormPrimitives';
import { PersonalStatusPartyCard } from './PersonalStatusPartyCard';
import { getPersonalStatusRoleForSide } from './personalStatusValidation';

export interface PersonalStatusPartiesPanelProps {
    stage: string;
    parties1: Party[];
    parties2: Party[];
    onUpdate: (side: 1 | 2, id: string, field: keyof Party, value: string | boolean) => void;
    onRemove: (side: 1 | 2, id: string) => void;
    onAdd: (side: 1 | 2) => void;
    errorMap: Record<string, string>;
    clientError?: string;
}

export function PersonalStatusPartiesPanel({
    stage,
    parties1,
    parties2,
    onUpdate,
    onRemove,
    onAdd,
    errorMap,
    clientError,
}: PersonalStatusPartiesPanelProps) {
    const side1Label = getPersonalStatusRoleForSide(stage, 1, parties1.length || 1);
    const side2Label = getPersonalStatusRoleForSide(stage, 2, parties2.length || 1);
    const side1AddLabel = getPersonalStatusRoleForSide(stage, 1, 1);
    const side2AddLabel = getPersonalStatusRoleForSide(stage, 2, 1);

    return (
        <PersonalSectionShell title="أطراف الدعوى">
            {clientError ? (
                <p className="text-[10px] text-amber-400/90 font-medium mb-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2">
                    {clientError}
                </p>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-[70%] bg-gradient-to-b from-transparent via-white/15 to-transparent pointer-events-none" />

                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Users size={14} className="text-[#E6C673]/70" />
                        <span className="text-xs font-bold text-white/85">{side1Label}</span>
                    </div>
                    {parties1.map((p, i) => (
                        <PersonalStatusPartyCard
                            key={p.id}
                            party={p}
                            index={i}
                            side={1}
                            onUpdate={(f, v) => onUpdate(1, p.id, f, v)}
                            onRemove={() => onRemove(1, p.id)}
                            canRemove={parties1.length > 1}
                            errorMap={errorMap}
                        />
                    ))}
                    <button
                        type="button"
                        onClick={() => onAdd(1)}
                        className="w-full py-2.5 rounded-xl border border-dashed border-white/12 bg-white/[0.02] text-white/55 text-[11px] font-bold flex items-center justify-center gap-2 hover:border-[#E6C673]/25 hover:text-[#E6C673]/80 transition-colors touch-manipulation"
                    >
                        <Plus size={14} /> إضافة {side1AddLabel}
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Users size={14} className="text-[#E6C673]/70" />
                        <span className="text-xs font-bold text-white/85">{side2Label}</span>
                    </div>
                    {parties2.map((p, i) => (
                        <PersonalStatusPartyCard
                            key={p.id}
                            party={p}
                            index={i}
                            side={2}
                            onUpdate={(f, v) => onUpdate(2, p.id, f, v)}
                            onRemove={() => onRemove(2, p.id)}
                            canRemove={parties2.length > 1}
                            errorMap={errorMap}
                        />
                    ))}
                    <button
                        type="button"
                        onClick={() => onAdd(2)}
                        className="w-full py-2.5 rounded-xl border border-dashed border-white/12 bg-white/[0.02] text-white/55 text-[11px] font-bold flex items-center justify-center gap-2 hover:border-[#E6C673]/25 hover:text-[#E6C673]/80 transition-colors touch-manipulation"
                    >
                        <Plus size={14} /> إضافة {side2AddLabel}
                    </button>
                </div>
            </div>
        </PersonalSectionShell>
    );
}
