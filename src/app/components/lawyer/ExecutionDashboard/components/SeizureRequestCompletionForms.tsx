import React from 'react';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import { normalizeDigitsOnly } from './seizureRequestsTabHelpers';

export type PropertyCompletionDraft = {
    propertyNumber: string;
    propertyDistrict: string;
    propertyType: string;
};

export type VehicleCompletionDraft = {
    movableDescription: string;
    movableLocation: string;
};

export function SeizureThirdPartyCompletionForm(props: {
    nameDraft: string;
    amountDraft: string;
    onNameChange: (value: string) => void;
    onAmountChange: (value: string) => void;
    canSave: boolean;
    onSave: () => void;
}) {
    const { nameDraft, amountDraft, onNameChange, onAmountChange, canSave, onSave } = props;

    return (
        <div className="space-y-2">
            <p className="text-[10px] text-slate-300 text-right">
                أكمل البيانات هنا بدل نافذة منبثقة:
            </p>
            <div className="grid grid-cols-1 gap-2">
                <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="اسم الجهة الثالثة (مثلاً: مصرف الرافدين)"
                />
                <input
                    type="text"
                    inputMode="numeric"
                    value={amountDraft}
                    onChange={(e) => {
                        const digits = normalizeDigitsOnly(String(e.target.value || ''));
                        onAmountChange(digits ? formatNumberInput(digits) : '');
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right tabular-nums"
                    placeholder="المبلغ المطلوب حجزه (د.ع)"
                />
            </div>
            <button
                type="button"
                disabled={!canSave}
                className="w-full rounded-xl bg-gradient-to-l from-cyan-500 to-sky-700 px-5 py-2.5 text-[12px] font-black text-white shadow-md shadow-black/20 disabled:opacity-40"
                onClick={onSave}
            >
                الحفظ
            </button>
        </div>
    );
}

export function SeizurePropertyCompletionForm(props: {
    draft: PropertyCompletionDraft;
    onDraftChange: (draft: PropertyCompletionDraft) => void;
    onSave: (draft: PropertyCompletionDraft) => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
}) {
    const { draft, onDraftChange, onSave, showToast } = props;

    return (
        <div className="space-y-2">
            {/* حقول موسّعة داخل كتلة مقيّدة الارتفاع — زر الحفظ يبقى مثبتاً بمتناول الإبهام */}
            <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1 md:max-h-[300px]">
                <input
                    type="text"
                    value={draft.propertyNumber}
                    onChange={(e) => onDraftChange({ ...draft, propertyNumber: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="رقم العقار"
                />
                <input
                    type="text"
                    value={draft.propertyDistrict}
                    onChange={(e) => onDraftChange({ ...draft, propertyDistrict: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="المقاطعة"
                />
                <input
                    type="text"
                    value={draft.propertyType}
                    onChange={(e) => onDraftChange({ ...draft, propertyType: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="نوع العقار"
                />
            </div>
            <button
                type="button"
                disabled={
                    !String(draft.propertyNumber || '').trim() ||
                    !String(draft.propertyDistrict || '').trim() ||
                    !String(draft.propertyType || '').trim()
                }
                onClick={() => {
                    if (!String(draft.propertyNumber || '').trim()) return showToast('أدخل رقم العقار', 'warning');
                    if (!String(draft.propertyDistrict || '').trim()) return showToast('أدخل المقاطعة', 'warning');
                    if (!String(draft.propertyType || '').trim()) return showToast('أدخل نوع العقار', 'warning');
                    onSave(draft);
                }}
                className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
            >
                حفظ التفاصيل
            </button>
        </div>
    );
}

export function SeizureVehicleCompletionForm(props: {
    draft: VehicleCompletionDraft;
    onDraftChange: (draft: VehicleCompletionDraft) => void;
    onSave: (draft: VehicleCompletionDraft) => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
}) {
    const { draft, onDraftChange, onSave, showToast } = props;

    return (
        <div className="space-y-2">
            <input
                type="text"
                value={draft.movableDescription}
                onChange={(e) => onDraftChange({ ...draft, movableDescription: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                placeholder="وصف المال المنقول"
            />
            <input
                type="text"
                value={draft.movableLocation}
                onChange={(e) => onDraftChange({ ...draft, movableLocation: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                placeholder="مكان تواجد المال المنقول"
            />
            <button
                type="button"
                disabled={
                    !String(draft.movableDescription || '').trim() ||
                    !String(draft.movableLocation || '').trim()
                }
                onClick={() => {
                    if (!String(draft.movableDescription || '').trim())
                        return showToast('أدخل وصف المال المنقول', 'warning');
                    if (!String(draft.movableLocation || '').trim())
                        return showToast('أدخل مكان تواجد المال المنقول', 'warning');
                    onSave(draft);
                }}
                className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
            >
                حفظ التفاصيل
            </button>
        </div>
    );
}
