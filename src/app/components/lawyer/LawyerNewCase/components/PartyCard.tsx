import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import { hasBlockedWord } from '../utils';
import type { PartyCardProps } from '../types';
import { ncFieldClass } from '../newCaseGlassTheme';

export const PartyCard = ({
    party, index, side, onUpdate, onRemove, canRemove,
    errorMap,
    lockNames = false,
}: PartyCardProps & { lockNames?: boolean }) => {
    const isFirst = index === 0;
    const positionErrorKey = isFirst ? (side === 1 ? 'party1_position' : 'party2_position') : null;
    const positionError = positionErrorKey ? errorMap[positionErrorKey] : null;
    const hasError = errorMap[`party_${party.id}`];
    const isClient = Boolean(party.isClient);

    return (
        <div className={`relative ${!isFirst ? 'mt-4 pl-4 border-l-2 border-white/5' : ''}`} id={`party-${party.id}`}>
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                        {isFirst ? (
                            <span className={`text-base font-bold tracking-wide ${side === 1 ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
                                {party.status}
                            </span>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => onUpdate('isClient', !isClient)}
                            title="تحديد كموكل"
                            aria-pressed={isClient}
                            data-testid="lawyer-new-case-mark-client"
                            className={`inline-flex shrink-0 items-center justify-center rounded-lg border px-2 min-h-[44px] min-w-[44px] text-[10px] font-bold transition-colors touch-manipulation ${
                                isClient
                                    ? side === 1
                                        ? 'border-emerald-400/45 bg-emerald-500/14 text-emerald-100'
                                        : 'border-rose-400/45 bg-rose-500/14 text-rose-100'
                                    : 'border-white/10 bg-white/[0.04] text-white/40 hover:border-white/16 hover:text-white/65'
                            }`}
                        >
                            موكل
                        </button>
                    </div>
                    {canRemove ? (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all shrink-0 touch-manipulation"
                            title="حذف هذا الطرف"
                        >
                            <X size={14} />
                        </button>
                    ) : null}
                </div>

                <div className="relative w-full">
                    <input
                        type="text"
                        value={party.name}
                        readOnly={lockNames}
                        onChange={(e) => onUpdate('name', e.target.value)}
                        placeholder="الاسم الكامل"
                        aria-label={`اسم ${party.status || 'الطرف'}`}
                        className={`${ncFieldClass(Boolean(hasError) || hasBlockedWord(party.name))} text-base font-medium ${lockNames ? 'opacity-80 cursor-default' : ''}`}
                    />
                </div>
                {hasBlockedWord(party.name) ? (
                    <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة</p>
                ) : null}
                {positionError ? <p className="text-amber-400/90 text-[10px] font-medium">{positionError}</p> : null}

                <div className="relative group">
                    <input
                        type="text"
                        value={party.address}
                        onChange={(e) => onUpdate('address', e.target.value)}
                        placeholder="العنوان السكني"
                        aria-label={`عنوان ${party.status || 'الطرف'}`}
                        className={`${ncFieldClass()} text-xs`}
                    />
                </div>
            </div>
        </div>
    );
};
