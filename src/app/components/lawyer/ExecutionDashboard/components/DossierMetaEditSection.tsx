import React from 'react';
import { X } from '@/app/components/ui/lucideIcons';
import { fileHasSpecificDeliveryClaim } from '@/app/utils/executionDossierHeaderFields';
import type { ExecutionFile } from '@/app/types/execution';

function parseFileRef(value: string): { fileNumber: string; fileYear: string } {
    const raw = String(value || '').trim();
    if (!raw) return { fileNumber: '', fileYear: '' };
    const parts = raw.split('/').map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
        return { fileNumber: parts[0] ?? '', fileYear: parts[parts.length - 1] ?? '' };
    }
    return { fileNumber: raw, fileYear: '' };
}

const fieldClass =
    'w-full min-h-[44px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-amber-500/45 focus:ring-1 focus:ring-amber-500/25';

const labelClass = 'mb-1.5 block text-[11px] font-medium text-amber-200/70';

export interface DossierMetaEditSectionProps {
    showEditDossierMetaModal: boolean;
    dossierMetaDraft: Record<string, string> | null;
    isEvictionExecutionModule: boolean;
    setShowEditDossierMetaModal: (show: boolean) => void;
    setDossierMetaDraft: (
        draft:
            | Record<string, string>
            | null
            | ((prev: Record<string, string> | null) => Record<string, string> | null),
    ) => void;
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

    const isSpecificDeliveryClaim = fileHasSpecificDeliveryClaim({
        claimType: dossierMetaDraft.claimType,
    } as ExecutionFile);

    const fileRefDisplay = [dossierMetaDraft.fileNumber, dossierMetaDraft.fileYear]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(' / ');

    const evictionFields = [
        { k: 'property_number', label: 'رقم العقار' },
        { k: 'district', label: 'المقاطعة' },
        { k: 'property_type', label: 'صنف العقار' },
        { k: 'full_address', label: 'مكان العقار (العنوان)' },
    ] as const;

    const close = () => {
        setShowEditDossierMetaModal(false);
        setDossierMetaDraft(null);
    };

