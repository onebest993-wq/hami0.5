import React from 'react';
import { UserPlus } from '@/app/components/ui/icons/UserPlus';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { ClientSideMarker } from './ClientSideMarker';
import { fieldInputClass, partyBlockClass } from './formFieldClasses';
import type { UrgentPartyEntry } from './urgentActionsFormTypes';

type Props = {
    party1List: UrgentPartyEntry[];
    party1EndRef: React.RefObject<HTMLDivElement | null>;
    validationErrors: Record<string, string>;
    party1Label: string;
    isIqrarContext: boolean;
    isParty1Client: boolean;
    partyCardTitle: (side: 'party1' | 'party2', index: number) => string;
    toggleSideClient: (side: 'party1' | 'party2', next: boolean) => void;
    addParty1: () => void;
    removeParty1: (index: number) => void;
    updateParty1: <K extends keyof UrgentPartyEntry>(index: number, field: K, value: UrgentPartyEntry[K]) => void;
};

export function UrgentActionsParty1Section({
    party1List,
    party1EndRef,
    validationErrors,
    party1Label,
    isIqrarContext,
    isParty1Client,
    partyCardTitle,
    toggleSideClient,
    addParty1,
    removeParty1,
    updateParty1,
}: Props) {
    return (
        <div className="bg-[#0B1021] border border-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 flex-wrap mb-2">
                <h2 className="text-white font-bold text-sm min-w-0">{party1Label}</h2>
                {!isIqrarContext ? (
                    <ClientSideMarker
                        active={isParty1Client}
                        onToggle={(next) => toggleSideClient('party1', next)}
                    />
                ) : null}
            </div>

            <div className="space-y-3">
                {party1List.map((party, index) => (
                    <div key={index} className={partyBlockClass}>
                        {index > 0 || partyCardTitle('party1', index) ? (
                            <div className="flex items-center gap-2 mb-2 min-w-0">
                                {index > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => removeParty1(index)}
                                        className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-lg bg-white/5 text-white/50 hover:bg-red-500/15 hover:text-red-200 flex items-center justify-center shrink-0 touch-manipulation"
                                        title="حذف الطرف"
                                        aria-label="حذف الطرف"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                {partyCardTitle('party1', index) ? (
                                    <span className="text-white/90 text-sm font-extrabold truncate">
                                        {partyCardTitle('party1', index)}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block text-white/70 text-sm mb-2">نوع الطالب</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={party.type === 'person'}
                                            onChange={() => updateParty1(index, 'type', 'person')}
                                            className="accent-[#E6C673]"
                                        />
                                        <span className="text-white">شخص طبيعي</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={party.type === 'company'}
                                            onChange={() => updateParty1(index, 'type', 'company')}
                                            className="accent-[#E6C673]"
                                        />
                                        <span className="text-white">شركة/مؤسسة</span>
                                    </label>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-white/70 text-sm mb-2">
                                    الاسم الكامل <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={party.name}
                                    onChange={(e) => updateParty1(index, 'name', e.target.value)}
                                    className={fieldInputClass}
                                />
                                {index === 0 && validationErrors.party1Name && (
                                    <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.party1Name}</div>
                                )}
                            </div>
                            <div className="col-span-2">
                                <label className="block text-white/70 text-sm mb-2">
                                    العنوان <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={party.address}
                                    onChange={(e) => updateParty1(index, 'address', e.target.value)}
                                    required
                                    className={fieldInputClass}
                                />
                                {validationErrors[`party1_${index}_address`] && (
                                    <div className="text-red-300 text-xs mt-2 font-bold">
                                        {validationErrors[`party1_${index}_address`]}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={party1EndRef} />
            </div>

            <button
                type="button"
                onClick={addParty1}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all text-sm font-bold bg-white/5 text-white/70 hover:bg-white/10 hover:text-[#E6C673]"
            >
                <UserPlus size={16} />
                + إضافة طرف آخر
            </button>
        </div>
    );
}
