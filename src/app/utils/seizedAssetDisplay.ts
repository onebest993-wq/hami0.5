import type { SeizedAsset } from '@/app/types/execution';

/** تسميات عربية لحقول النماذج (كانت تُعرض بالمفتاح الإنجليزي) */
const DETAIL_KEY_AR: Record<string, string> = {
    propertyType: 'نوع العقار',
    propertyLocation: 'موقع العقار',
    registryOffice: 'دائرة التسجيل العقاري',
    propertyNumber: 'رقم العقار / المقاطعة',
    employerName: 'جهة العمل',
    ministry: 'الوزارة / الدائرة',
    deductionRate: 'نسبة الاستقطاع',
    trafficDept: 'مديرية المرور',
    plateNumber: 'رقم اللوحة والصنف',
    vehicleModel: 'المركبة',
    movableAssetType: 'نوع المال المحجوز',
    movableEstimatedValueIqd: 'القيمة التقديرية / السعر',
    movableNotes: 'التفاصيل والملاحظات',
    description: 'الوصف',
    notes: 'ملاحظات',
    decisionRowId: 'مرجع طلب المنفذ',
    origin: 'المصدر',
};

function labelForDetailKey(key: string): string {
    if (DETAIL_KEY_AR[key]) return DETAIL_KEY_AR[key];
    if (/^[a-z][a-zA-Z0-9_]*$/.test(key)) {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
    }
    return key;
}

/** سطر واحد مرتب للشارات والقوائم */
export function formatSeizedAssetDetailsArabic(asset: SeizedAsset): string {
    const lines = buildSeizedAssetDetailLines(asset);
    if (lines.length === 0) return '—';
    return lines.map((x) => `${x.k}: ${x.v}`).join(' — ');
}

export function buildSeizedAssetDetailLines(asset: SeizedAsset): { k: string; v: string }[] {
    const out: { k: string; v: string }[] = [];
    if (asset.description?.trim()) {
        out.push({ k: 'الوصف', v: asset.description.trim() });
    }
    if (typeof asset.estimatedValue === 'number' && Number.isFinite(asset.estimatedValue) && asset.estimatedValue > 0) {
        out.push({ k: 'القيمة التقديرية / السعر', v: `${asset.estimatedValue.toLocaleString('ar-IQ')} د.ع` });
    }
    const noteText = String(asset.notes ?? asset.note ?? '').trim();
    if (noteText) {
        out.push({ k: 'ملاحظات', v: noteText });
    }
    const d = asset.details;
    if (d && typeof d === 'object') {
        const descTrim = asset.description?.trim();
        Object.entries(d).forEach(([key, value]) => {
            if (key === 'decisionRowId') return;
            if (value == null || String(value).trim() === '') return;
            if (key === 'description' && descTrim && String(value).trim() === descTrim) return;
            out.push({ k: labelForDetailKey(key), v: String(value).trim() });
        });
    }
    if (asset.seizureDate?.trim()) {
        out.push({ k: 'تاريخ الحجز', v: asset.seizureDate.trim() });
    }
    if (asset.auction_date_ymd?.trim()) {
        out.push({ k: 'تاريخ المزايدة', v: asset.auction_date_ymd.trim() });
    }
    if (asset.sale_price_iqd?.trim()) {
        out.push({ k: 'سعر البيع', v: `${asset.sale_price_iqd.trim()} د.ع` });
    }
    if (asset.released_at_ymd?.trim()) {
        out.push({ k: 'تاريخ فك الحجز', v: asset.released_at_ymd.trim() });
    }
    return out;
}
