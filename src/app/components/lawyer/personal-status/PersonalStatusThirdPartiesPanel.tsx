import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { X } from '@/app/components/ui/icons/X';
import type { ThirdParty } from '../LawyerNewCase/types';
import { buildThirdPartyRoleLabel } from '../LawyerNewCase/clientRepresentation';
import { PersonalSectionShell } from './PersonalStatusFormPrimitives';

interface PersonalStatusThirdPartiesPanelProps {
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
        <PersonalSectionShell title="الأشخاص الثالثة">
            {thirdParties.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center mb-4">
                    <p className="text-[11px] text-white/35">لا يوجد أشخاص ثالثة بعد</p>
                </div>
            ) : (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-1 px-1 mb-4">
                    {thirdParties.map((tp) => {
                        const roleLabel = buildThirdPartyRoleLabel(tp);

                        return (
                            <div
                                key={tp.id}
                                className="snap-start shrink-0 w-[11.5rem] rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
                            >
                                <div className="flex items-start justify-between gap-1 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => onUpdate(tp.id, 'isClient', !tp.isClient)}
                                        className={`inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold border touch-manipulation ${
                                            tp.isClient
                                                ? 'border-[#E6C673]/45 bg-[#E6C673]/12 text-[#E6C673]'
                                                : 'border-white/12 text-white/40'
                                        }`}
                                    >
                                        <UserCheck size={10} /> موكل
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onRemove(tp.id)}
                                        className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-lg border border-rose-400/20 bg-rose-500/10 text-rose-300 flex items-center justify-center hover:bg-rose-500/20 transition-colors touch-manipulation"
                                        aria-label="إزالة"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                <p className="text-[10px] font-bold text-white/55 truncate">{tp.status || roleLabel}</p>
                                <p className="text-sm font-bold text-white/90 truncate mt-0.5">{tp.name}</p>
                                {tp.address ? (
                                    <p className="text-[9px] text-white/35 mt-1 line-clamp-2">{tp.address}</p>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}

            <button
                type="button"
                onClick={onAdd}
                className="w-full min-h-[44px] py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white/70 text-xs font-bold flex items-center justify-center gap-2 hover:border-[#E6C673]/25 hover:text-[#E6C673]/85 transition-colors touch-manipulation"
            >
                <Plus size={16} /> إضافة شخص ثالث
            </button>
        </PersonalSectionShell>
    );
}
