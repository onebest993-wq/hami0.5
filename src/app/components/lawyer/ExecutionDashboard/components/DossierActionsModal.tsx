import React, { useMemo, useState } from 'react';
import { X, Send, Forward, Shuffle, FileText, RefreshCw, Building2, Target, AlertCircle, FileInput, Link, MessageSquare } from 'lucide-react';
import { storageCache } from '@/app/utils/storageCache';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { purgeExpiredExecutionsFromTrash, isExecutionInTrash } from '@/app/utils/executionTrash';
import type { ExecutionFile } from '@/app/types/execution';

export type DossierActionType = 'delegation' | 'unify' | 'transfer' | 'renew' | 'inaba_correspondence';

interface DossierActionMeta {
    label: string;
    icon: React.ReactNode;
}

const ACTION_META: Record<DossierActionType, DossierActionMeta> = {
    delegation: { label: 'طلب الإنابة التنفيذية', icon: <Forward size={16} /> },
    unify: { label: 'طلب توحيد الأضابير', icon: <Shuffle size={16} /> },
    transfer: { label: 'طلب نقل الإضبارة', icon: <FileText size={16} /> },
    renew: { label: 'طلب تجديد الإضبارة', icon: <RefreshCw size={16} /> },
    inaba_correspondence: { label: 'طلب مخاطبة الإنابة', icon: <MessageSquare size={16} /> },
};

export interface DossierActionPayload {
    actionType: DossierActionType;
    delegationTargetDirectorate?: string;
    delegationPurpose?: string;
    unificationTargetType?: 'own' | 'colleague';
    unificationTargetId?: string;
    unificationColleagueToken?: string;
    unificationTargetMeta?: { directorate?: string; fileNumber?: string; fileYear?: string };
    transferTargetDirectorate?: string;
    transferReason?: string;
    renewalReason?: string;
    inabaCorrespondenceSubFileId?: string;
    inabaCorrespondenceDirectorate?: string;
    inabaCorrespondenceSubject?: string;
}

interface DossierActionsModalProps {
    open: boolean;
    actionType: DossierActionType | null;
    onClose: () => void;
    onConfirm: (payload: DossierActionPayload) => void;
    saving?: boolean;
    currentFileId?: string;
    inabaTargets?: { id: string; directorate: string }[];
}

