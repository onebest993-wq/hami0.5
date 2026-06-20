import type { DebtorAgentSeizedItem } from './components/DebtorAgentFinancialHubPanel';

function statusAr(raw: unknown): string {
    const s = String(raw || '').trim();
    if (s === 'seized') return 'محجوز';
    if (s === 'sold') return 'مباع';
    if (s === 'archived') return 'مؤرشف';
    return s || '—';
}

/** عناصر الحجز للعرض فقط — وكيل المدين */
export function buildDebtorAgentSeizedItems(input: {
    realEstate?: unknown[];
    movable?: unknown[];
    salary?: unknown[];
    thirdParty?: unknown[];
    marks?: unknown[];
}): DebtorAgentSeizedItem[] {
    const out: DebtorAgentSeizedItem[] = [];

    for (const raw of input.realEstate ?? []) {
        const a = raw as Record<string, unknown>;
        if (String(a.status || '') === 'archived') continue;
        out.push({
            id: `re-${String(a.id || out.length)}`,
            kind: 'property',
            title: String(a.propertyNoAndDistrict || 'عقار محجوز'),
            subtitle: String(a.propertyGender || '').trim() || undefined,
            statusLabel: statusAr(a.status),
        });
    }

    for (const raw of input.movable ?? []) {
        const a = raw as Record<string, unknown>;
        if (String(a.status || '') === 'archived') continue;
        out.push({
            id: `mv-${String(a.id || out.length)}`,
            kind: 'movable',
            title: String(a.assetLabel || a.description || 'منقول محجوز'),
            subtitle: a.estimatedPriceIqd
                ? `${Number(a.estimatedPriceIqd).toLocaleString('ar-IQ')} د.ع`
                : undefined,
            statusLabel: statusAr(a.status),
        });
    }

    for (const raw of input.salary ?? []) {
        const a = raw as Record<string, unknown>;
        if (String(a.status || '') === 'archived') continue;
        out.push({
            id: `sl-${String(a.id || out.length)}`,
            kind: 'salary',
            title: 'حجز راتب',
            subtitle: a.monthlyDeductionIqd
                ? `استقطاع ${Number(a.monthlyDeductionIqd).toLocaleString('ar-IQ')} د.ع/شهر`
                : undefined,
            statusLabel: statusAr(a.status),
        });
    }

    for (const raw of input.thirdParty ?? []) {
        const a = raw as Record<string, unknown>;
        if (String(a.status || '') === 'archived') continue;
        out.push({
            id: `tp-${String(a.id || out.length)}`,
            kind: 'third_party',
            title: String(a.holderName || 'حجز لدى الغير'),
            subtitle: String(a.memoRef || '').trim() || undefined,
            statusLabel: statusAr(a.status),
        });
    }

    for (const raw of input.marks ?? []) {
        const a = raw as Record<string, unknown>;
        if (a.archived === true) continue;
        out.push({
            id: `mk-${String(a.id || out.length)}`,
            kind: 'mark',
            title: String(a.label || a.title || 'إشارة تنفيذ'),
            statusLabel: a.isMarkConfirmed ? 'مؤكّد' : 'قيد التأكيد',
        });
    }

    return out;
}