    return (
        <div
            className="fixed inset-0 z-[125] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
            dir="rtl"
            onClick={close}
            role="presentation"
        >
            <div
                className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-amber-500/25 bg-gradient-to-b from-[#0F172A] to-[#0A0F1C] shadow-2xl sm:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dossier-meta-edit-title"
            >
                <div className="shrink-0 border-b border-amber-500/20 bg-[#0B1120]/90 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 text-right">
                            <p className="text-[10px] font-medium tracking-wide text-amber-500/70">
                                الإضبارة التنفيذية
                            </p>
                            <h3
                                id="dossier-meta-edit-title"
                                className="mt-0.5 text-base font-bold text-amber-200"
                            >
                                {isEvictionExecutionModule
                                    ? 'تعديل بيانات الإضبارة والتخلية'
                                    : 'تعديل بيانات الإضبارة'}
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={close}
                            className="inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white"
                            aria-label="إغلاق"
                        >
                            <X size={20} aria-hidden />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
                    <section className="space-y-3 rounded-2xl border border-white/8 bg-slate-900/40 p-3">
                        <h4 className="text-[11px] font-bold text-slate-400">بيانات الإضبارة</h4>
                        <div>
                            <label className={labelClass} htmlFor="dossier-meta-directorate">
                                اسم المديرية / الجهة
                            </label>
                            <input
                                id="dossier-meta-directorate"
                                type="text"
                                value={dossierMetaDraft.directorate ?? ''}
                                onChange={(e) =>
                                    setDossierMetaDraft((d) =>
                                        d ? { ...d, directorate: e.target.value } : d,
                                    )
                                }
                                className={fieldClass}
                                data-testid="execution-dossier-meta-directorate"
                            />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="dossier-meta-fileNumber">
                                رقم الإضبارة (الرقم / السنة)
                            </label>
                            <input
                                id="dossier-meta-fileNumber"
                                type="text"
                                value={fileRefDisplay}
                                onChange={(e) => {
                                    const parsed = parseFileRef(e.target.value);
                                    setDossierMetaDraft((d) =>
                                        d
                                            ? {
                                                  ...d,
                                                  fileNumber: parsed.fileNumber,
                                                  fileYear: parsed.fileYear || d.fileYear,
                                              }
                                            : d,
                                    );
                                }}
                                className={fieldClass}
                                data-testid="execution-dossier-meta-fileNumber"
                                placeholder="مثال: 123 / 2026"
                            />
                        </div>
                    </section>

                    <section className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-950/15 p-3">
                        <h4 className="text-[11px] font-bold text-amber-200/80">السند والحكم</h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelClass} htmlFor="dossier-meta-docNumber">
                                    رقم السند / الحكم
                                </label>
                                <input
                                    id="dossier-meta-docNumber"
                                    type="text"
                                    value={dossierMetaDraft.docNumber ?? ''}
                                    onChange={(e) =>
                                        setDossierMetaDraft((d) =>
                                            d ? { ...d, docNumber: e.target.value } : d,
                                        )
                                    }
                                    className={fieldClass}
                                    data-testid="execution-dossier-meta-docNumber"
                                    placeholder="رقم الحكم أو السند"
                                />
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="dossier-meta-judgmentDate">
                                    تاريخ الحكم
                                </label>
                                <input
                                    id="dossier-meta-judgmentDate"
                                    type="date"
                                    value={dossierMetaDraft.judgmentDate ?? ''}
                                    onChange={(e) =>
                                        setDossierMetaDraft((d) =>
                                            d ? { ...d, judgmentDate: e.target.value } : d,
                                        )
                                    }
                                    className={fieldClass}
                                    data-testid="execution-dossier-meta-judgmentDate"
                                />
                            </div>
                        </div>
                    </section>

                    {isEvictionExecutionModule ? (
                        <section className="space-y-3 rounded-2xl border border-white/8 bg-slate-900/40 p-3">
                            <h4 className="text-[11px] font-bold text-slate-400">بيانات التخلية</h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {evictionFields.map((f) => (
                                    <div
                                        key={f.k}
                                        className={f.k === 'full_address' ? 'sm:col-span-2' : ''}
                                    >
                                        <label className={labelClass} htmlFor={`dossier-meta-${f.k}`}>
                                            {f.label}
                                        </label>
                                        <input
                                            id={`dossier-meta-${f.k}`}
                                            type="text"
                                            value={dossierMetaDraft[f.k] ?? ''}
                                            onChange={(e) =>
                                                setDossierMetaDraft((d) =>
                                                    d ? { ...d, [f.k]: e.target.value } : d,
                                                )
                                            }
                                            className={fieldClass}
                                        />
                                    </div>
                                ))}
                                <div className="sm:col-span-2">
                                    <label
                                        className={labelClass}
                                        htmlFor="dossier-meta-eviction-use"
                                    >
                                        استعمال العقار (تخلية): تجاري أو سكني
                                    </label>
                                    <select
                                        id="dossier-meta-eviction-use"
                                        value={dossierMetaDraft.eviction_premises_use ?? ''}
                                        onChange={(e) =>
                                            setDossierMetaDraft((d) =>
                                                d
                                                    ? { ...d, eviction_premises_use: e.target.value }
                                                    : d,
                                            )
                                        }
                                        className={fieldClass}
                                    >
                                        <option value="">— غير محدد —</option>
                                        <option value="commercial">تجاري</option>
                                        <option value="residential">سكني</option>
                                    </select>
                                </div>
                            </div>
                        </section>
                    ) : isSpecificDeliveryClaim ? (
                        <section className="space-y-3 rounded-2xl border border-white/8 bg-slate-900/40 p-3">
                            <h4 className="text-[11px] font-bold text-slate-400">التسليم العيني</h4>
                            <div>
                                <label
                                    className={labelClass}
                                    htmlFor="dossier-meta-delivery-name"
                                >
                                    الشيء المراد تسليمه
                                </label>
                                <input
                                    id="dossier-meta-delivery-name"
                                    type="text"
                                    value={dossierMetaDraft.specificDeliveryItemName ?? ''}
                                    onChange={(e) =>
                                        setDossierMetaDraft((d) =>
                                            d
                                                ? {
                                                      ...d,
                                                      specificDeliveryItemName: e.target.value,
                                                  }
                                                : d,
                                        )
                                    }
                                    className={fieldClass}
                                />
                            </div>
                            <div>
                                <label
                                    className={labelClass}
                                    htmlFor="dossier-meta-delivery-nature"
                                >
                                    طبيعة الشيء
                                </label>
                                <select
                                    id="dossier-meta-delivery-nature"
                                    value={dossierMetaDraft.specificDeliveryItemNature ?? ''}
                                    onChange={(e) =>
                                        setDossierMetaDraft((d) =>
                                            d
                                                ? {
                                                      ...d,
                                                      specificDeliveryItemNature: e.target.value,
                                                  }
                                                : d,
                                        )
                                    }
                                    className={fieldClass}
                                >
                                    <option value="">— غير محدد —</option>
                                    <option value="movable">منقول</option>
                                    <option value="immovable">غير منقول</option>
                                </select>
                            </div>
                        </section>
                    ) : null}
                </div>

                <div className="shrink-0 border-t border-white/10 bg-[#0B1120]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={saveDossierMetaDraft}
                        className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl bg-gradient-to-l from-amber-700 to-amber-600 text-sm font-bold text-amber-50 shadow-lg shadow-amber-900/30 transition hover:from-amber-600 hover:to-amber-500"
                    >
                        حفظ في ملف الإضبارة
                    </button>
                </div>
            </div>
        </div>
    );
};
