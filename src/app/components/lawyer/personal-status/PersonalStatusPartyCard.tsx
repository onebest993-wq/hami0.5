import React from 'react';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { X } from '@/app/components/ui/icons/X';
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
    const hasError = errorMap[`party_${party.id}`];

    return (
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            {/* رأس مضغوط: الرقم + المركز القانوني + موكل — بلا اسم مكرر ولا سهم */}
            <div className="flex min-h-[44px] items-center gap-2 px-2.5 py-1.5 border-b border-white/[0.06]">
                <span className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/20">
                    {index + 1}
                </span>
                <span className="text-[10px] font-bold text-white/55 truncate min-w-0 flex-1">
                    {party.status}
                </span>
                <button
                    type="button"
                    onClick={() => onUpdate('isClient', !party.isClient)}
                    aria-pressed={party.isClient}
                    data-testid="lawyer-new-case-mark-client"
                    className={`inline-flex items-center justify-center gap-1 rounded-md px-2 min-h-[44px] text-[10px] font-bold border transition-colors touch-manipulation shrink-0 ${
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
                        className="min-h-[44px] min-w-[44px] rounded-md border border-rose-400/20 bg-rose-500/10 text-rose-300 flex items-center justify-center hover:bg-rose-500/20 transition-colors touch-manipulation shrink-0"
                        aria-label="إزالة الطرف"
                    >
                        <X size={13} />
                    </button>
                ) : null}
            </div>

            <div className="px-2.5 py-2 space-y-2">
                <input
                    type="text"
                    value={party.name}
                    onChange={(e) => onUpdate('name', e.target.value)}
                    className={personalFieldClass(Boolean(hasError) || hasBlockedWord(party.name))}
                    aria-label="الاسم الكامل"
                />
                {hasBlockedWord(party.name) ? (
                    <p className="text-amber-400/90 text-[10px]">ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة</p>
                ) : null}
            </div>
        </div>
    );
}
