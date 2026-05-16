import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Party } from '@/app/types/common';

interface PartyCardProps {
    party: Party;
    index: number;
    totalCount: number;
    type: 'creditor' | 'debtor';
    onUpdate: (id: string | number, field: string, value: string | boolean | number) => void;
    onRemove: (id: string | number) => void;
    hasOppositeClient: boolean;
}

const PartyCard: React.FC<PartyCardProps> = React.memo(({
    party, index, totalCount, type, onUpdate, onRemove, hasOppositeClient
}) => {
    const isCreditor = type === 'creditor';
    const displayTitle = totalCount > 1
        ? (isCreditor ? `الدائن ${index + 1}` : `المدين ${index + 1}`)
        : (isCreditor ? 'الدائن' : 'المدين');

    return (
        <div className="p-3 animate-fade-in">
            <div className="flex justify-between items-center mb-2 pb-2">
                <h4 className={`${isCreditor ? 'text-emerald-500' : 'text-rose-500'} font-bold text-sm`}>
                    {displayTitle}
                </h4>
                <div className="flex items-center gap-3">
                    <label className={`flex items-center gap-2 text-xs cursor-pointer ${
                        hasOppositeClient ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400'
                    }`}>
                        <input
                            type="checkbox"
                            className={`${isCreditor ? 'accent-emerald-500' : 'accent-rose-500'} cursor-pointer`}
                            checked={party.isClient || false}
                            onChange={(e) => onUpdate(party.id, 'isClient', e.target.checked)}
                            disabled={hasOppositeClient}
                        />
                        موكلي
                    </label>
                    <select
                        value={party.occupation}
                        onChange={(e) => onUpdate(party.id, 'occupation', e.target.value)}
                        className={`bg-[#111827] border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 outline-none ${isCreditor ? 'focus:border-emerald-500' : 'focus:border-rose-500'}`}
                    >
                        <option value="كاسب">كاسب</option>
                        <option value="موظف">موظف</option>
                    </select>
                    {index > 0 && (
                        <button
                            type="button"
                            onClick={() => onRemove(party.id)}
                            className={`${isCreditor ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-rose-500 hover:bg-rose-500/10'} p-1 rounded transition-colors`}
                            title={isCreditor ? "حذف الدائن" : "حذف المدين"}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
            <input
                type="text"
                placeholder="الاسم الكامل"
                value={party.name}
                onChange={(e) => onUpdate(party.id, 'name', e.target.value)}
                className={`w-full bg-[#111827] border border-gray-700 text-white p-3 rounded-lg ${isCreditor ? 'focus:border-emerald-500' : 'focus:border-rose-500'} outline-none placeholder-gray-600 transition-colors mb-2`}
            />
            <div className="grid grid-cols-2 gap-3">
                <input
                    type="text"
                    placeholder="رقم الهاتف"
                    value={party.phone}
                    onChange={(e) => onUpdate(party.id, 'phone', e.target.value)}
                    className={`w-full bg-[#111827] border border-gray-700 text-white p-3 rounded-lg ${isCreditor ? 'focus:border-emerald-500' : 'focus:border-rose-500'} outline-none placeholder-gray-600 transition-colors`}
                />
                <input
                    type="text"
                    placeholder={isCreditor ? "العنوان (اختياري)" : "العنوان الدقيق (مطلوب للتبليغ)"}
                    value={party.address}
                    onChange={(e) => onUpdate(party.id, 'address', e.target.value)}
                    className={`w-full bg-[#111827] border border-gray-700 text-white p-3 rounded-lg ${isCreditor ? 'focus:border-emerald-500' : 'focus:border-rose-500'} outline-none placeholder-gray-600 transition-colors`}
                />
            </div>
        </div>
    );
});

PartyCard.displayName = 'PartyCard';

export default PartyCard;
export type { PartyCardProps };
