import React from 'react';
import { motion } from 'motion/react';
import { Plus, UserCheck, X } from 'lucide-react';
import type { ThirdParty } from '../LawyerNewCase/types';
import { buildThirdPartyRoleLabel } from '../LawyerNewCase/clientRepresentation';
import { PersonalSectionShell } from './PersonalStatusFormPrimitives';

export interface PersonalStatusThirdPartiesPanelProps {
    thirdParties: ThirdParty[];
    onAdd: () => void;
    onRemove: (id: number) => void;
    onUpdate: (id: number, field: keyof ThirdParty, value: string | boolean | number) => void;
}

export function PersonalStatusThirdPartiesPanel({
    thirdParties,
    onAdd,
    onRemove,
    onUpdate,
}: PersonalStatusThirdPartiesPanelProps) {
    return (
        <PersonalSectionShell title="الأشخاص الثالثة" accent="teal">
            {thirdParties.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center mb-4">
                    <p className="text-[11px] text-white/35">لا يوجد أشخاص ثالثة بعد</p>
                </div>
            ) : (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-1 px-1 mb-4">
                    {thirdParties.map((tp) => {
                        const roleLabel = buildThirdPartyRoleLabel(tp);
                        const tone =
                            tp.entryMode === 'affiliative'
                                ? tp.affiliatedSide === 1
                                    ? 'border-violet-300/30 bg-violet-500/10'
                                    : 'border-teal-300/30 bg-teal-500/10'
                                : 'border-fuchsia-300/30 bg-fuchsia-500/10';

                        return (
                            <motion.div
                                key={tp.id}
                                layout
                                className={`snap-start shrink-0 w-[11.5rem] rounded-[1.35rem] border p-3 ${tone}`}
                            >
                                <div className="flex items-start justify-between gap-1 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => onUpdate(tp.id, 'isClient', !tp.isClient)}
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold border ${
                                            tp.isClient
                                                ? 'border-teal-300/45 bg-teal-400/15 text-teal-50'
                                                : 'border-white/12 text-white/40'
                                        }`}
                                    >
                                        <UserCheck size={10} /> موكل
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onRemove(tp.id)}
                                        className="w-6 h-6 rounded-md bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                <p className="text-[10px] font-bold text-white/55 truncate">{tp.status || roleLabel}</p>
                                <p className="text-sm font-black text-white/90 truncate mt-0.5">{tp.name}</p>
                                {tp.address ? (
                                    <p className="text-[9px] text-white/35 mt-1 line-clamp-2">{tp.address}</p>
                                ) : null}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <button
                type="button"
                onClick={onAdd}
                className="w-full py-3 rounded-[1.25rem] bg-gradient-to-l from-teal-500/15 via-violet-500/10 to-fuchsia-500/10 border border-white/10 text-white/75 text-xs font-bold flex items-center justify-center gap-2 hover:border-teal-300/30 transition-all active:scale-[0.99]"
            >
                <Plus size={16} /> إضافة شخص ثالث
            </button>
        </PersonalSectionShell>
    );
}
