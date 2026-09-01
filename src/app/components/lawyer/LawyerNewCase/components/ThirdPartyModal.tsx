import React, { useEffect, useMemo, useState } from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { X } from '@/app/components/ui/icons/X';
import type { ThirdPartyModalProps, ThirdParty } from '../types';
import { buildThirdPartyRoleLabel, getDefaultThirdPartyStatus } from '../clientRepresentation';
import { NC_FIELD, NC_LABEL } from '../newCaseGlassTheme';

type EntryMode = ThirdParty['entryMode'];

const FILE_ENTRY_OPTIONS: { id: EntryMode; label: string }[] = [
    { id: 'interpleader', label: 'اختصامي' },
    { id: 'affiliative', label: 'انضمامي' },
    { id: 'court', label: 'بقرار المحكمة' },
    { id: 'opponent_request', label: 'بطلب الخصم' },
];

const chipBase =
    'min-h-[44px] rounded-xl border px-3 py-2 text-sm font-bold text-right transition-colors touch-manipulation';
const chipIdle = 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-white/16';
const chipActive = 'border-[#E6C673]/42 bg-[#E6C673]/12 text-[#F3DA94]';

export const ThirdPartyModal = ({
    isOpen,
    onClose,
    onSave,
    currentStage,
    context = 'newCase',
}: ThirdPartyModalProps) => {
    const isNewCase = context !== 'file';
    const [name, setName] = useState('');
    const [entryMode, setEntryMode] = useState<EntryMode>('interpleader');
    const [affiliatedSide, setAffiliatedSide] = useState<1 | 2>(1);

    useEffect(() => {
        if (!isOpen) return;
        setName('');
        setEntryMode('interpleader');
        setAffiliatedSide(1);
    }, [isOpen]);

    const isAppeal = currentStage?.includes('استئناف') || currentStage?.toLowerCase().includes('appeal');
    const interpleaderDisabled = isAppeal && !isNewCase;

    const statusTitle = useMemo(
        () =>
            getDefaultThirdPartyStatus(
                entryMode,
                entryMode === 'affiliative' ? affiliatedSide : undefined,
                currentStage ?? '',
            ),
        [entryMode, affiliatedSide, currentStage],
    );

    const handleSave = () => {
        if (!name.trim()) return;
        if (entryMode === 'affiliative' && !affiliatedSide) return;

        const draft: ThirdParty = {
            id: Date.now(),
            name: name.trim(),
            status: statusTitle,
            address: '',
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(2,6,14,0.82)] backdrop-blur-sm p-4 sm:p-6 font-['Tajawal']">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#E6C673]/16 bg-[#0C1220]/96 shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
            >
                <div className="border-b border-white/[0.06] bg-[#0A1220] px-5 py-4 sm:px-6 flex justify-between items-center">
                    <h3 className="font-bold text-white text-base sm:text-lg">
                        {isNewCase ? 'إضافة شخص ثالث اختصامي' : 'إضافة شخص ثالث'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="إغلاق"
                        className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/45 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 touch-manipulation"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 sm:p-6 space-y-4 bg-[#09111D]">
                    {isNewCase ? null : (
                        <div>
                            <label className={`${NC_LABEL} mb-2`}>نوع الإدخال</label>
                            <div className="grid grid-cols-2 gap-2">
                                {FILE_ENTRY_OPTIONS.map((opt) => {
                                    const disabled = opt.id === 'interpleader' && interpleaderDisabled;
                                    const active = entryMode === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            disabled={disabled}
                                            data-testid={`lawyer-new-case-third-party-mode-${opt.id}`}
                                            onClick={() => setEntryMode(opt.id)}
                                            className={`${chipBase} ${active ? chipActive : chipIdle} ${
                                                disabled ? 'opacity-40 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {interpleaderDisabled ? (
                                <p className="text-[11px] text-amber-300/90 mt-2">
                                    الإدخال الاختصامي غير متاح في مرحلة الاستئناف.
                                </p>
                            ) : null}
                        </div>
                    )}

                    {!isNewCase && entryMode === 'affiliative' ? (
                        <div>
                            <label className={`${NC_LABEL} mb-2`}>ينضم إلى</label>
                            <div className="grid grid-cols-2 gap-2">
                                {([1, 2] as const).map((side) => (
                                    <button
                                        key={side}
                                        type="button"
                                        onClick={() => setAffiliatedSide(side)}
                                        className={`${chipBase} ${
                                            affiliatedSide === side ? chipActive : chipIdle
                                        }`}
                                    >
                                        {side === 1 ? 'الطرف الأول (المدعي)' : 'الطرف الثاني (المدعى عليه)'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div>
                        <label className={NC_LABEL}>الاسم الكامل</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key !== 'Enter' || !name.trim()) return;
                                e.preventDefault();
                                handleSave();
                            }}
                            className={`${NC_FIELD} h-12 text-base font-medium`}
                            placeholder="الاسم الكامل"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="px-5 py-4 sm:px-6 border-t border-white/[0.06] bg-[#09111D] flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] px-5 py-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm font-bold text-white/55 transition-colors hover:text-white/80 hover:bg-white/[0.05]"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        data-testid="lawyer-new-case-third-party-confirm"
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-[#E6C673] text-[#0B1021] text-sm font-extrabold hover:bg-[#d4b45f] transition-all disabled:opacity-40"
                    >
                        تأكيد الإضافة
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
