import { useMemo, useCallback } from 'react';

/** الأنواع المتاحة حالياً لإنشاء إضبارة جديدة */
export const EXECUTION_DOC_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: 'قرارات وأحكام المحاكم', label: 'قرارات المحاكم' },
];

/** أنواع سندات تُعرض للمعلومة فقط — قيد الدراسة والتطوير */
export const EXECUTION_DOC_TYPE_COMING_SOON: { label: string }[] = [
    { label: 'الحجج الشرعية' },
    { label: 'الأوراق التجارية (صك/كمبيالة)' },
    { label: 'السندات العادية (إقرار بدين)' },
    { label: 'سندات التسجيل العقاري' },
    { label: 'كفالات المنفذ العدل' },
    { label: 'الأحكام الأجنبية' },
    { label: 'قرارات المحكمين المصدقة' },
];

const EXECUTION_DOC_TYPE_LABEL_BY_VALUE: Record<string, string> = {
    'قرارات وأحكام المحاكم': 'قرارات المحاكم',
    'الحجج الشرعية': 'الحجج الشرعية',
    'الأوراق التجارية': 'الأوراق التجارية (صك/كمبيالة)',
    'السندات المتضمنة إقراراً بدين': 'السندات العادية (إقرار بدين)',
    'السندات المثبتة لحق عيني': 'سندات التسجيل العقاري',
    'الكفالة الواقعة أمام المنفذ العدل': 'كفالات المنفذ العدل',
    'تنفيذ الأحكام الأجنبية': 'الأحكام الأجنبية',
    'قرارات المحكمين المصدقة': 'قرارات المحكمين المصدقة',
};

function getClassificationOptions(docType: string) {
    if (!docType) return [];

    switch (docType) {
        case 'قرارات وأحكام المحاكم':
            return [
                { value: 'مدني', label: 'مدني' },
                { value: 'شرعي', label: 'أحوال شخصية' }
            ];
        case 'الأوراق التجارية':
        case 'السندات المتضمنة إقراراً بدين':
        case 'السندات المثبتة لحق عيني':
        case 'الكفالة الواقعة أمام المنفذ العدل':
        case 'الحجج الشرعية':
        case 'قرارات المحكمين المصدقة':
            return [];
        case 'تنفيذ الأحكام الأجنبية':
            return [
                { value: 'مدني', label: 'مدني' },
                { value: 'شرعي', label: 'شرعي' }
            ];
        default:
            return [];
    }
}

function getClaimTypeOptions(docType: string, classification: string) {
    if (docType === 'الأوراق التجارية' || docType === 'السندات المتضمنة إقراراً بدين') {
        return [
            { value: 'استحصال دين مالي', label: 'استحصال مبلغ مالي' }
        ];
    }

    if (docType === 'السندات المثبتة لحق عيني') {
        return [
            { value: 'استيفاء دين من بيع عقار', label: 'استيفاء دين من بيع عقار مرهون' }
        ];
    }

    if (docType === 'الكفالة الواقعة أمام المنفذ العدل') {
        return [
            { value: 'استحصال دين مالي', label: 'استحصال مبلغ مالي من الكفيل' }
        ];
    }

    if (docType === 'الحجج الشرعية') {
        return [
            { value: 'حجة نفقة اتفاقية', label: 'حجة نفقة' },
            { value: 'حجة زواج - مهر مؤجل', label: 'حجة زواج - استحصال مهر مؤجل' },
            { value: 'حجة زواج - مهر معجل', label: 'حجة زواج - استحصال مهر معجل غير مقبوض' },
            { value: 'حجة مخالعة', label: 'حجة مخالعة ببدل مالي' },
            { value: 'حجة إقرار بدين', label: 'حجة إقرار بدين / مصاغ ذهبي' },
            { value: 'حجة حضانة ومشاهدة', label: 'حجة حضانة وتسليم طفل / مشاهدة' }
        ];
    }

    if (docType === 'قرارات المحكمين المصدقة') {
        return [
            { value: 'استحصال دين مالي', label: 'استحصال مبلغ مالي' },
            { value: 'تسليم شيء معين', label: 'تسليم شيء معين' }
        ];
    }

    if (!classification) return [];

    const legalPath = `${docType}_${classification}`;

    switch (legalPath) {
        case 'قرارات وأحكام المحاكم_مدني':
            return [
                { value: 'استحصال دين مالي', label: 'استحصال دين مالي' },
                { value: 'eviction', label: 'تخلية المأجور/ تسليم عقار' },
                { value: 'إزالة تجاوز', label: 'إزالة / رفع تجاوز' },
                { value: 'تسليم شيء معين', label: 'تسليم شيء معين' },
            ];
        case 'قرارات وأحكام المحاكم_شرعي':
            return [
                { value: 'نفقة', label: 'نفقة مستمرة' },
                { value: 'نفقة ماضية', label: 'نفقة ماضية' },
                { value: 'نفقة عدة', label: 'نفقة عدة' },
                { value: 'مهر مؤجل', label: 'مهر مؤجل' },
                { value: 'تعويض عن طلاق تعسفي', label: 'تعويض عن طلاق تعسفي' },
                { value: 'تسليم ولد', label: 'تسليم حضانة' },
                { value: 'مشاهدة', label: 'مشاهدة واستصحاب' },
                { value: 'أثاث زوجية', label: 'أثاث زوجية' },
                { value: 'مطاوعة', label: 'المطاوعة/ ترك النشوز' }
            ];
        case 'تنفيذ الأحكام الأجنبية_مدني':
            return [
                { value: 'استحصال دين مالي', label: 'استحصال دين مالي' },
                { value: 'eviction', label: 'تخلية عقار' }
            ];
        case 'تنفيذ الأحكام الأجنبية_شرعي':
            return [
                { value: 'نفقة', label: 'نفقة' },
                { value: 'تسليم ولد', label: 'تسليم حضانة' }
            ];
        default:
            return [];
    }
}

export function useExecutionCreationFormOptions(
    docType: string,
    classification: string,
    claimType: string,
    activeClaimTypes: string[] = []
) {
    const classificationOptionsList = useMemo(() => getClassificationOptions(docType), [docType]);

    const getClassificationOptionsCallback = useCallback(
        () => getClassificationOptions(docType),
        [docType]
    );

    const getClaimTypeOptionsCallback = useCallback(
        () => getClaimTypeOptions(docType, classification),
        [docType, classification]
    );

    const claimTypeOptionsList = useMemo(
        () => getClaimTypeOptions(docType, classification),
        [docType, classification]
    );

    const currentDocTypeLabel = useMemo(
        () =>
            EXECUTION_DOC_TYPE_LABEL_BY_VALUE[docType] ??
            EXECUTION_DOC_TYPE_OPTIONS.find((o) => o.value === docType)?.label ??
            '',
        [docType]
    );

    const currentClaimTypeLabel = useMemo(() => {
        const keys = activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
        if (keys.length === 0) return '';
        return keys
            .map((k) => claimTypeOptionsList.find((o) => o.value === k)?.label ?? k)
            .join(' + ');
    }, [claimTypeOptionsList, claimType, activeClaimTypes]);

    return {
        classificationOptionsList,
        claimTypeOptionsList,
        currentDocTypeLabel,
        currentClaimTypeLabel,
        getClassificationOptions: getClassificationOptionsCallback,
        getClaimTypeOptions: getClaimTypeOptionsCallback,
    };
}
