import React from 'react';
import { Plus, X, UserCheck } from '@/app/components/ui/lucideIcons';
import type { ThirdParty } from '../types';
import { NC_GLASS_CARD, NC_SECTION_TITLE } from '../newCaseGlassTheme';
import { buildThirdPartyRoleLabel } from '../clientRepresentation';

export interface ThirdPartiesSectionProps {
    thirdParties: ThirdParty[];
    onAdd: () => void;
    onRemove: (id: number) => void;
    onUpdate: (id: number, field: keyof ThirdParty, value: string | boolean | number) => void;
    clientError?: string;
}

function clientPillClass(tp: ThirdParty, active: boolean): string {
    const base =
        'inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold backdrop-blur-sm transition-colors duration-150 touch-manipulation cursor-pointer';
    if (!active) {
        return `${base} border-white/10 bg-white/[0.04] text-white/45 hover:border-white/16 hover:text-white/70`;
    }
    if (tp.entryMode === 'affiliative') {
        return tp.affiliatedSide === 1
            ? `${base} border-emerald-400/45 bg-emerald-500/14 text-emerald-100`
            : `${base} border-rose-400/45 bg-rose-500/14 text-rose-100`;
    }
    return `${base} border-[#E6C673]/45 bg-[#E6C673]/14 text-[#E6C673]`;
}

export const ThirdPartiesSection = ({
    thirdParties,
    onAdd,
    onRemove,
    onUpdate,
    clientError,
}: ThirdPartiesSectionProps) => {
    return (
        <div className="px-4 py-4 border-b border-white/[0.06]">
            <div className={`${NC_GLASS_CARD} p-4`}>
                <h3 className={`${NC_SECTION_TITLE} mb-3 text-base text-white/90`}>الأشخاص الثالثة</h3>

                {clientError ? (
                    <p className="text-[10px] text-amber-400/90 font-medium mb-3">{clientError}</p>
                ) : null}

                {thirdParties.length > 0 ? (
                    <div className="space-y-4 mb-4">
                        {thirdParties.map((tp) => {
                            const roleLabel = buildThirdPartyRoleLabel(tp);

                            return (
                                <div
                                    key={tp.id}
                                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1 px-1">
                                        <button
                                            type="button"
                                            onClick={() => onUpdate(tp.id, 'isClient', !tp.isClient)}
                                            title="تحديد كموكل"
                                            className={clientPillClass(tp, tp.isClient)}
                                        >
                                            <UserCheck size={12} strokeWidth={2.25} />
                                            موكل
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onRemove(tp.id)}
                                            className="w-6 h-6 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all shrink-0"
                                            title="حذف"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div className="flex justify-start w-full">
                                        <span
                                            className={`text-sm font-bold tracking-wide ${
                                                tp.entryMode === 'affiliative'
                                                    ? tp.affiliatedSide === 1
                                                        ? 'text-emerald-400/90'
                                                        : 'text-rose-400/90'
                                                    : 'text-[#E6C673]/90'
                                            }`}
                                        >
                                            {tp.status || roleLabel}
                                        </span>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-white/90 truncate">{tp.name}</p>
                                        {tp.address ? (
                                            <p className="text-[10px] text-white/40 mt-0.5 truncate">{tp.address}</p>
                                        ) : (
                                            <p className="text-[10px] text-white/45 mt-0.5">{roleLabel}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-[11px] text-white/35 mb-3">لا يوجد أشخاص ثالثة — اختصامي أو انضمامي.</p>
                )}

                <button
                    type="button"
                    data-testid="lawyer-new-case-add-third-party"
                    onClick={onAdd}
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] flex items-center justify-center gap-2 text-white/40 text-xs hover:border-[#E6C673]/35 hover:text-[#E6C673]/90 hover:bg-white/[0.04] transition-colors"
                >
                    <Plus size={14} /> <span>إضافة شخص ثالث</span>
                </button>
            </div>
        </div>
    );
};
