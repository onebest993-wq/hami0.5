import { maritalFurnitureFinancialContentSignature } from '@/app/utils/maritalFurniture';

/**
 * بصمة حقول دورة التبليغ/التكليف داخل executionData لمزامنة shell overlays.
 * لا نكتفي بـ id — وإلا تتجمّد واجهة مركز التبليغ بعد إنهاء/حضور.
 */
// cache بهوية الكائن — الطرف «الحالي» في المقارنة ثابت الهوية عبر renders،
// فلا داعي لإعادة JSON.stringify لخرائط التبليغ الكبيرة في كل مزامنة scope.
const overlayFingerprintByIdentity = new WeakMap<object, string>();

export function fingerprintExecutionOverlayData(value: unknown): string {
    if (value == null || typeof value !== 'object') return '';
    const cached = overlayFingerprintByIdentity.get(value);
    if (cached !== undefined) return cached;

    const data = value as Record<string, unknown>;
    let result: string;
    try {
        result = JSON.stringify({
            id: data.id ?? null,
            parentDossierId: data.parentDossierId ?? null,
            parentFileId: data.parentFileId ?? null,
            claimType: data.claimType ?? null,
            empMap: data.employee_summons_assignments_by_debtor ?? null,
            empLeg: data.employee_summons_assignment ?? null,
            pub: data.publication_notice_by_debtor ?? null,
            guar: data.guarantor_notification ?? null,
            summonsMarker: data.debtor_summons_marker_by_debtor ?? data.debtor_summons_marker ?? null,
            noticeByDebtor: data.debtor_notice_by_debtor ?? null,
            evictionVolEnd: data.eviction_voluntary_period_end_declared ?? null,
            noticeVolEnd: data.notice_voluntary_period_end_declared ?? null,
            maritalFurnitureFin: maritalFurnitureFinancialContentSignature(data),
        });
    } catch {
        result = String(data.id ?? '');
    }
    overlayFingerprintByIdentity.set(value, result);
    return result;
}
