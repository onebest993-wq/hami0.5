import React, { useEffect, useState } from 'react';
import type { InvestigationPapersAt } from '../../criminalStore';

export type CaseIdentityCorrectionModalProps = {
    open: boolean;
    title: string;
    fieldLabel: string;
    currentValue: string;
    error?: string;
    onClose: () => void;
    onSubmit: (payload: { newValue: string; reason: string }) => void;
};

export type DepositionIdentityCorrectionModalProps = {
    open: boolean;
    papersAt: InvestigationPapersAt;
    entityName: string;
    error?: string;
    onClose: () => void;
    onSubmit: (payload: { papersAt: InvestigationPapersAt; entityName: string; reason: string }) => void;
};

export const CaseIdentityCorrectionModal = ({
    open,
    title,
    fieldLabel,
    currentValue,
    error,
    onClose,
    onSubmit,
}: CaseIdentityCorrectionModalProps) => {
    const [newValue, setNewValue] = useState('');
    const [reason, setReason] = useState('');
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (!open) return;
        setNewValue(String(currentValue ?? '').trim());
        setReason('');
        setLocalError('');
    }, [open, currentValue]);

    if (!open) return null;

    const displayedError = error || localError;

    const handleSubmit = () => {
        const next = newValue.trim();
        const why = reason.trim();
        if (!next) {
            setLocalError('أدخل القيمة الجديدة.');
            return;
        }
        if (!why) {
            setLocalError('أدخل سبب التصحيح.');
            return;
        }
        if (next === String(currentValue ?? '').trim()) {
            setLocalError('القيمة الجديدة مطابقة للحالية — لا حاجة للحفظ.');
            return;
        }
        setLocalError('');
        onSubmit({ newValue: next, reason: why });
    };

    return (
        <div
            className="fixed inset-0 z-[240] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm whitespace-normal break-words">{title}</div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition text-xs font-bold px-2 py-1 rounded-md hover:bg-slate-700/60"
                    >
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-amber-100 text-[11px] font-bold whitespace-normal break-words">
                        ⚠️ يُسجّل التصحيح في سجل الإضبارة — تأكد من دقة الاسم قبل الحفظ.
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            {fieldLabel} — الحالي
                        </label>
                        <div className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white/75 whitespace-normal break-words">
                            {String(currentValue ?? '').trim() || '—'}
                        </div>
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            {fieldLabel} — الصحيح
                        </label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            سبب التصحيح
                        </label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[88px] resize-none"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="مثال: خطأ مطبعي في اسم المحكمة / تصحيح إملائي..."
                        />
                    </div>
                    {displayedError ? (
                        <div className="text-red-300 text-xs font-bold whitespace-normal break-words">{displayedError}</div>
                    ) : null}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!newValue.trim() || !reason.trim()}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40"
                        >
                            حفظ التصحيح
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export type PartyIdentityCorrectionModalProps = {
    open: boolean;
    partyKind: 'complainant' | 'defendant';
    fullName: string;
    phone?: string;
    address: string;
    error?: string;
    onClose: () => void;
    onSubmit: (payload: {
        newFullName: string;
        newPhone?: string;
        newAddress: string;
        reason: string;
    }) => void;
};

