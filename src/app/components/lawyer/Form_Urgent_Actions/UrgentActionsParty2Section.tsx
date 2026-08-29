import React from 'react';
import { UserPlus } from '@/app/components/ui/icons/UserPlus';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';
import { ClientSideMarker } from './ClientSideMarker';
import { fieldInputClass, partyBlockClass } from './formFieldClasses';
import type { UrgentActionFormData, UrgentPartyEntry } from './urgentActionsFormTypes';

type Props = {
    party2List: UrgentPartyEntry[];
    party2EndRef: React.RefObject<HTMLDivElement | null>;
    formData: UrgentActionFormData;
    validationErrors: Record<string, string>;
    party2Label: string;
    isIqrarContext: boolean;
    isParty2Client: boolean;
    isRespondentClient: boolean;
    partyCardTitle: (side: 'party1' | 'party2', index: number) => string;
    toggleSideClient: (side: 'party1' | 'party2', next: boolean) => void;
    addParty2: () => void;
    removeParty2: (index: number) => void;
    updateParty2: <K extends keyof UrgentPartyEntry>(index: number, field: K, value: UrgentPartyEntry[K]) => void;
    updateField: <K extends keyof UrgentActionFormData>(field: K, value: UrgentActionFormData[K]) => void;
};

export function UrgentActionsParty2Section({
    party2List,
    party2EndRef,
    formData,
    validationErrors,
    party2Label,
    isIqrarContext,
    isParty2Client,
    isRespondentClient,
    partyCardTitle,
    toggleSideClient,
    addParty2,
    removeParty2,
    updateParty2,
    updateField,
}: Props) {
    return (
        <div className="bg-[#0B1021] border border-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 flex-wrap mb-2">
                <h2 className="text-white font-bold text-sm min-w-0">{party2Label}</h2>
                {!isIqrarContext ? (
                    <ClientSideMarker
                        active={isParty2Client}
                        onToggle={(next) => toggleSideClient('party2', next)}
                    />
                ) : null}
            </div>

            <div className="space-y-3">
                {party2List.map((party, index) => (
                    <div key={index} className={partyBlockClass}>
                        {index > 0 || partyCardTitle('party2', index) ? (
                            <div className="flex items-center gap-2 mb-2 min-w-0">
                                {index > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => removeParty2(index)}
                                        className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-lg bg-white/5 text-white/50 hover:bg-red-500/15 hover:text-red-200 flex items-center justify-center shrink-0 touch-manipulation"
                                        title="حذف الطرف"
                                        aria-label="حذف الطرف"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                {partyCardTitle('party2', index) ? (
                                    <span className="text-white/90 text-sm font-extrabold truncate">
                                        {partyCardTitle('party2', index)}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block text-white/70 text-sm mb-2">نوع المطلوب ضده</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={party.type === 'person'}
                                            onChange={() => updateParty2(index, 'type', 'person')}
                                            className="accent-[#E6C673]"
                                        />
                                        <span className="text-white">شخص طبيعي</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={party.type === 'company'}
                                            onChange={() => updateParty2(index, 'type', 'company')}
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
                                    onChange={(e) => updateParty2(index, 'name', e.target.value)}
                                    className={fieldInputClass}
                                />
                                {index === 0 && validationErrors.party2Name && (
                                    <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.party2Name}</div>
                                )}
                            </div>
                            <div className="col-span-2">
                                <label className="block text-white/70 text-sm mb-2">
                                    العنوان <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={party.address}
                                    onChange={(e) => updateParty2(index, 'address', e.target.value)}
                                    required
                                    className={fieldInputClass}
                                />
                                {validationErrors[`party2_${index}_address`] && (
                                    <div className="text-red-300 text-xs mt-2 font-bold">
                                        {validationErrors[`party2_${index}_address`]}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={party2EndRef} />
            </div>

            <button
                type="button"
                onClick={addParty2}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all text-sm font-bold bg-white/5 text-white/70 hover:bg-white/10 hover:text-[#E6C673]"
            >
                <UserPlus size={16} />
                + إضافة طرف آخر
            </button>

            {isRespondentClient && !isIqrarContext ? (
                <div className="mt-6 border border-[#E6C673]/25 bg-[#E6C673]/5 rounded-xl p-5 space-y-4">
                    <div className="text-white font-extrabold text-sm">
                        نقطة الدخول للدعوى (المرحلة الحالية) <span className="text-red-400">*</span>
                    </div>
                    <p className="text-white/55 text-xs leading-relaxed">
                        بما أن موكليك من جهة المطلوب ضده، حدد المرحلة التي انضم بها الوكيل إلى الإضبارة.
                    </p>
                    {validationErrors.defenderEntryPhase ? (
                        <div className="text-red-300 text-xs font-bold">{validationErrors.defenderEntryPhase}</div>
                    ) : null}
                    <div className="grid grid-cols-1 gap-3">
                        {(
                            [
                                { v: 1 as const, label: 'المرحلة الأولى (قيد النظر)' },
                                { v: 2 as const, label: 'مرحلة التظلم (صدر أمر غيابي)' },
                                { v: 3 as const, label: 'مرحلة التمييز (في محكمة الطعن)' },
                            ] as const
                        ).map((opt) => (
                            <label
                                key={opt.v}
                                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                    formData.defenderEntryPhase === opt.v
                                        ? 'border-[#E6C673]/50 bg-white/10'
                                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="defenderEntryPhase"
                                    checked={formData.defenderEntryPhase === opt.v}
                                    onChange={() => updateField('defenderEntryPhase', opt.v)}
                                    className="accent-[#E6C673]"
                                />
                                <span className="text-white text-sm font-bold">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                    {formData.defenderEntryPhase === 2 ? (
                        <div>
                            <label className="block text-white/70 text-sm mb-2">
                                تاريخ صدور الأمر الولائي <span className="text-red-400">*</span>
                            </label>
                            <HamiDateInput
                                value={formData.stateOrderIssuedDate}
                                onValueChange={(v) => updateField('stateOrderIssuedDate', v)}
                                className={fieldInputClass}
                            />
                            {validationErrors.stateOrderIssuedDate ? (
                                <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.stateOrderIssuedDate}</div>
                            ) : null}
                        </div>
                    ) : null}

                    {formData.defenderEntryPhase === 3 ? (
                        <div>
                            <label className="block text-white/70 text-sm mb-2">
                                تاريخ قرار التظلم <span className="text-red-400">*</span>
                            </label>
                            <HamiDateInput
                                value={formData.defenderPhase3GrievanceDecisionDate}
                                onValueChange={(v) => updateField('defenderPhase3GrievanceDecisionDate', v)}
                                className={fieldInputClass}
                            />
                            {validationErrors.defenderPhase3GrievanceDecisionDate ? (
                                <div className="text-red-300 text-xs mt-2 font-bold">
                                    {validationErrors.defenderPhase3GrievanceDecisionDate}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
