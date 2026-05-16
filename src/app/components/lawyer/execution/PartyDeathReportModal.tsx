import React, { useCallback, useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { ExecutionFile } from '@/app/types/execution';

export type PartyDeathSavePayload =
    | { action: 'death_only'; deceased_party: 'creditor' | 'debtor' }
    | { action: 'no_heirs'; deceased_party: 'creditor' | 'debtor' }
    | {
          action: 'heir_substitution';
          deceased_party: 'creditor' | 'debtor';
          heir_names: string[];
          heir_details?: Array<{ name: string; phone?: string; address?: string }>;
      }
    | {
          action: 'seek_heir';
          deceased_party: 'creditor' | 'debtor';
          heir_names: string[];
          heir_details?: Array<{ name: string; phone?: string; address?: string }>;
      };

export interface PartyDeathReportModalProps {
    open: boolean;
    onClose: () => void;
    deceasedParty: 'debtor' | 'creditor';
    partyDeathCase: ExecutionFile['party_death_case'] | null | undefined;
    existingPartyHeirs?: string[];
    existingPartyHeirDetails?: Array<{ name?: string; phone?: string; address?: string }>;
    onPartyDeathSave: (input: PartyDeathSavePayload) => boolean;
    creditorDeathReportQueued?: boolean;
    onCreditorDeathOnlyQueued?: () => void;
    creditorSubstitutionRequestStatus?: 'none' | 'pending' | 'approved' | 'rejected' | 'alternative';
    onRequestCreditorSubstitution?: () => boolean;
    debtorSubstitutionRequestStatus?: 'none' | 'pending' | 'approved' | 'rejected' | 'alternative';
    onRequestDebtorSubstitution?: () => boolean;
}

function rowHasContent(s: string): boolean {
    return /\S/.test(String(s || ''));
}

export const PartyDeathReportModal: React.FC<PartyDeathReportModalProps> = ({
    open,
    onClose,
    deceasedParty,
    partyDeathCase: _partyDeathCase,
    existingPartyHeirs: _existingPartyHeirs,
    existingPartyHeirDetails: _existingPartyHeirDetails,
    onPartyDeathSave,
    creditorDeathReportQueued: _creditorDeathReportQueued = false,
    onCreditorDeathOnlyQueued: _onCreditorDeathOnlyQueued,
    creditorSubstitutionRequestStatus = 'none',
    onRequestCreditorSubstitution: _onRequestCreditorSubstitution,
    debtorSubstitutionRequestStatus = 'none',
    onRequestDebtorSubstitution: _onRequestDebtorSubstitution,
}) => {
    const makeRowId = useCallback(() => `heir_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`, []);
    const [draftData, setDraftData] = useState<{
        heirs: Array<{ id: string; name: string; phone: string; address: string }>;
    }>({ heirs: [{ id: 'seed', name: '', phone: '', address: '' }] });
    const [formError, setFormError] = useState<string | null>(null);

    const requestStatus =
        deceasedParty === 'creditor' ? creditorSubstitutionRequestStatus : debtorSubstitutionRequestStatus;
    const approvedLike = requestStatus === 'approved' || requestStatus === 'alternative';
    const handleClose = useCallback(() => {
        setDraftData({ heirs: [{ id: makeRowId(), name: '', phone: '', address: '' }] });
        setFormError(null);
        onClose();
    }, [makeRowId, onClose]);

    useEffect(() => {
        if (!open) {
            setDraftData({ heirs: [{ id: makeRowId(), name: '', phone: '', address: '' }] });
            setFormError(null);
            return;
        }
        setFormError(null);
        const fromDetails =
            _partyDeathCase?.deceased_party === deceasedParty
                ? (_partyDeathCase?.heir_details || []).map((h) => ({
                      id: makeRowId(),
                      name: String(h?.name || ''),
                      phone: String(h?.phone || ''),
                      address: String(h?.address || ''),
                  }))
                : (_existingPartyHeirDetails || []).map((h) => ({
                      id: makeRowId(),
                      name: String(h?.name || ''),
                      phone: String(h?.phone || ''),
                      address: String(h?.address || ''),
                  }));
        const existingHeirs =
            _partyDeathCase?.deceased_party === deceasedParty
                ? (_partyDeathCase?.heir_names || []).filter((s) => /\S/.test(String(s)))
                : (_existingPartyHeirs || []).filter((s) => /\S/.test(String(s)));
        const seeded =
            fromDetails.length > 0
                ? fromDetails
                : existingHeirs.map((name) => ({ id: makeRowId(), name: String(name || ''), phone: '', address: '' }));
        const base = { heirs: seeded.length > 0 ? seeded : [{ id: makeRowId(), name: '', phone: '', address: '' }] };
        let cloned = base;
        try {
            const sc = (globalThis as any).structuredClone as (<T>(x: T) => T) | undefined;
            cloned = sc ? sc(base) : (JSON.parse(JSON.stringify(base)) as typeof base);
        } catch {
            cloned = JSON.parse(JSON.stringify(base)) as typeof base;
        }
        setDraftData(cloned);
    }, [makeRowId, open, deceasedParty, _existingPartyHeirDetails, _existingPartyHeirs, _partyDeathCase]);

    const setHeirAt = useCallback((i: number, key: 'name' | 'phone' | 'address', v: string) => {
        setDraftData((prev) => {
            const nextHeirs = [...prev.heirs];
            nextHeirs[i] = { ...nextHeirs[i], [key]: v };
            return { ...prev, heirs: nextHeirs };
        });
    }, []);

    const addHeirRow = useCallback(() => {
        setDraftData((prev) => ({
            ...prev,
            heirs: [...prev.heirs, { id: makeRowId(), name: '', phone: '', address: '' }],
        }));
    }, [makeRowId]);

    const removeHeirRow = useCallback((i: number) => {
        setDraftData((prev) => {
            if (prev.heirs.length <= 1) return prev;
            return { ...prev, heirs: prev.heirs.filter((_, j) => j !== i) };
        });
    }, []);

    const confirmSubstitution = useCallback(() => {
        setFormError(null);
        if (!approvedLike) return;
        const heir_details = draftData.heirs
            .map((row) => ({
                name: String(row?.name || '').trim(),
                phone: String(row?.phone || '').trim(),
                address: String(row?.address || '').trim(),
            }))
            .filter((row) => rowHasContent(row.name));
        const heir_names = heir_details.map((row) => row.name);
        if (heir_names.length === 0) {
            setFormError('يرجى إدخال اسم وريث واحد على الأقل.');
            return;
        }
        const seen = new Set<string>();
        for (const row of heir_details) {
            const k = `${row.name}::${row.phone || ''}`;
            if (seen.has(k)) {
                setFormError('يوجد تكرار لنفس اسم الوارث مع نفس رقم الهاتف. غيّر الرقم أو الاسم.');
                return;
            }
            seen.add(k);
        }
        const ok = onPartyDeathSave({
            action: 'heir_substitution',
            deceased_party: deceasedParty,
            heir_names,
            heir_details,
        });
        if (ok) handleClose();
    }, [approvedLike, deceasedParty, draftData.heirs, handleClose, onPartyDeathSave]);

    if (!open) return null;

    const title =
        approvedLike
            ? deceasedParty === 'creditor'
                ? 'إحلال الورثة محل الدائن المتوفى'
                : 'إحلال الورثة محل المدين المتوفى'
            : deceasedParty === 'creditor'
              ? 'طلب إحلال الورثة محل الدائن المتوفى'
              : 'طلب إحلال الورثة محل المدين المتوفى';

    return (
        <div
            className="fixed inset-0 z-[195] flex items-center justify-center bg-black/70 p-3"
            role="presentation"
            onClick={handleClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-sm rounded-xl border border-[#E6C673]/25 bg-[#0A0F1C] shadow-xl text-right flex flex-col max-h-[min(560px,90vh)]"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-2.5 py-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10"
                        aria-label="إغلاق"
                    >
                        <X size={16} />
                    </button>
                    <h2 className="text-xs font-bold text-slate-100">{title}</h2>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 space-y-3 text-right">
                    {approvedLike ? (
                        <>
                            <p className="text-[10px] leading-relaxed text-slate-300">
                                الرجاء إدراج بيانات الورثة (الاسم، الهاتف، العنوان).
                            </p>
                            <div className="rounded-lg border border-white/10 bg-slate-900/50 p-2 space-y-2">
                                {draftData.heirs.map((row, idx) => (
										<div key={row.id} className="space-y-1.5 rounded-lg border border-white/10 bg-slate-950/30 p-2" dir="rtl">
											<label className="block text-[10px] text-slate-500">اسم الوارث #{idx + 1}</label>
                                        <input
                                            type="text"
                                            value={row.name}
                                            onChange={(e) => setHeirAt(idx, 'name', e.target.value)}
                                            placeholder="الاسم الكامل..."
                                            dir="rtl"
                                            lang="ar"
                                            autoComplete="off"
                                            spellCheck={false}
                                            className="min-w-0 w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] text-white placeholder:text-slate-600 text-right [unicode-bidi:plaintext]"
                                        />
											<label className="block text-[10px] text-slate-500">رقم هاتف الوارث #{idx + 1}</label>
                                        <input
                                            type="text"
                                            value={row.phone}
                                            onChange={(e) => setHeirAt(idx, 'phone', e.target.value)}
                                            placeholder="رقم الهاتف..."
                                            dir="rtl"
                                            className="min-w-0 w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] text-white placeholder:text-slate-600 text-right"
                                        />
											<label className="block text-[10px] text-slate-500">عنوان الوارث #{idx + 1}</label>
                                        <input
                                            type="text"
                                            value={row.address}
                                            onChange={(e) => setHeirAt(idx, 'address', e.target.value)}
                                            placeholder="العنوان..."
                                            dir="rtl"
                                            className="min-w-0 w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] text-white placeholder:text-slate-600 text-right"
                                        />
                                        {draftData.heirs.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => removeHeirRow(idx)}
                                                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/10"
                                                aria-label="حذف السطر"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        ) : null}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addHeirRow}
                                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[9px] font-bold text-slate-300 hover:bg-white/5"
                                >
                                    <Plus size={12} />
                                    إضافة وريث
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={confirmSubstitution}
                                className="w-full rounded-lg border border-[#E6C673]/35 bg-[#E6C673]/10 py-1.5 text-[10px] font-bold text-[#E6C673]"
                            >
                                حفظ إحلال الورثة
                            </button>
                        </>
                    ) : requestStatus === 'pending' ? (
                        <p className="text-[10px] leading-relaxed text-slate-300">
                            الطلب قيد البت لدى المنفذ. ستظهر حاوية إدراج الورثة بعد الموافقة فقط.
                        </p>
                    ) : requestStatus === 'rejected' ? (
                        <p className="text-[10px] leading-relaxed text-rose-300">
                            رُفض طلب الإحلال (رفض الطلب). لن تظهر حاوية إدراج الورثة.
                        </p>
                    ) : (
                        <p className="text-[10px] leading-relaxed text-slate-300">
                            لا يمكن إدراج الورثة قبل موافقة المنفذ على طلب الإحلال.
                        </p>
                    )}

                    {formError ? (
                        <p className="text-[10px] text-rose-400 text-right">{formError}</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
