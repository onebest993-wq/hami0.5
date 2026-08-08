import React, { useState } from 'react';
import { ChevronDown, MapPin, UserCheck, X } from '@/app/components/ui/lucideIcons';
import { hasBlockedWord } from '../LawyerNewCase/utils';
import type { Party } from '../LawyerNewCase/types';
import { personalFieldClass } from './personalStatusVisualTheme';

export function PersonalStatusPartyCard({
    party,
    index,
    side: _side,
    onUpdate,
    onRemove,
    canRemove,
    errorMap,
}: {
    party: Party;
    index: number;
    side: 1 | 2;
    onUpdate: (field: keyof Party, value: string | boolean) => void;
    onRemove: () => void;
    canRemove: boolean;
    errorMap: Record<string, string>;
}) {
    const [expanded, setExpanded] = useState(index === 0);
    const isFirst = index === 0;
    const hasError = errorMap[`party_${party.id}`];

    return (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 text-right touch-manipulation"
            >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/20">
                    {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                    {isFirst ? <span className="text-[10px] font-bold text-white/45 block">{party.status}</span> : null}
                    <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-white/90 truncate">
                            {party.name || '— اسم غير مُدخل —'}
                        </span>
                        {party.isClient ? (
                            <span className="shrink-0 inline-flex items-center gap-0.5 rounded-md border border-[#E6C673]/45 bg-[#E6C673]/12 px-1.5 py-px text-[9px] font-extrabold text-[#E6C673]">
                                <UserCheck size={10} aria-hidden />
                                موكل
                            </span>
                        ) : null}
                    </span>
                </div>
                <span className={`text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                    <ChevronDown size={16} />
                </span>
            </button>

            {expanded ? (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => onUpdate('isClient', !party.isClient)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold border transition-colors touch-manipulation ${
                                party.isClient
                                    ? 'border-[#E6C673]/45 bg-[#E6C673]/12 text-[#E6C673]'
                                    : 'border-white/12 bg-white/[0.03] text-white/45'
                            }`}
                        >
                            <UserCheck size={11} /> {party.isClient ? 'موكل' : 'تعيين كموكل'}
                        </button>
                        {canRemove ? (
                            <button
                                type="button"
                                onClick={onRemove}
                                className="min-h-[2.75rem] min-w-[2.75rem] rounded-lg border border-rose-400/20 bg-rose-500/10 text-rose-300 flex items-center justify-center hover:bg-rose-500/20 transition-colors touch-manipulation"
                                aria-label="إزالة الطرف"
                            >
                                <X size={14} />
                            </button>
                        ) : null}
                    </div>

                    <input
                        type="text"
                        value={party.name}
                        onChange={(e) => onUpdate('name', e.target.value)}
                        className={personalFieldClass(Boolean(hasError) || hasBlockedWord(party.name))}
                        placeholder="الاسم الكامل"
                    />
                    {hasBlockedWord(party.name) ? (
                        <p className="text-amber-400/90 text-[10px]">ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة</p>
                    ) : null}

                    <div className="relative">
                        <MapPin size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
                        <input
                            type="text"
                            value={party.address}
                            onChange={(e) => onUpdate('address', e.target.value)}
                            className={`${personalFieldClass()} pr-9 text-xs`}
                            placeholder="العنوان (اختياري)"
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
