import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, UserPlus, X } from 'lucide-react';
import type { ThirdPartyModalProps, ThirdParty } from '../types';
import { buildThirdPartyRoleLabel, getDefaultThirdPartyStatus } from '../clientRepresentation';

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

const shellClass =
    'w-full max-w-xl overflow-hidden rounded-[28px] border border-[#E6C673]/18 bg-[#08101C]/96 shadow-[0_26px_90px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-white/[0.05]';
const sectionCardClass =
    'rounded-[22px] border border-white/[0.08] bg-gradient-to-br from-[#101A2B] to-[#0A1220] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]';
const optionBaseClass =
    'rounded-2xl border px-4 py-3.5 text-right transition-all duration-200 min-h-[82px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';
const idleOptionClass =
    'border-white/[0.08] bg-[#0D1524] text-white/72 hover:border-[#E6C673]/20 hover:bg-[#111C2E]';
const activeOptionClass =
    'border-[#E6C673]/42 bg-[#E6C673]/12 text-[#F3DA94] shadow-[0_10px_28px_rgba(230,198,115,0.08)]';
const emeraldActiveClass =
    'border-emerald-400/45 bg-emerald-500/12 text-emerald-100 shadow-[0_10px_28px_rgba(16,185,129,0.08)]';
const roseActiveClass =
    'border-rose-400/45 bg-rose-500/12 text-rose-100 shadow-[0_10px_28px_rgba(244,63,94,0.08)]';
const fieldClass =
    'w-full rounded-2xl border border-white/[0.1] bg-[#0C1524] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/28 focus:border-[#E6C673]/55 focus:bg-[#101A2B] focus:ring-1 focus:ring-[#E6C673]/16';

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
                ? 'text-emerald-300'
                : 'text-rose-300'
            : 'text-[#F3DA94]';

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
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(2,6,14,0.82)] backdrop-blur-md p-4 sm:p-6 font-['Tajawal']">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={shellClass}>
                <div className="border-b border-white/[0.06] bg-gradient-to-r from-[#0F1828] to-[#0A1220] px-5 py-4 sm:px-6 sm:py-5 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-3 text-base sm:text-lg">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E6C673]/22 bg-[#E6C673]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                            <UserPlus size={18} className="text-[#E6C673]" />
                        </span>
                        إضافة شخص ثالث
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="إغلاق"
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/45 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 sm:p-6 space-y-5 bg-gradient-to-b from-[#09111D] via-[#09111C] to-[#070D17]">
                    <div className={sectionCardClass}>
                        <label className="block text-xs font-bold text-white/60 mb-3">نوع الإدخال</label>
                        <div className="grid grid-cols-2 gap-3">
                            {entryOptions.map((opt) => {
                                const disabled = opt.id === 'interpleader' && interpleaderDisabled;
                                const active = entryMode === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        disabled={disabled}
                                        data-testid={`lawyer-new-case-third-party-mode-${opt.id}`}
                                        onClick={() => setEntryMode(opt.id)}
                                        className={[
                                            optionBaseClass,
                                            active ? activeOptionClass : idleOptionClass,
                                            disabled ? 'opacity-40 cursor-not-allowed' : '',
                                        ].join(' ')}
                                    >
                                        <span className="block text-sm font-extrabold">{opt.label}</span>
                                        <span className="block text-[11px] mt-1 opacity-75 leading-5">{opt.hint}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {interpleaderDisabled ? (
                            <p className="text-[11px] text-amber-300/90 mt-3">الإدخال الاختصامي غير متاح في مرحلة الاستئناف.</p>
                        ) : null}
                    </div>

                    {entryMode === 'affiliative' ? (
                        <div className={sectionCardClass}>
                            <label className="block text-xs font-bold text-white/60 mb-3">ينضم إلى</label>
                            <div className="grid grid-cols-2 gap-3">
                                {([1, 2] as const).map((side) => (
                                    <button
                                        key={side}
                                        type="button"
                                        onClick={() => setAffiliatedSide(side)}
                                        className={[
                                            'rounded-2xl border py-3 text-sm font-bold transition-all min-h-[58px]',
                                            affiliatedSide === side
                                                ? side === 1
                                                    ? emeraldActiveClass
                                                    : roseActiveClass
                                                : idleOptionClass,
                                        ].join(' ')}
                                    >
                                        {side === 1 ? 'الطرف الأول (المدعي)' : 'الطرف الثاني (المدعى عليه)'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="flex justify-start w-full rounded-2xl border border-white/[0.07] bg-[#0D1524] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <span className={`text-xl font-extrabold tracking-wide ${statusColorClass}`}>{statusTitle}</span>
                    </div>

                    <div className={sectionCardClass}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-2">الاسم الكامل</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`${fieldClass} h-12 text-base font-medium`}
                                    placeholder="الاسم الكامل"
                                    autoFocus
                                />
                            </div>

                            <div className="relative group">
                                <label className="block text-xs font-bold text-white/60 mb-2">العنوان السكني</label>
                                <div className="relative">
                                    <MapPin
                                        size={14}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 group-focus-within:text-[#E6C673] z-10 pointer-events-none"
                                    />
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className={`${fieldClass} pr-11 pl-4`}
                                        placeholder="العنوان السكني"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 py-4 sm:px-6 border-t border-white/[0.06] bg-[#09111D] flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm font-bold text-white/55 transition-colors hover:text-white/80 hover:bg-white/[0.05]"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        data-testid="lawyer-new-case-third-party-confirm"
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="px-6 py-2.5 rounded-2xl bg-[#E6C673] text-[#0B1021] text-sm font-extrabold shadow-[0_14px_34px_rgba(230,198,115,0.18)] hover:bg-[#d4b45f] transition-all disabled:opacity-40"
                    >
                        تأكيد الإضافة
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
