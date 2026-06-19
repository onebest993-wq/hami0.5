import React from 'react';
import { X, MapPin, UserCheck } from 'lucide-react';
import { hasBlockedWord } from '../utils';
import type { PartyCardProps } from '../types';
import { ncFieldClass } from '../newCaseGlassTheme';

export const PartyCard = ({
    party, index, side, onUpdate, onRemove, canRemove,
    labels, errorMap,
}: PartyCardProps) => {
    const isFirst = index === 0;
    const positionErrorKey = isFirst ? (side === 1 ? 'party1_position' : 'party2_position') : null;
    const positionError = positionErrorKey ? errorMap[positionErrorKey] : null;
    const hasError = errorMap[`party_${party.id}`];
    const isClient = Boolean(party.isClient);

    const pillClass = (active: boolean) =>
        [
            'inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5',
            'text-[11px] font-bold backdrop-blur-sm transition-colors duration-150 touch-manipulation cursor-pointer',
            active
                ? side === 1
                    ? 'border-emerald-400/45 bg-emerald-500/14 text-emerald-100'
                    : 'border-rose-400/45 bg-rose-500/14 text-rose-100'
                : 'border-white/10 bg-white/[0.04] text-white/45 hover:border-white/16 hover:text-white/70',
        ].join(' ');

    return (
        <div className={`relative ${!isFirst ? 'mt-4 pl-4 border-l-2 border-white/5' : ''}`} id={`party-${party.id}`}>
            <div className="flex items-center justify-between gap-2 mb-3 px-1">
                <button
                    type="button"
                    onClick={() => onUpdate('isClient', !isClient)}
                    title="تحديد كموكل"
                    className={pillClass(isClient)}
                >
                    <UserCheck size={12} strokeWidth={2.25} />
                    موكل
                </button>
                {canRemove ? (
                    <button type="button" onClick={onRemove} className="w-6 h-6 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all shrink-0" title="حذف هذا الطرف">
                        <X size={14} />
                    </button>
                ) : null}
            </div>
            <div className="space-y-3">
                {isFirst ? (
                    <div className="flex justify-start w-full mb-2 mt-1">
                        <span className={`text-lg font-bold tracking-wide ${side === 1 ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
                            {party.status}
                        </span>
                    </div>
                ) : null}

                <div className="relative w-full">
                    <input
                        type="text"
                        value={party.name}
                        onChange={(e) => onUpdate('name', e.target.value)}
                        className={`${ncFieldClass(Boolean(hasError) || hasBlockedWord(party.name))} text-base font-medium`}
                        placeholder="الاسم الكامل"
                    />
                </div>
                {hasBlockedWord(party.name) ? (
                    <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة</p>
                ) : null}
                {positionError ? <p className="text-amber-400/90 text-[10px] font-medium">{positionError}</p> : null}

                <div className="relative group">
                    <MapPin size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-[#E6C673] z-10" />
                    <input
                        type="text"
                        value={party.address}
                        onChange={(e) => onUpdate('address', e.target.value)}
                        className={`${ncFieldClass()} pr-8 pl-3 text-xs`}
                        placeholder="العنوان السكني"
                    />
                </div>
            </div>
        </div>
    );
};
