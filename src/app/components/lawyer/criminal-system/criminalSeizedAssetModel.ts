/**
 * مال محجوز على المتهم الهارب (م 121 أصول).
 *
 * يُنشَأ عبر قرار قاضٍ من نوع «حجز الأموال» داخل تبويب «قرارات القاضي»،
 * ويُلصق بالمتهم الهارب فقط. يمكن تعدّد الأموال على نفس المتهم،
 * ويمكن «فكّ الحجز» عن صنف واحد أو جماعياً عن كل ما لديه.
 */
export interface SeizedAsset {
    /** معرّف داخلي لكل صنف محجوز. */
    id: string;
    /** وصف المال المحجوز (مثال: «سيارة BMW X5 موديل 2020»، «حساب مصرفي رقم …»). */
    description: string;
    /** رقم كتاب الحجز / المرجع. */
    referenceNumber?: string;
    /** تاريخ تنفيذ الحجز. */
    seizureDate?: string;
    /** ملاحظات إضافية. */
    notes?: string;
    /** معرّف الطلب/القرار الذي أنشأ هذا الحجز (LawyerRequest.id) — للتتبّع. */
    sourceRequestId?: string;
    /** ختم زمني للإنشاء — يُحدَّد ساعة الحفظ (ISO). */
    createdAt: string;
}

function createSeizedAssetId(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj && 'randomUUID' in cryptoObj && typeof cryptoObj.randomUUID === 'function') {
        return cryptoObj.randomUUID();
    }
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * يُعيد قائمة آمنة من الأموال المحجوزة بعد إعادة التحميل من التخزين الدائم.
 *
 * يُقصى أي صنف بدون وصف نصّي حقيقي. الحقول الاختيارية تُنظَّف إلى strings مقصوصة
 * أو تُحذف إذا كانت فارغة لئلا تتسرّب قيم "" تتعارض مع `?:` في النوع.
 */
export function normalizeSeizedAssets(raw: unknown): SeizedAsset[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((a: unknown) => {
            if (!a || typeof a !== 'object') return null;
            const row = a as Record<string, unknown>;
            const description = String(row.description ?? '').trim();
            if (!description) return null;
            const out: SeizedAsset = {
                id: String(row.id ?? createSeizedAssetId()),
                description,
                createdAt: String(row.createdAt ?? '').trim() || new Date().toISOString(),
            };
            const ref = String(row.referenceNumber ?? '').trim();
            if (ref) out.referenceNumber = ref;
            const dt = String(row.seizureDate ?? '').trim();
            if (dt) out.seizureDate = dt;
            const notes = String(row.notes ?? '').trim();
            if (notes) out.notes = notes;
            const src = String(row.sourceRequestId ?? '').trim();
            if (src) out.sourceRequestId = src;
            return out;
        })
        .filter((x): x is SeizedAsset => x !== null);
}
