/** نوع الكفالة: مالية (مبلغ) أو شخص ضامن (كفلاء بأسمائهم). */
export type GuarantorBailKind = 'financial' | 'personal';

/** كفيل ضامن مفرد ضمن قائمة الكفلاء. */
export type GuarantorPerson = {
    id: string;
    fullName: string;
};

export type GuarantorDetails = {
    bailAmount: string;
    guarantorInfo: string;
    /** نوع الكفالة المهيكلة — جديد. */
    kind?: GuarantorBailKind;
    /** أسماء الكفلاء — يُستخدم عند kind='personal'. */
    guarantors?: GuarantorPerson[];
};

export function makeEmptyGuarantorDetails(): GuarantorDetails {
    return { bailAmount: '', guarantorInfo: '' };
}

function normalizeGuarantorPersonList(raw: unknown): GuarantorPerson[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const out: GuarantorPerson[] = [];
    raw.forEach((entry, idx) => {
        if (!entry || typeof entry !== 'object') return;
        const o = entry as Record<string, unknown>;
        const fullName = String(o.fullName ?? o.name ?? '').trim();
        if (!fullName) return;
        const id = String(o.id ?? '').trim() || `g_${Date.now()}_${idx}`;
        out.push({ id, fullName });
    });
    return out.length ? out : undefined;
}

function normalizeGuarantorBailKind(raw: unknown): GuarantorBailKind | undefined {
    const v = String(raw ?? '').trim();
    if (v === 'financial' || v === 'personal') return v;
    return undefined;
}

export function normalizeGuarantorDetails(raw: unknown): GuarantorDetails | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Record<string, unknown>;
    if ('bailAmount' in o || 'guarantorInfo' in o || 'kind' in o || 'guarantors' in o) {
        const bailAmount = String(o.bailAmount ?? '').trim();
        const guarantorInfo = String(o.guarantorInfo ?? '').trim();
        const kind = normalizeGuarantorBailKind(o.kind);
        const guarantors = normalizeGuarantorPersonList(o.guarantors);
        if (!bailAmount && !guarantorInfo && !kind && !guarantors) return undefined;
        const result: GuarantorDetails = { bailAmount, guarantorInfo };
        if (kind) result.kind = kind;
        if (guarantors) result.guarantors = guarantors;
        return result;
    }
    const legacyName = String(o.name ?? '').trim();
    const legacyAmount = Number(o.amount);
    const legacyType = String(o.type ?? '').trim();
    const legacyNotes = String(o.forfeitureNotes ?? '').trim();
    const legacyForfeited = o.isForfeited === true;
    const bailAmount =
        Number.isFinite(legacyAmount) && legacyAmount > 0
            ? String(legacyAmount)
            : String(o.bailAmount ?? '').trim();
    const infoParts: string[] = [];
    if (legacyName) infoParts.push(legacyName);
    if (legacyType) infoParts.push(`(${legacyType})`);
    if (legacyForfeited) infoParts.push('⛔ مصادرة الكفالة');
    if (legacyNotes) infoParts.push(legacyNotes);
    const guarantorInfo = infoParts.join(' — ').trim();
    if (!bailAmount && !guarantorInfo) return undefined;
    return { bailAmount, guarantorInfo };
}

export function isGuarantorForfeited(raw: unknown): boolean {
    const g = normalizeGuarantorDetails(raw);
    return Boolean(g?.guarantorInfo.includes('مصادرة'));
}
