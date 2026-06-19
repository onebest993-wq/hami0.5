import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { UserPlus, X, MapPin } from 'lucide-react';
import type { ThirdPartyModalProps, ThirdParty } from '../types';
import { buildThirdPartyRoleLabel, getDefaultThirdPartyStatus } from '../clientRepresentation';
import { NC_GLASS_CARD, ncFieldClass } from '../newCaseGlassTheme';

type EntryMode = ThirdParty['entryMode'];

const NEW_CASE_ENTRY_OPTIONS: { id: EntryMode; label: string; hint: string }[] = [
    { id: 'interpleader', label: 'اختصامي', hint: 'يدخل كخصم مستقل على الطرفين' },
    { id: 'affiliative', label: 'انضمامي', hint: 'ينضم إلى أحد الطرفين' },
];

const FILE_ENTRY_OPTIONS: { id: EntryMode; label: string; hint: string }[] = [
    ...NEW_CASE_ENTRY_OPTIONS,
    { id: 'court', label: 'بقرار المحكمة', hint: 'إدخال قضائي' },
    { id: 'opponent_request', label: 'بطلب الخصم', hint: 'بطلب أحد الخصوم' },
];

export const ThirdPartyModal = ({ isOpen, onClose, onSave, currentStage, context = 'newCase' }: ThirdPartyModalProps) => {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [entryMode, setEntryMode] = useState<EntryMode>('affiliative');
    const [affiliatedSide, setAffiliatedSide] = useState<1 | 2>(1);

    useEffect(() => {
        if (!isOpen) return;
        setName('');
        setAddress('');
        setEntryMode('affiliative');
        setAffiliatedSide(1);
    }, [isOpen]);

    const isAppeal = currentStage?.includes('استئناف') || currentStage?.toLowerCase().includes('appeal');
    const interpleaderDisabled = isAppeal;
    const entryOptions = context === 'file' ? FILE_ENTRY_OPTIONS : NEW_CASE_ENTRY_OPTIONS;

    const statusTitle = useMemo(
        () =>
            getDefaultThirdPartyStatus(
                entryMode,
                entryMode === 'affiliative' ? affiliatedSide : undefined,
                currentStage ?? '',
            ),
        [entryMode, affiliatedSide, currentStage],
    );

    const statusColorClass =
        entryMode === 'affiliative'
            ? affiliatedSide === 1
                ? 'text-emerald-400/90'
                : 'text-rose-400/90'
            : 'text-[#E6C673]/90';

    const handleSave = () => {
        if (!name.trim()) return;
        if (entryMode === 'affiliative' && !affiliatedSide) return;

        const draft: ThirdParty = {
            id: Date.now(),
            name: name.trim(),
            status: statusTitle,
            address: address.trim(),
            entryMode,
            affiliatedSide: entryMode === 'affiliative' ? affiliatedSide : undefined,
            type: 'thirdParty',
            roleLabel: '',
            hasLawyer: false,
            lawyerName: '',
            lawyerPhone: '',
            isMyOffice: false,
            isClient: false,
        };
        draft.roleLabel = buildThirdPartyRoleLabel(draft);

        onSave(draft);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-['Tajawal']">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`w-full max-w-md ${NC_GLASS_CARD} overflow-hidden`}
            >
                <div className="border-b border-white/[0.06] p-4 flex justify-between items-center">
                    <h3 className="font-bold text-white/90 flex items-center gap-2">
                        <UserPlus size={18} className="text-[#E6C673]" />
                        إضافة شخص ثالث
                    </h3>
                    <button type="button" onClick={onClose} aria-label="إغلاق">
                        <X size={18} className="text-white/40 hover:text-red-400" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-white/55 mb-2">نوع الإدخال</label>
                        <div className="grid grid-cols-2 gap-2">
                            {entryOptions.map((opt) => {
                                const disabled = opt.id === 'interpleader' && interpleaderDisabled;
                                const active = entryMode === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => setEntryMode(opt.id)}
                                        className={[
                                            'rounded-xl border px-3 py-2.5 text-right transition-colors',
                                            active
                                                ? 'border-[#E6C673]/40 bg-[#E6C673]/10 text-[#E6C673]'
                                                : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20',
                                            disabled ? 'opacity-40 cursor-not-allowed' : '',
                                        ].join(' ')}
                                    >
                                        <span className="block text-xs font-bold">{opt.label}</span>
                                        <span className="block text-[10px] mt-0.5 opacity-70">{opt.hint}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {interpleaderDisabled ? (
                            <p className="text-[10px] text-amber-400/80 mt-2">الإدخال الاختصامي غير متاح في مرحلة الاستئناف.</p>
                        ) : null}
                    </div>

                    {entryMode === 'affiliative' ? (
                        <div>
                            <label className="block text-xs font-medium text-white/55 mb-2">ينضم إلى</label>
                            <div className="grid grid-cols-2 gap-2">
                                {([1, 2] as const).map((side) => (
                                    <button
                                        key={side}
                                        type="button"
                                        onClick={() => setAffiliatedSide(side)}
                                        className={[
                                            'rounded-xl border py-2 text-xs font-bold transition-colors',
                                            affiliatedSide === side
                                                ? side === 1
                                                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                                                    : 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                                                : 'border-white/10 bg-white/[0.03] text-white/50',
                                        ].join(' ')}
                                    >
                                        {side === 1 ? 'الطرف الأول (المدعي)' : 'الطرف الثاني (المدعى عليه)'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="flex justify-start w-full">
                        <span className={`text-lg font-bold tracking-wide ${statusColorClass}`}>
                            {statusTitle}
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-white/55 mb-1.5">الاسم الكامل</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`${ncFieldClass()} h-10 text-base font-medium`}
                            placeholder="الاسم الكامل"
                            autoFocus
                        />
                    </div>

                    <div className="relative group">
                        <label className="block text-xs font-medium text-white/55 mb-1.5">العنوان السكني</label>
                        <div className="relative">
                            <MapPin
                                size={12}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-[#E6C673] z-10 pointer-events-none"
                            />
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className={`${ncFieldClass()} pr-8 pl-3 text-xs`}
                                placeholder="العنوان السكني"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/[0.06] flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-white/45 hover:text-white/70"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="px-6 py-2 bg-[#E6C673] text-[#0B1021] rounded-xl text-sm font-bold hover:bg-[#d4b45f] transition-all disabled:opacity-40"
                    >
                        تأكيد الإضافة
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
