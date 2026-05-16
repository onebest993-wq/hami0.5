import React from 'react';
import { X } from 'lucide-react';

export interface DossierMetaEditSectionProps {
    showEditDossierMetaModal: boolean;
    dossierMetaDraft: Record<string, string> | null;
    isEvictionExecutionModule: boolean;
    setShowEditDossierMetaModal: (show: boolean) => void;
    setDossierMetaDraft: (draft: Record<string, string> | null | ((prev: Record<string, string> | null) => Record<string, string> | null)) => void;
    saveDossierMetaDraft: () => void;
}

export const DossierMetaEditSection: React.FC<DossierMetaEditSectionProps> = ({
    showEditDossierMetaModal,
    dossierMetaDraft,
    isEvictionExecutionModule,
    setShowEditDossierMetaModal,
    setDossierMetaDraft,
    saveDossierMetaDraft,
}) => {
    if (!showEditDossierMetaModal || !dossierMetaDraft) return null;

    const baseFields = [
        { k: 'directorate', label: 'اسم المديرية / الجهة' },
        { k: 'fileNumber', label: 'رقم الإضبارة' },
        { k: 'fileYear', label: 'سنة الإضبارة' },
        { k: 'docNumber', label: 'رقم السند / الحكم' },
        { k: 'judgmentDate', label: 'تاريخ الحكم' },
        { k: 'classification', label: 'التصنيف (نص حر)' },
    ] as const;

    const evictionFields = [
        { k: 'property_number', label: 'رقم العقار' },
        { k: 'district', label: 'المقاطعة' },
        { k: 'property_type', label: 'صنف العقار' },
        { k: 'full_address', label: 'مكان العقار (العنوان)' },
    ] as const;

    return (
        <div
            className="fixed inset-0 z-[125] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            dir="rtl"
            onClick={() => {
                setShowEditDossierMetaModal(false);
                setDossierMetaDraft(null);
            }}
            role="presentation"
        >
            <div
                className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-amber-500/30 bg-[#0A0F1C] p-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
            >
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-amber-300">
                        {isEvictionExecutionModule
                            ? 'تعديل بيانات الإضبارة والتخلية'
                            : 'تعديل بيانات الإضبارة'}
                    </h3>
                    <button
                        type="button"
                        onClick={() => {
                            setShowEditDossierMetaModal(false);
                            setDossierMetaDraft(null);
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-3 text-right sm:grid-cols-2">
                    {baseFields.map((f) => (
                        <div key={f.k}>
                            <label className="mb-1 block text-[10px] text-slate-500">{f.label}</label>
                            <input
                                type={f.k === 'judgmentDate' ? 'date' : 'text'}
                                value={dossierMetaDraft[f.k] ?? ''}
                                onChange={(e) =>
                                    setDossierMetaDraft((d) =>
                                        d ? { ...d, [f.k]: e.target.value } : d
                                    )
                                }
                                className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-xs text-white"
                            />
                        </div>
                    ))}
                    {isEvictionExecutionModule ? (
                        <>
                            {evictionFields.map((f) => (
                                <div
                                    key={f.k}
                                    className={f.k === 'full_address' ? 'sm:col-span-2' : ''}
                                >
                                    <label className="mb-1 block text-[10px] text-slate-500">
                                        {f.label}
                                    </label>
                                    <input
                                        type="text"
                                        value={dossierMetaDraft[f.k] ?? ''}
                                        onChange={(e) =>
                                            setDossierMetaDraft((d) =>
                                                d ? { ...d, [f.k]: e.target.value } : d
                                            )
                                        }
                                        className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-xs text-white"
                                    />
                                </div>
                            ))}
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-[10px] text-slate-500">
                                    استعمال العقار (تخلية): تجاري أو سكني
                                </label>
                                <select
                                    value={dossierMetaDraft.eviction_premises_use ?? ''}
                                    onChange={(e) =>
                                        setDossierMetaDraft((d) =>
                                            d ? { ...d, eviction_premises_use: e.target.value } : d
                                        )
                                    }
                                    className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-xs text-white"
                                >
                                    <option value="">— غير محدد —</option>
                                    <option value="commercial">تجاري</option>
                                    <option value="residential">سكني</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <p className="sm:col-span-2 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
                            حقول العقار والتخلية تظهر فقط عندما تكون المطالبة من نوع تخلية مأجور / تسليم عقار.
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={saveDossierMetaDraft}
                    className="mt-4 w-full rounded-lg bg-amber-800/80 py-2.5 text-sm font-bold text-amber-50 hover:bg-amber-700/90"
                >
                    حفظ في ملف الإضبارة
                </button>
            </div>
        </div>
    );
};
