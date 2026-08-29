import type { ElementType } from 'react';
import type { DossierHeaderResolved } from '@/app/utils/executionDossierHeaderFields';
import { EXECUTION_DOSSIER_SUMMARY_EXPANDED } from '@/app/components/lawyer/ExecutionDashboard/executionDossierVisualLite';
import { DetailCell } from './dashboardHeaderSectionHelpers';

export function DashboardHeaderExpandedDetails({
    headerExpanded,
    isSubFile,
    delegationPurpose,
    expanded,
    Pencil,
}: {
    headerExpanded: boolean;
    isSubFile?: boolean;
    delegationPurpose?: string;
    expanded: {
        headerFields: DossierHeaderResolved;
        classificationDisplay: string;
        claimTypeArabicDisplay: string;
        showJudgmentMeta: boolean;
        judgmentDateDisplay: string;
        evictionPropertyNumber: string;
        evictionPropertyDistrict: string;
        evictionPropertyTypeField: string;
        evictionFullAddressField: string;
        isEvictionExecutionModule: boolean;
        openEditDossierMeta: () => void;
        showSpecificDeliveryMeta?: boolean;
    };
    Pencil: ElementType;
}) {
    if (!headerExpanded) return null;

    return (
                        <div className={EXECUTION_DOSSIER_SUMMARY_EXPANDED}>
                            <div className="space-y-1 px-3 py-2" dir="rtl">
                                {isSubFile ? (
                                    delegationPurpose ? (
                                        <DetailCell
                                            label="الغاية من الإضبارة الفرعية"
                                            value={delegationPurpose}
                                            className="border-emerald-500/25 text-emerald-100/95"
                                        />
                                    ) : (
                                        <p className="text-right text-[10px] text-slate-500">—</p>
                                    )
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            data-exec-interactive="true"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                expanded.openEditDossierMeta();
                                            }}
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-200/90 transition hover:text-amber-100"
                                        >
                                            <Pencil size={12} />
                                            {expanded.isEvictionExecutionModule
                                                ? 'تعديل الإضبارة والحكم والتخلية'
                                                : 'تعديل الإضبارة والحكم'}
                                        </button>
                                        <div className="grid grid-cols-2 gap-1 auto-rows-min">
                                            <DetailCell
                                                label="نوع السند"
                                                value={expanded.headerFields.docType || '—'}
                                            />
                                            <DetailCell
                                                label="التصنيف"
                                                value={expanded.classificationDisplay}
                                            />
                                            <DetailCell
                                                label="المطالبة"
                                                value={expanded.claimTypeArabicDisplay}
                                                className="col-span-2"
                                            />
                                            {expanded.showSpecificDeliveryMeta ? (
                                                <>
                                                    <DetailCell
                                                        label="طبيعة الشيء"
                                                        value={
                                                            expanded.headerFields
                                                                .specificDeliveryItemNatureDisplay ||
                                                            'غير محدد'
                                                        }
                                                        className="col-span-2"
                                                    />
                                                    {!expanded.headerFields
                                                        .specificDeliveryItemNatureDisplay ? (
                                                        <p
                                                            className="col-span-2 rounded-lg border border-amber-500/25 bg-amber-950/20 px-2 py-1.5 text-[10px] leading-relaxed text-amber-200/90"
                                                        >
                                                            إجراءات التسليم في{' '}
                                                            <span className="font-bold">محضر المتابعة</span>
                                                            {' → '}
                                                            <span className="font-bold">الإجراءات الجبرية</span>
                                                            {' — حدّد طبيعة الشيء (منقول / غير منقول) لتفعيلها.'}
                                                        </p>
                                                    ) : null}
                                                    {expanded.headerFields.specificDeliveryItemName ? (
                                                        <DetailCell
                                                            label="الأشياء المراد تسليمها"
                                                            value={
                                                                expanded.headerFields
                                                                    .specificDeliveryItemName
                                                            }
                                                            className="col-span-2"
                                                        />
                                                    ) : null}
                                                </>
                                            ) : null}
                                            {expanded.showJudgmentMeta ? (
                                                <DetailCell
                                                    label="رقم الحكم"
                                                    value={expanded.headerFields.docNumber || '—'}
                                                    valueClassName="font-mono"
                                                    hideIfEmpty={false}
                                                />
                                            ) : null}
                                            {expanded.showJudgmentMeta ? (
                                                <DetailCell
                                                    label="تاريخ الحكم"
                                                    value={expanded.judgmentDateDisplay || '—'}
                                                    hideIfEmpty={false}
                                                />
                                            ) : null}
                                            {expanded.isEvictionExecutionModule ? (
                                                <>
                                                    <DetailCell
                                                        label="رقم العقار"
                                                        value={String(expanded.evictionPropertyNumber || '').trim()}
                                                    />
                                                    <DetailCell
                                                        label="المقاطعة"
                                                        value={String(expanded.evictionPropertyDistrict || '').trim()}
                                                    />
                                                    <div className="col-span-2 grid grid-cols-2 gap-1">
                                                        <DetailCell
                                                            label="صنف العقار"
                                                            value={String(expanded.evictionPropertyTypeField || '').trim()}
                                                        />
                                                        <DetailCell
                                                            label="مكان العقار"
                                                            value={String(expanded.evictionFullAddressField || '').trim()}
                                                        />
                                                    </div>
                                                </>
                                            ) : null}
                                            {delegationPurpose ? (
                                                <DetailCell
                                                    label="الغاية من الإنابة"
                                                    value={delegationPurpose}
                                                    className="col-span-2 border-emerald-500/25 text-emerald-100/95"
                                                />
                                            ) : null}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
    );
}
