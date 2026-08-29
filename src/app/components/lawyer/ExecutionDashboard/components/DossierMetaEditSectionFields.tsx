import React from 'react';

const DOSSIER_META_FIELD_CLASS =
    'w-full min-h-[44px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-amber-500/45 focus:ring-1 focus:ring-amber-500/25';

const DOSSIER_META_LABEL_CLASS = 'mb-1.5 block text-[11px] font-medium text-amber-200/70';

function parseDossierMetaFileRef(value: string): { fileNumber: string; fileYear: string } {
    const raw = String(value || '').trim();
    if (!raw) return { fileNumber: '', fileYear: '' };
    const parts = raw.split('/').map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
        return { fileNumber: parts[0] ?? '', fileYear: parts[parts.length - 1] ?? '' };
    }
    return { fileNumber: raw, fileYear: '' };
}

const evictionFields = [
    { k: 'property_number', label: 'رقم العقار' },
    { k: 'district', label: 'المقاطعة' },
    { k: 'property_type', label: 'صنف العقار' },
    { k: 'full_address', label: 'مكان العقار (العنوان)' },
] as const;

export function DossierMetaEditSectionFields({
    dossierMetaDraft,
    fileRefDisplay,
    isEvictionExecutionModule,
    isSpecificDeliveryClaim,
    setDossierMetaDraft,
}: {
    dossierMetaDraft: Record<string, string>;
    fileRefDisplay: string;
    isEvictionExecutionModule: boolean;
    isSpecificDeliveryClaim: boolean;
    setDossierMetaDraft: (
        draft:
            | Record<string, string>
            | null
            | ((prev: Record<string, string> | null) => Record<string, string> | null),
    ) => void;
}) {
    return (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
            <section className="space-y-3 rounded-2xl border border-white/8 bg-slate-900/40 p-3">
                <h4 className="text-[11px] font-bold text-slate-400">بيانات الإضبارة</h4>
                <div>
                    <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-directorate">
                        اسم المديرية / الجهة
                    </label>
                    <input
                        id="dossier-meta-directorate"
                        type="text"
                        value={dossierMetaDraft.directorate ?? ''}
                        onChange={(e) =>
                            setDossierMetaDraft((d) => (d ? { ...d, directorate: e.target.value } : d))
                        }
                        className={DOSSIER_META_FIELD_CLASS}
                        data-testid="execution-dossier-meta-directorate"
                    />
                </div>
                <div>
                    <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-fileNumber">
                        رقم الإضبارة (الرقم / السنة)
                    </label>
                    <input
                        id="dossier-meta-fileNumber"
                        type="text"
                        value={fileRefDisplay}
                        onChange={(e) => {
                            const parsed = parseDossierMetaFileRef(e.target.value);
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
                        className={DOSSIER_META_FIELD_CLASS}
                        data-testid="execution-dossier-meta-fileNumber"
                        placeholder="مثال: 123 / 2026"
                    />
                </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-950/15 p-3">
                <h4 className="text-[11px] font-bold text-amber-200/80">السند والحكم</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-docNumber">
                            رقم السند / الحكم
                        </label>
                        <input
                            id="dossier-meta-docNumber"
                            type="text"
                            value={dossierMetaDraft.docNumber ?? ''}
                            onChange={(e) =>
                                setDossierMetaDraft((d) => (d ? { ...d, docNumber: e.target.value } : d))
                            }
                            className={DOSSIER_META_FIELD_CLASS}
                            data-testid="execution-dossier-meta-docNumber"
                            placeholder="رقم الحكم أو السند"
                        />
                    </div>
                    <div>
                        <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-judgmentDate">
                            تاريخ الحكم
                        </label>
                        <input
                            id="dossier-meta-judgmentDate"
                            type="date"
                            value={dossierMetaDraft.judgmentDate ?? ''}
                            onChange={(e) =>
                                setDossierMetaDraft((d) => (d ? { ...d, judgmentDate: e.target.value } : d))
                            }
                            className={DOSSIER_META_FIELD_CLASS}
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
                            <div key={f.k} className={f.k === 'full_address' ? 'sm:col-span-2' : ''}>
                                <label className={DOSSIER_META_LABEL_CLASS} htmlFor={`dossier-meta-${f.k}`}>
                                    {f.label}
                                </label>
                                <input
                                    id={`dossier-meta-${f.k}`}
                                    type="text"
                                    value={dossierMetaDraft[f.k] ?? ''}
                                    onChange={(e) =>
                                        setDossierMetaDraft((d) => (d ? { ...d, [f.k]: e.target.value } : d))
                                    }
                                    className={DOSSIER_META_FIELD_CLASS}
                                />
                            </div>
                        ))}
                        <div className="sm:col-span-2">
                            <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-eviction-use">
                                استعمال العقار (تخلية): تجاري أو سكني
                            </label>
                            <select
                                id="dossier-meta-eviction-use"
                                value={dossierMetaDraft.eviction_premises_use ?? ''}
                                onChange={(e) =>
                                    setDossierMetaDraft((d) =>
                                        d ? { ...d, eviction_premises_use: e.target.value } : d,
                                    )
                                }
                                className={DOSSIER_META_FIELD_CLASS}
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
                        <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-delivery-name">
                            الشيء المراد تسليمه
                        </label>
                        <input
                            id="dossier-meta-delivery-name"
                            type="text"
                            value={dossierMetaDraft.specificDeliveryItemName ?? ''}
                            onChange={(e) =>
                                setDossierMetaDraft((d) =>
                                    d ? { ...d, specificDeliveryItemName: e.target.value } : d,
                                )
                            }
                            className={DOSSIER_META_FIELD_CLASS}
                        />
                    </div>
                    <div>
                        <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-delivery-nature">
                            طبيعة الشيء
                        </label>
                        <select
                            id="dossier-meta-delivery-nature"
                            value={dossierMetaDraft.specificDeliveryItemNature ?? ''}
                            onChange={(e) =>
                                setDossierMetaDraft((d) =>
                                    d ? { ...d, specificDeliveryItemNature: e.target.value } : d,
                                )
                            }
                            className={DOSSIER_META_FIELD_CLASS}
                        >
                            <option value="">— غير محدد —</option>
                            <option value="movable">منقول</option>
                            <option value="immovable">غير منقول</option>
                        </select>
                    </div>
                </section>
            ) : null}
        </div>
    );
}