export const PartyIdentityCorrectionModal = ({
    open,
    partyKind,
    fullName,
    phone = '',
    address,
    error,
    onClose,
    onSubmit,
}: PartyIdentityCorrectionModalProps) => {
    const [nameValue, setNameValue] = useState('');
    const [phoneValue, setPhoneValue] = useState('');
    const [addressValue, setAddressValue] = useState('');
    const [reason, setReason] = useState('');
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (!open) return;
        setNameValue(String(fullName ?? '').trim());
        setPhoneValue(String(phone ?? '').trim());
        setAddressValue(String(address ?? '').trim());
        setReason('');
        setLocalError('');
    }, [open, fullName, phone, address]);

    if (!open) return null;

    const displayedError = error || localError;
    const title =
        partyKind === 'complainant' ? 'تصحيح بيانات المشتكي' : 'تصحيح بيانات المتهم';

    const handleSubmit = () => {
        const nextName = nameValue.trim();
        const nextPhone = phoneValue.trim();
        const nextAddress = addressValue.trim();
        const why = reason.trim();
        const priorName = String(fullName ?? '').trim();
        const priorPhone = String(phone ?? '').trim();
        const priorAddress = String(address ?? '').trim();

        if (!nextName) {
            setLocalError('أدخل الاسم الكامل.');
            return;
        }
        if (nextName.length < 2) {
            setLocalError('الاسم قصير جداً — تحقق من الإدخال.');
            return;
        }
        if (partyKind === 'complainant' && nextPhone && nextPhone.length < 7) {
            setLocalError('رقم الهاتف قصير — تحقق من الإدخال.');
            return;
        }
        if (nextAddress && nextAddress.length < 2) {
            setLocalError('العنوان قصير جداً — تحقق من الإدخال.');
            return;
        }
        if (!why || why.length < 4) {
            setLocalError('أدخل سبب التصحيح.');
            return;
        }

        const nameChanged = nextName !== priorName;
        const phoneChanged = partyKind === 'complainant' && nextPhone !== priorPhone;
        const addressChanged = nextAddress !== priorAddress;
        if (!nameChanged && !phoneChanged && !addressChanged) {
            setLocalError('لا توجد تغييرات — البيانات مطابقة للحالية.');
            return;
        }

        setLocalError('');
        onSubmit({
            newFullName: nextName,
            ...(partyKind === 'complainant' ? { newPhone: nextPhone } : {}),
            newAddress: nextAddress,
            reason: why,
        });
    };

    return (
        <div
            className="fixed inset-0 z-[240] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm whitespace-normal break-words">{title}</div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition text-xs font-bold px-2 py-1 rounded-md hover:bg-slate-700/60"
                    >
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-amber-100 text-[11px] font-bold whitespace-normal break-words">
                        ⚠️ يُسجّل التصحيح في سجل الإضبارة — تأكد من دقة البيانات قبل الحفظ.
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            الاسم الكامل
                        </label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    {partyKind === 'complainant' ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                رقم الهاتف
                            </label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 unicode-bidi-plaintext"
                                dir="ltr"
                                value={phoneValue}
                                onChange={(e) => setPhoneValue(e.target.value)}
                                autoComplete="off"
                            />
                        </div>
                    ) : null}
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            العنوان
                        </label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={addressValue}
                            onChange={(e) => setAddressValue(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            سبب التصحيح
                        </label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[88px] resize-none"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="مثال: خطأ مطبعي في الاسم أو العنوان..."
                        />
                    </div>
                    {displayedError ? (
                        <div className="text-red-300 text-xs font-bold whitespace-normal break-words">{displayedError}</div>
                    ) : null}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!nameValue.trim() || !reason.trim()}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40"
                        >
                            حفظ التصحيح
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DepositionIdentityCorrectionModal = ({
    open,
    papersAt,
    entityName,
    error,
    onClose,
    onSubmit,
}: DepositionIdentityCorrectionModalProps) => {
    const [localPapersAt, setLocalPapersAt] = useState<InvestigationPapersAt>('مركز شرطة');
    const [localEntityName, setLocalEntityName] = useState('');
    const [reason, setReason] = useState('');
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (!open) return;
        setLocalPapersAt(papersAt === 'مكتب تحقيق قضائي' ? 'مكتب تحقيق قضائي' : 'مركز شرطة');
        setLocalEntityName(String(entityName ?? '').trim());
        setReason('');
        setLocalError('');
    }, [open, papersAt, entityName]);

    if (!open) return null;

    const displayedError = error || localError;
    const entityLabel =
        localPapersAt === 'مكتب تحقيق قضائي' ? 'اسم مكتب التحقيق' : 'اسم مركز الشرطة';

    const handleSubmit = () => {
        const name = localEntityName.trim();
        const why = reason.trim();
        if (!name) {
            setLocalError(`أدخل ${entityLabel}.`);
            return;
        }
        if (!why) {
            setLocalError('أدخل سبب التصحيح.');
            return;
        }
        setLocalError('');
        onSubmit({ papersAt: localPapersAt, entityName: name, reason: why });
    };

    return (
        <div
            className="fixed inset-0 z-[240] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm whitespace-normal break-words">
                        تصحيح جهة إيداع الإضبارة
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition text-xs font-bold px-2 py-1 rounded-md hover:bg-slate-700/60"
                    >
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-amber-100 text-[11px] font-bold whitespace-normal break-words">
                        ⚠️ يُسجّل التصحيح في سجل الإضبارة — تأكد من نوع الجهة واسمها.
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            نوع جهة الإيداع
                        </label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={localPapersAt}
                            onChange={(e) => {
                                const v = e.target.value;
                                setLocalPapersAt(v === 'مكتب تحقيق قضائي' ? 'مكتب تحقيق قضائي' : 'مركز شرطة');
                            }}
                        >
                            <option value="مركز شرطة">مركز شرطة</option>
                            <option value="مكتب تحقيق قضائي">مكتب تحقيق قضائي</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            {entityLabel}
                        </label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={localEntityName}
                            onChange={(e) => setLocalEntityName(e.target.value)}
                            placeholder={
                                localPapersAt === 'مكتب تحقيق قضائي'
                                    ? 'مثال: مكتب تحقيق قضائي الكرخ'
                                    : 'مثال: مركز شرطة الجمهوري'
                            }
                            autoComplete="off"
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            سبب التصحيح
                        </label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[88px] resize-none"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="مثال: خطأ في اسم المركز عند الإنشاء..."
                        />
                    </div>
                    {displayedError ? (
                        <div className="text-red-300 text-xs font-bold whitespace-normal break-words">{displayedError}</div>
                    ) : null}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!localEntityName.trim() || !reason.trim()}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40"
                        >
                            حفظ التصحيح
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
