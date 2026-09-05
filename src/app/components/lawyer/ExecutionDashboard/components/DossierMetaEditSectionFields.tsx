import React from 'react';
import { EXEC_OVERLAY_FIELD } from '../executionModalMobileShell';
import { listDossierPartyNameFields } from '../helpers/dossierMetaPartyNames';

const DOSSIER_META_LABEL_CLASS = 'mb-1.5 block text-[11px] font-medium text-slate-400';

const DOSSIER_META_SECTION_CLASS =
    'space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3';

const evictionFields = [
    { k: 'property_number', label: 'رقم العقار' },
    { k: 'district', label: 'المقاطعة' },
    { k: 'property_type', label: 'صنف العقار' },
    { k: 'full_address', label: 'مكان العقار (العنوان)' },
] as const;

export function DossierMetaEditSectionFields({
    dossierMetaDraft,
    isEvictionExecutionModule,
    isSpecificDeliveryClaim,
    setDossierMetaDraft,
}: {
    dossierMetaDraft: Record<string, string>;
    isEvictionExecutionModule: boolean;
    isSpecificDeliveryClaim: boolean;
    setDossierMetaDraft: (
        draft:
            | Record<string, string>
            | null
            | ((prev: Record<string, string> | null) => Record<string, string> | null),
    ) => void;
}) {
    const partyNameFields = listDossierPartyNameFields(dossierMetaDraft);

    const patchField = (key: string, value: string) => {
        setDossierMetaDraft((d) => (d ? { ...d, [key]: value } : d));
    };

    return (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
            {partyNameFields.length > 0 ? (
                <section className={DOSSIER_META_SECTION_CLASS}>
                    <h4 className="text-[11px] font-bold text-slate-400">الأطراف</h4>
                    {partyNameFields.map((field) => {
                        const fieldDomId = `dossier-meta-${field.key.replace(/:/g, '-')}`;
                        return (
                        <div key={field.key}>
                            <label className={DOSSIER_META_LABEL_CLASS} htmlFor={fieldDomId}>
                                {field.label}
                            </label>
                            <input
                                id={fieldDomId}
                                type="text"
                                value={dossierMetaDraft[field.key] ?? ''}
                                onChange={(e) => patchField(field.key, e.target.value)}
                                className={EXEC_OVERLAY_FIELD}
                                data-testid={`execution-dossier-meta-${field.kind}-name`}
                            />
                        </div>
                        );
                    })}
                </section>
            ) : null}

            <section className={DOSSIER_META_SECTION_CLASS}>
                <h4 className="text-[11px] font-bold text-slate-400">بيانات الإضبارة</h4>
                <div>
                    <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-directorate">
                        اسم المديرية / الجهة
                    </label>
                    <input
                        id="dossier-meta-directorate"
                        type="text"
                        value={dossierMetaDraft.directorate ?? ''}
                        onChange={(e) => patchField('directorate', e.target.value)}
                        className={EXEC_OVERLAY_FIELD}
                        data-testid="execution-dossier-meta-directorate"
                    />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-fileNumber">
                            رقم الإضبارة
                        </label>
                        <input
                            id="dossier-meta-fileNumber"
                            type="text"
                            value={dossierMetaDraft.fileNumber ?? ''}
                            onChange={(e) => patchField('fileNumber', e.target.value)}
                            className={EXEC_OVERLAY_FIELD}
                            data-testid="execution-dossier-meta-fileNumber"
                            placeholder="مثال: 123"
                        />
                    </div>
                    <div>
                        <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-fileYear">
                            السنة
                        </label>
                        <input
                            id="dossier-meta-fileYear"
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={dossierMetaDraft.fileYear ?? ''}
                            onChange={(e) => patchField('fileYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className={EXEC_OVERLAY_FIELD}
                            data-testid="execution-dossier-meta-fileYear"
                            placeholder="2026"
                        />
                    </div>
                </div>
            </section>

            <section className={DOSSIER_META_SECTION_CLASS}>
                <h4 className="text-[11px] font-bold text-slate-400">السند والحكم</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-docNumber">
                            رقم السند / الحكم
                        </label>
                        <input
                            id="dossier-meta-docNumber"
                            type="text"
                            value={dossierMetaDraft.docNumber ?? ''}
                            onChange={(e) => patchField('docNumber', e.target.value)}
                            className={EXEC_OVERLAY_FIELD}
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
                            onChange={(e) => patchField('judgmentDate', e.target.value)}
                            className={EXEC_OVERLAY_FIELD}
                            data-testid="execution-dossier-meta-judgmentDate"
                        />
                    </div>
                </div>
            </section>

            {isEvictionExecutionModule ? (
                <section className={DOSSIER_META_SECTION_CLASS}>
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
                                    onChange={(e) => patchField(f.k, e.target.value)}
                                    className={EXEC_OVERLAY_FIELD}
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
                                onChange={(e) => patchField('eviction_premises_use', e.target.value)}
                                className={EXEC_OVERLAY_FIELD}
                            >
                                <option value="">— غير محدد —</option>
                                <option value="commercial">تجاري</option>
                                <option value="residential">سكني</option>
                            </select>
                        </div>
                    </div>
                </section>
            ) : isSpecificDeliveryClaim ? (
                <section className={DOSSIER_META_SECTION_CLASS}>
                    <h4 className="text-[11px] font-bold text-slate-400">التسليم العيني</h4>
                    <div>
                        <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-delivery-name">
                            الشيء المراد تسليمه
                        </label>
                        <input
                            id="dossier-meta-delivery-name"
                            type="text"
                            value={dossierMetaDraft.specificDeliveryItemName ?? ''}
                            onChange={(e) => patchField('specificDeliveryItemName', e.target.value)}
                            className={EXEC_OVERLAY_FIELD}
                        />
                    </div>
                    <div>
                        <label className={DOSSIER_META_LABEL_CLASS} htmlFor="dossier-meta-delivery-nature">
                            طبيعة الشيء
                        </label>
                        <select
                            id="dossier-meta-delivery-nature"
                            value={dossierMetaDraft.specificDeliveryItemNature ?? ''}
                            onChange={(e) => patchField('specificDeliveryItemNature', e.target.value)}
                            className={EXEC_OVERLAY_FIELD}
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
