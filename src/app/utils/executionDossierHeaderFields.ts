// @ts-nocheck
import type { ExecutionFile } from '@/app/types/execution';
import {
    formatClaimTypeArabic,
    inferEvictionPremisesUse,
    type EvictionPremisesUse,
} from '@/app/utils/executionModuleStrategies';
import {
    readSpecificDeliveryItems,
    formatSpecificDeliveryNatureSummary,
} from '@/app/utils/specificDeliveryItemsUtils';

const PLACEHOLDER = '—';

function trimOrEmpty(v: unknown): string {
    return typeof v === 'string' ? v.trim() : '';
}

function resolveClassificationDisplay(
    classification: string,
    category: string | undefined,
): string {
    if (classification === 'شرعي') return 'شرعي / أحوال شخصية';
    if (classification === 'مدني') return 'مدني';
    if (classification && classification !== 'none') return classification;
    if (category === 'sharia') return 'شرعي / أحوال شخصية';
    if (category === 'civil') return 'مدني';
    return '';
}

function parseFileNumberYear(file: ExecutionFile): { fileNumber: string; fileYear: string } {
    let fileNumber = trimOrEmpty(file.fileNumber);
    let fileYear = trimOrEmpty(file.fileYear);
    if ((!fileNumber || !fileYear) && file.caseNo) {
        const parts = String(file.caseNo).split('/').map((p) => p.trim());
        if (!fileNumber && parts[0]) fileNumber = parts[0];
        if (!fileYear && parts[1]) fileYear = parts[1];
    }
    return { fileNumber, fileYear };
}

export type DossierHeaderResolved = {
    directorate: string;
    fileNumber: string;
    fileYear: string;
    /** للعرض: "رقم / سنة" أو — */
    fileRefDisplay: string;
    docType: string;
    claimType: string;
    classification: string;
    classificationDisplay: string;
    claimTypeDisplay: string;
    docNumber: string;
    judgmentDate: string;
    specificDeliveryItemName: string;
    specificDeliveryItemNature: string;
    specificDeliveryItemNatureDisplay: string;
};

/** هل الملف يتضمن مطالبة «تسليم شيء معين»؟ */
export function fileHasSpecificDeliveryClaim(file: ExecutionFile | null | undefined): boolean {
    if (!file) return false;
    const types = Array.isArray((file as { claimTypes?: string[] }).claimTypes)
        ? ((file as { claimTypes: string[] }).claimTypes || []).map((t) => String(t || '').trim())
        : [];
    const single = trimOrEmpty(file.claimType);
    return types.includes('تسليم شيء معين') || single === 'تسليم شيء معين';
}

/**
 * حقول الشريط الجوزي — مباشرة من الإضبارة كما حُفظت عند الإنشاء (بدون قيم وهمية).
 */
export function resolveDossierHeaderFields(
    file: ExecutionFile | null | undefined,
): DossierHeaderResolved {
    if (!file) {
        return {
            directorate: '',
            fileNumber: '',
            fileYear: '',
            fileRefDisplay: PLACEHOLDER,
            docType: '',
            claimType: '',
            classification: '',
            classificationDisplay: '',
            claimTypeDisplay: '',
            docNumber: '',
            judgmentDate: '',
            specificDeliveryItemName: '',
            specificDeliveryItemNature: '',
            specificDeliveryItemNatureDisplay: '',
        };
    }

    const directorate = trimOrEmpty(file.directorate);
    const { fileNumber, fileYear } = parseFileNumberYear(file);
    const fileRefDisplay =
        fileNumber || fileYear ? `${fileNumber || PLACEHOLDER} / ${fileYear || PLACEHOLDER}` : PLACEHOLDER;

    const docType = trimOrEmpty(file.docType);
    const claimType = trimOrEmpty(file.claimType);
    const classification = trimOrEmpty(file.classification);
    const category = trimOrEmpty((file as { category?: string }).category);

    const classificationDisplay = resolveClassificationDisplay(classification, category);

    const premises = inferEvictionPremisesUse({
        explicit: (file as { eviction_premises_use?: EvictionPremisesUse }).eviction_premises_use,
        propertyTypeText: trimOrEmpty((file as { property_type?: string }).property_type),
    });
    const claimTypesRaw = Array.isArray((file as { claimTypes?: string[] }).claimTypes)
        ? ((file as { claimTypes?: string[] }).claimTypes || [])
              .map((t) => String(t || '').trim())
              .filter(Boolean)
        : [];
    const claimLabels = (claimTypesRaw.length > 0 ? claimTypesRaw : claimType ? [claimType] : [])
        .map((ct) => formatClaimTypeArabic(ct, premises))
        .filter((label) => label && label !== PLACEHOLDER);
    const claimTypeDisplay =
        claimLabels.length > 0 ? [...new Set(claimLabels)].join(' · ') : '';

    const deliveryItems = readSpecificDeliveryItems(file);
    const deliveryNamesFromItems = deliveryItems
        .map((item) => item.name.trim())
        .filter(Boolean)
        .join('؛ ');
    const legacyDeliveryName = trimOrEmpty(
        (file as { specificDeliveryItemName?: string }).specificDeliveryItemName,
    );
    const resolvedDeliveryNature = formatSpecificDeliveryNatureSummary(
        deliveryItems,
        (file as { specificDeliveryItemNature?: string }).specificDeliveryItemNature,
    );

    return {
        directorate,
        fileNumber,
        fileYear,
        fileRefDisplay,
        docType,
        claimType,
        classification,
        classificationDisplay,
        claimTypeDisplay,
        docNumber: trimOrEmpty(file.docNumber),
        judgmentDate: trimOrEmpty(file.judgmentDate),
        specificDeliveryItemName: legacyDeliveryName || deliveryNamesFromItems,
        specificDeliveryItemNature: trimOrEmpty(
            (file as { specificDeliveryItemNature?: string }).specificDeliveryItemNature,
        ),
        specificDeliveryItemNatureDisplay: resolvedDeliveryNature,
    };
}
