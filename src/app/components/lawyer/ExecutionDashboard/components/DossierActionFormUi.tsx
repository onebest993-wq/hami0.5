import React from 'react';
import { Building2 } from '@/app/components/ui/icons/Building2';
import { Target } from '@/app/components/ui/icons/Target';
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';
import { FileInput } from '@/app/components/ui/icons/FileInput';
import { Send } from '@/app/components/ui/icons/Send';
import type { ExecutionFile } from '@/app/types/execution';
import type { DossierActionType } from './DossierActionTypes';
import type { useDossierActionForm } from './useDossierActionForm';
import { EXEC_MODAL_TOUCH_TARGET } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';

export type DossierActionFormFieldsProps = {
    actionType: DossierActionType;
    form: ReturnType<typeof useDossierActionForm>;
    inabaTargets?: { id: string; directorate: string }[];
};

export const DossierActionFormFields: React.FC<DossierActionFormFieldsProps> = ({
    actionType,
    form,
    inabaTargets,
}) => {
    const {
        today,
        availableDossiers,
        delegationTargetDirectorate,
        setDelegationTargetDirectorate,
        delegationPurpose,
        setDelegationPurpose,
        selectedOwnId,
        setSelectedOwnId,
        transferTargetDirectorate,
        setTransferTargetDirectorate,
        renewalReason,
        setRenewalReason,
        inabaSubFileId,
        setInabaSubFileId,
        inabaSubject,
        setInabaSubject,
    } = form;

    return (
        <div className="space-y-3 text-right" dir="rtl">
            {actionType !== 'unify' ? (
                <div>
                    <label className="mb-1 block text-[9px] text-slate-400">تاريخ الطلب</label>
                    <input
                        type="date"
                        value={today}
                        readOnly
                        className="w-full cursor-default rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white"
                    />
                </div>
            ) : null}

            {actionType === 'delegation' ? (
                <>
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Building2 size={13} className="text-amber-400" />
                            الدائرة المناب إليها
                        </label>
                        <input
                            type="text"
                            value={delegationTargetDirectorate}
                            onChange={(e) => setDelegationTargetDirectorate(e.target.value)}
                            placeholder="أدخل اسم الدائرة / المحكمة المناب إليها..."
                            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white placeholder:text-white/20 focus:border-amber-500/50 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Target size={13} className="text-amber-400" />
                            الغاية من الإنابة
                        </label>
                        <textarea
                            value={delegationPurpose}
                            onChange={(e) => setDelegationPurpose(e.target.value)}
                            placeholder="صف الغاية من الإنابة التنفيذية..."
                            rows={3}
                            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white placeholder:text-white/20 focus:border-amber-500/50 focus:outline-none"
                        />
                    </div>
                </>
            ) : null}

            {actionType === 'unify' ? (
                <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <FileInput size={13} className="text-amber-400" />
                        الإضبارة المراد دمجها
                    </label>
                    <p className="mb-2 text-[10px] text-slate-400">
                        اختيار إضبارة من مخزنك لتصبح فرعية بعد موافقة المنفذ
                    </p>
                    <select
                        value={selectedOwnId}
                        onChange={(e) => setSelectedOwnId(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[11px] text-white outline-none focus:border-amber-500/50"
                    >
                        <option value="">-- اختر إضبارة --</option>
                        {availableDossiers.length > 0 ? (
                            availableDossiers.map((dossier: ExecutionFile) => (
                                <option key={dossier.id} value={dossier.id}>
                                    {dossier.fileNumber || '---'} / {dossier.fileYear || '---'} —{' '}
                                    {String(dossier.directorate || '').trim() || '---'}
                                </option>
                            ))
                        ) : (
                            <option disabled value="">
                                لا توجد أضابير قابلة للدمج
                            </option>
                        )}
                    </select>
                </div>
            ) : null}

            {actionType === 'transfer' ? (
                <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <Building2 size={13} className="text-amber-400" />
                        الدائرة المراد النقل إليها
                    </label>
                    <input
                        type="text"
                        value={transferTargetDirectorate}
                        onChange={(e) => setTransferTargetDirectorate(e.target.value)}
                        placeholder="أدخل اسم الدائرة..."
                        className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white placeholder:text-white/20 focus:border-amber-500/50 focus:outline-none"
                    />
                </div>
            ) : null}

            {actionType === 'renew' ? (
                <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <AlertCircle size={13} className="text-amber-400" />
                        سبب التجديد
                    </label>
                    <textarea
                        value={renewalReason}
                        onChange={(e) => setRenewalReason(e.target.value)}
                        placeholder="اذكر سبب طلب تجديد الإضبارة..."
                        rows={3}
                        className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white placeholder:text-white/20 focus:border-amber-500/50 focus:outline-none"
                    />
                </div>
            ) : null}

            {actionType === 'inaba_correspondence' ? (
                <>
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Building2 size={13} className="text-amber-400" />
                            مديرية الإنابة المراد مخاطبتها
                        </label>
                        {Array.isArray(inabaTargets) && inabaTargets.length > 1 ? (
                            <select
                                value={inabaSubFileId}
                                onChange={(e) => setInabaSubFileId(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[11px] text-white outline-none focus:border-amber-500/50"
                            >
                                <option value="">-- اختر مديرية الإنابة --</option>
                                {inabaTargets.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.directorate || '---'}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                readOnly
                                value={String(inabaTargets?.[0]?.directorate || '').trim() || '—'}
                                className="w-full cursor-default rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white"
                            />
                        )}
                    </div>
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Target size={13} className="text-amber-400" />
                            موضوع المخاطبة
                        </label>
                        <textarea
                            value={inabaSubject}
                            onChange={(e) => setInabaSubject(e.target.value)}
                            placeholder="مثال: طلب تحويل أموال / طلب إجراء معين..."
                            rows={3}
                            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white placeholder:text-white/20 focus:border-amber-500/50 focus:outline-none"
                        />
                    </div>
                </>
            ) : null}
        </div>
    );
};

export type DossierActionFormFooterProps = {
    saving?: boolean;
    disabled: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

export const DossierActionFormFooter: React.FC<DossierActionFormFooterProps> = ({
    saving,
    disabled,
    onCancel,
    onConfirm,
}) => (
    <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
        <button
            type="button"
            onClick={onCancel}
            className={`flex-1 rounded-xl border border-white/10 py-2.5 text-[11px] font-bold text-slate-300 transition hover:bg-white/5 ${EXEC_MODAL_TOUCH_TARGET}`}
        >
            إلغاء
        </button>
        <button
            type="button"
            onClick={onConfirm}
            disabled={disabled || saving}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-600/80 py-2.5 text-[11px] font-bold text-white transition hover:bg-amber-600 disabled:opacity-50 ${EXEC_MODAL_TOUCH_TARGET}`}
        >
            <Send size={14} />
            {saving ? 'جاري الإرسال...' : 'تأكيد وإرسال للمنفذ'}
        </button>
    </div>
);