export const DossierActionsModal: React.FC<DossierActionsModalProps> = ({
    open,
    actionType,
    onClose,
    onConfirm,
    saving,
    currentFileId,
    inabaTargets,
}) => {
    const [delegationTargetDirectorate, setDelegationTargetDirectorate] = useState('');
    const [delegationPurpose, setDelegationPurpose] = useState('');
    const [unificationType, setUnificationType] = useState<'own' | 'colleague'>('own');
    const [selectedOwnId, setSelectedOwnId] = useState('');
    const [colleagueToken, setColleagueToken] = useState('');
    const [transferTargetDirectorate, setTransferTargetDirectorate] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const [renewalReason, setRenewalReason] = useState('');
    const [inabaSubFileId, setInabaSubFileId] = useState('');
    const [inabaSubject, setInabaSubject] = useState('');

    const resetFields = () => {
        setDelegationTargetDirectorate('');
        setDelegationPurpose('');
        setUnificationType('own');
        setSelectedOwnId('');
        setColleagueToken('');
        setTransferTargetDirectorate('');
        setTransferReason('');
        setRenewalReason('');
        setInabaSubFileId('');
        setInabaSubject('');
    };

    const effectiveActionType: DossierActionType = actionType ?? 'delegation';
    const meta = ACTION_META[effectiveActionType];
    const today = new Date().toISOString().slice(0, 10);
    const availableDossiers = useMemo(() => {
        if (!open || effectiveActionType !== 'unify') return [] as ExecutionFile[];
        try {
            const cached = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
            const allFiles: ExecutionFile[] = Array.isArray(cached) ? (cached as ExecutionFile[]) : [];
            const cleanFiles = purgeExpiredExecutionsFromTrash(allFiles);
            const currentId = String(currentFileId || '').trim();
            const seen = new Set<string>();
            return cleanFiles.filter((d) => {
                const id = String(d?.id || '').trim();
                if (!id) return false;
                if (seen.has(id)) return false;
                seen.add(id);
                if (currentId && id === currentId) return false;
                if (isExecutionInTrash(d as any)) return false;
                const isActive = d.dossier_lifecycle_status === 'active' || !d.dossier_lifecycle_status;
                if (!isActive) return false;
                const hasValidNumber = d.fileNumber && String(d.fileNumber).trim().length > 0;
                if (!hasValidNumber) return false;
                const notAlreadyChild = !(d as any).parentId;
                if (!notAlreadyChild) return false;
                return true;
            });
        } catch {
            return [] as ExecutionFile[];
        }
    }, [open, effectiveActionType, currentFileId]);

    if (!open || !actionType) return null;

    const handleConfirm = () => {
        const payload: DossierActionPayload = { actionType };
        if (actionType === 'delegation') {
            payload.delegationTargetDirectorate = delegationTargetDirectorate.trim();
            payload.delegationPurpose = delegationPurpose.trim();
        } else if (actionType === 'unify') {
            payload.unificationTargetType = unificationType;
            if (unificationType === 'own') {
                payload.unificationTargetId = selectedOwnId.trim();
                const selected = availableDossiers.find((d) => String(d.id) === String(selectedOwnId));
                payload.unificationTargetMeta = {
                    directorate: (selected?.directorate as string) || undefined,
                    fileNumber: selected?.fileNumber || undefined,
                    fileYear: (selected as any)?.fileYear || undefined,
                };
            } else {
                payload.unificationColleagueToken = colleagueToken.trim();
            }
        } else if (actionType === 'transfer') {
            payload.transferTargetDirectorate = transferTargetDirectorate.trim();
        } else if (actionType === 'renew') {
            payload.renewalReason = renewalReason.trim();
        } else if (actionType === 'inaba_correspondence') {
            const targets = Array.isArray(inabaTargets) ? inabaTargets : [];
            const selectedId = String(inabaSubFileId || '').trim() || String(targets[0]?.id || '').trim();
            const selected = targets.find((t) => String(t.id) === selectedId) || targets[0];
            payload.inabaCorrespondenceSubFileId = selectedId;
            payload.inabaCorrespondenceDirectorate = String(selected?.directorate || '').trim();
            payload.inabaCorrespondenceSubject = inabaSubject.trim();
        }
        onConfirm(payload);
        resetFields();
    };

    const isConfirmDisabled = (() => {
        if (saving) return true;
        if (actionType === 'delegation') return !delegationTargetDirectorate.trim() || !delegationPurpose.trim();
        if (actionType === 'unify') {
            if (unificationType === 'own') return !selectedOwnId.trim();
            return !colleagueToken.trim();
        }
        if (actionType === 'transfer') return !transferTargetDirectorate.trim();
        if (actionType === 'renew') return !renewalReason.trim();
        if (actionType === 'inaba_correspondence') {
            const targets = Array.isArray(inabaTargets) ? inabaTargets : [];
            const selectedId = String(inabaSubFileId || '').trim() || String(targets[0]?.id || '').trim();
            return !selectedId || !inabaSubject.trim();
        }
        return false;
    })();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-2xl border border-amber-500/20 bg-[#0A0F1C] shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                        {meta.icon}
                        <span className="text-[13px] font-bold text-amber-200">{meta.label}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 text-right" dir="rtl">
                    <div className="rounded-xl bg-amber-950/20 border border-amber-500/10 p-3">
                        <p className="text-[10px] text-amber-300/70 leading-relaxed">
                            سيتم إرسال هذا الطلب إلى قسم القرارات والطعون لانتظار موافقة المنفذ.
                        </p>
                    </div>

                    {actionType !== 'unify' && (
                        <div>
                            <label className="mb-1 block text-[9px] text-slate-400">تاريخ الطلب</label>
                            <input
                                type="date"
                                value={today}
                                readOnly
                                className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] cursor-default"
                            />
                        </div>
                    )}

                    {/* Delegation fields */}
                    {actionType === 'delegation' && (
                        <>
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                    <Building2 size={13} className="text-amber-400" />
                                    الدائرة المناب إليها
                                </label>
                                <input
                                    type="text"
                                    value={delegationTargetDirectorate}
                                    onChange={(e) => setDelegationTargetDirectorate(e.target.value)}
                                    placeholder="أدخل اسم الدائرة / المحكمة المناب إليها..."
                                    className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-amber-500/50 placeholder:text-white/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                    <Target size={13} className="text-amber-400" />
                                    الغاية من الإنابة
                                </label>
                                <textarea
                                    value={delegationPurpose}
                                    onChange={(e) => setDelegationPurpose(e.target.value)}
                                    placeholder="صف الغاية من الإنابة التنفيذية..."
                                    rows={3}
                                    className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-amber-500/50 placeholder:text-white/20 resize-none"
                                />
                            </div>
                        </>
                    )}

                    {/* Unification fields */}
                    {actionType === 'unify' && (
                        <>
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                    <FileInput size={13} className="text-amber-400" />
                                    الإضبارة المراد دمجها
                                </label>
                                <div className="space-y-2">
                                    <div className={`rounded-xl border transition-colors ${unificationType === 'own' ? 'border-amber-500/30 bg-amber-950/15' : 'border-white/10 bg-black/10'}`}>
                                        <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors">
                                            <input
                                                type="radio"
                                                name="unificationTargetType"
                                                checked={unificationType === 'own'}
                                                onChange={() => setUnificationType('own')}
                                                className="accent-amber-500"
                                            />
                                            <div className="min-w-0">
                                                <span className="text-[11px] font-bold text-white">إضبارة خاصة بي</span>
                                                <p className="text-[10px] text-slate-400">اختيار إضبارة من المخزن لتصبح فرعية بعد الموافقة</p>
                                            </div>
                                        </label>
                                        {unificationType === 'own' && (
                                            <div className="px-3 pb-3">
                                                <select
                                                    value={selectedOwnId}
                                                    onChange={(e) => setSelectedOwnId(e.target.value)}
                                                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[11px] text-white outline-none focus:border-amber-500/50"
                                                >
                                                    <option value="">-- اختر إضبارة --</option>
                                                    {availableDossiers.length > 0 ? (
                                                        availableDossiers.map((dossier: ExecutionFile) => (
                                                            <option key={dossier.id} value={dossier.id}>
                                                                {dossier.fileNumber || '---'} / {(dossier as any).fileYear || '---'} — {String(dossier.directorate || '').trim() || '---'}
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <option disabled value="">لا توجد أضابير قابلة للدمج</option>
                                                    )}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`rounded-xl border transition-colors ${unificationType === 'colleague' ? 'border-amber-500/30 bg-amber-950/15' : 'border-white/10 bg-black/10'}`}>
                                        <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors">
                                            <input
                                                type="radio"
                                                name="unificationTargetType"
                                                checked={unificationType === 'colleague'}
                                                onChange={() => setUnificationType('colleague')}
                                                className="accent-amber-500"
                                            />
                                            <div className="min-w-0">
                                                <span className="text-[11px] font-bold text-white">إضبارة زميل</span>
                                                <p className="text-[10px] text-slate-400">أدخل رمز الربط المرسل من الزميل</p>
                                            </div>
                                        </label>
                                        {unificationType === 'colleague' && (
                                            <div className="px-3 pb-3">
                                                <div className="relative">
                                                    <Link size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={colleagueToken}
                                                        onChange={(e) => setColleagueToken(e.target.value)}
                                                        placeholder="أدخل رمز الربط"
                                                        className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pr-9 pl-3 text-[11px] text-white outline-none placeholder:text-white/20 focus:border-amber-500/50"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Transfer fields */}
                    {actionType === 'transfer' && (
                        <>
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                    <Building2 size={13} className="text-amber-400" />
                                    الدائرة المراد النقل إليها
                                </label>
                                <input
                                    type="text"
                                    value={transferTargetDirectorate}
                                    onChange={(e) => setTransferTargetDirectorate(e.target.value)}
                                    placeholder="أدخل اسم الدائرة..."
                                    className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-amber-500/50 placeholder:text-white/20"
                                />
                            </div>
                        </>
                    )}

                    {/* Renewal fields */}
                    {actionType === 'renew' && (
                        <div>
                            <label className="mb-1.5 block text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                <AlertCircle size={13} className="text-amber-400" />
                                سبب التجديد
                            </label>
                            <textarea
                                value={renewalReason}
                                onChange={(e) => setRenewalReason(e.target.value)}
                                placeholder="اذكر سبب طلب تجديد الإضبارة..."
                                rows={3}
                                className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-amber-500/50 placeholder:text-white/20 resize-none"
                            />
                        </div>
                    )}

                    {/* Inaba correspondence fields */}
                    {actionType === 'inaba_correspondence' && (
                        <>
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
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
                                        className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] cursor-default"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                    <Target size={13} className="text-amber-400" />
                                    موضوع المخاطبة
                                </label>
                                <textarea
                                    value={inabaSubject}
                                    onChange={(e) => setInabaSubject(e.target.value)}
                                    placeholder="مثال: طلب تحويل أموال / طلب إجراء معين..."
                                    rows={3}
                                    className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-amber-500/50 placeholder:text-white/20 resize-none"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 border-t border-white/10 px-5 py-3.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-white/10 py-2.5 text-[11px] font-bold text-slate-300 hover:bg-white/5 transition-colors"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-600/80 py-2.5 text-[11px] font-bold text-white border border-amber-500/30 hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                        <Send size={14} />
                        {saving ? 'جاري الإرسال...' : 'تأكيد وإرسال للمنفذ'}
                    </button>
                </div>
            </div>
        </div>
    );
};
