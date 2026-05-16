import React, { useState } from 'react';
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
    const [isExpanded, setIsExpanded] = useState(false);
    const labels = getDynamicPartyLabels(procedureType);
    const titleBase = type === 'party1' ? labels.party1 : labels.party2;
    const showOrdinal = totalCount > 1;
    const title = showOrdinal ? `${titleBase} ${ordinalOf(index)}` : titleBase;

    const governorate = String(party?.governorate ?? party?.province ?? '').trim();
    const area = String(party?.area ?? party?.district ?? party?.region ?? '').trim();
    const addressRaw = String(party?.address ?? '').trim();
    const locationText =
        (governorate || area ? [governorate, area].filter(Boolean).join(' / ') : '') || addressRaw || '—';

    const typeRaw = String(party?.type ?? '').trim();
    const partyTypeText = typeRaw === 'company' ? 'شركة' : typeRaw === 'person' ? 'طبيعي' : '—';

    const nameText = String(party?.name ?? '').trim() || '—';
    const phoneText = String(party?.phone ?? '').trim() || '—';
    const shellClass =
        type === 'party1' ? 'bg-slate-800/80 border border-cyan-500/25' : 'bg-slate-800/80 border border-rose-500/20';
    const headerClass = type === 'party1' ? 'text-cyan-100' : 'text-rose-100';

    return (
        <div className={`group relative flex flex-col rounded-xl p-4 ${shellClass}`}>
            {!readOnly && (
                <button
                    type="button"
                    onClick={() => onEdit({ type, index, party })}
                    className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white flex items-center justify-center"
                >
                    <Pencil size={14} />
                </button>
            )}
            <div className={`text-lg font-bold line-clamp-2 pe-10 ${headerClass}`}>{title}</div>

            <div className="flex items-center justify-between gap-2 mt-2">
                <div className="text-slate-100 text-sm font-semibold truncate">{nameText}</div>
                {!!party?.isRepresented && (
                    <span className="shrink-0 text-[11px] bg-amber-500/15 border border-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full">
                        موكلي
                    </span>
                )}
            </div>

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                        <div className="inline-flex items-center gap-2 text-slate-400 text-xs font-semibold">
                            <span>العنوان</span>
                        </div>
                        <div className="text-slate-200 text-sm font-semibold text-left break-words">{locationText}</div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="inline-flex items-center gap-2 text-slate-400 text-xs font-semibold">
                            <span>الصفة</span>
                        </div>
                        <div className="text-slate-200 text-sm font-semibold text-left">{partyTypeText}</div>
                    </div>

                    {type === 'party1' && (
                        <div className="flex items-center justify-between gap-4">
                            <div className="inline-flex items-center gap-2 text-slate-400 text-xs font-semibold">
                                <span>الهاتف</span>
                            </div>
                            <span dir="ltr" className="inline-block text-left font-mono text-slate-200 text-sm font-semibold">
                                {phoneText}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-4 w-full py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/60 text-slate-200 text-sm font-semibold flex justify-center items-center gap-2 transition-colors"
            >
                {isExpanded ? '▲ إخفاء التفاصيل' : '▼ عرض التفاصيل'}
            </button>
        </div>
    );
}
