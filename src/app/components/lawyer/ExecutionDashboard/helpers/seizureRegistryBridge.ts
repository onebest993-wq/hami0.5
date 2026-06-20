// @ts-nocheck
import type { SeizedMovable, SeizedProperty, ThirdPartySeizure } from '@/app/types/execution';

export function inferPropertyGenderFromType(raw: string): SeizedProperty['propertyGender'] {
    const t = String(raw || '').trim();
    if (/شقة/i.test(t)) return 'شقة';
    if (/عرصة/i.test(t)) return 'عرصة';
    if (/بستان/i.test(t)) return 'بستان';
    return 'دار';
}

export function upsertSeizedPropertyFromDetails(
    prev: SeizedProperty[],
    decisionRowId: string,
    details: { propertyNumber?: string; propertyDistrict?: string; propertyType?: string },
    opts?: { subject?: string; nowIso?: string }
): SeizedProperty[] {
    const did = String(decisionRowId || '').trim();
    if (!did) return prev;
    const nowIso = String(opts?.nowIso || new Date().toISOString());
    const idx = prev.findIndex((x) => String(x.decisionRowId || '') === did);
    const existing = idx >= 0 ? prev[idx] : null;
    const propertyNumber = String(details.propertyNumber || existing?.propertyNumber || '').trim();
    const district = String(details.propertyDistrict || existing?.district || '').trim();
    const propertyGender = inferPropertyGenderFromType(
        String(details.propertyType || existing?.propertyGender || '')
    );
    const deedNotes = String(details.propertyType || existing?.deedNotes || '').trim();
    const nextRow: SeizedProperty = {
        id: existing?.id || `sp_${did}`,
        decisionRowId: did,
        propertyNumber: propertyNumber || existing?.propertyNumber || '—',
        district,
        propertyGender,
        deedNotes,
        status: existing?.status || 'seized',
        seizedAtIso: existing?.seizedAtIso || nowIso,
        subject: String(opts?.subject || existing?.subject || '').trim() || undefined,
    };
    const next = [...prev];
    if (idx >= 0) next[idx] = { ...existing!, ...nextRow };
    else next.unshift(nextRow);
    return next;
}

export function upsertSeizedMovableFromDetails(
    prev: SeizedMovable[],
    decisionRowId: string,
    details: {
        movableDescription?: string;
        movableLocation?: string;
        judicialCustodianName?: string;
    },
    opts?: { subject?: string; nowIso?: string }
): SeizedMovable[] {
    const did = String(decisionRowId || '').trim();
    if (!did) return prev;
    const nowIso = String(opts?.nowIso || new Date().toISOString());
    const idx = prev.findIndex((x) => String(x.decisionRowId || '') === did);
    const existing = idx >= 0 ? prev[idx] : null;
    const movableDescription = String(
        details.movableDescription || existing?.movableDescription || ''
    ).trim();
    const movableLocation = String(details.movableLocation || existing?.movableLocation || '').trim();
    const judicialCustodianName = String(
        details.judicialCustodianName || existing?.judicialCustodianName || ''
    ).trim();
    const nextRow: SeizedMovable = {
        id: existing?.id || `sm_${did}`,
        decisionRowId: did,
        movableDescription: movableDescription || existing?.movableDescription || '—',
        movableLocation: movableLocation || existing?.movableLocation || '—',
        judicialCustodianName,
        status: existing?.status || 'seized',
        seizedAtIso: existing?.seizedAtIso || nowIso,
        subject: String(opts?.subject || existing?.subject || '').trim() || undefined,
    };
    const next = [...prev];
    if (idx >= 0) next[idx] = { ...existing!, ...nextRow };
    else next.unshift(nextRow);
    return next;
}

/** بطاقة مسودة في سجل الحجز بعد موافقة المنفذ وقبل إكمال التفاصيل */
export function buildSeizureRegistryDraftPatch(
    executionData: Record<string, unknown> | null | undefined,
    decisionId: string,
    subtype: string,
    decisionRow: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
    const did = String(decisionId || '').trim();
    if (!did) return null;
    const nowIso = new Date().toISOString();
    const subject = String(decisionRow?.title || '').trim() || undefined;

    if (subtype === 'property') {
        const prev = Array.isArray(executionData?.seizedProperties)
            ? (executionData!.seizedProperties as SeizedProperty[])
            : [];
        if (prev.some((x) => String(x.decisionRowId || '') === did)) return null;
        const draft: SeizedProperty = {
            id: `sp_${did}`,
            decisionRowId: did,
            propertyNumber: '—',
            district: '—',
            propertyGender: 'دار',
            deedNotes: 'بانتظار إكمال البيانات بعد موافقة المنفذ',
            status: 'seized',
            seizedAtIso: nowIso,
            subject,
        };
        return { seizedProperties: [draft, ...prev] };
    }

    if (subtype === 'movable_auction' || subtype === 'movable') {
        const prev = Array.isArray(executionData?.seizedMovables)
            ? (executionData!.seizedMovables as SeizedMovable[])
            : [];
        if (prev.some((x) => String(x.decisionRowId || '') === did)) return null;
        const draft: SeizedMovable = {
            id: `sm_${did}`,
            decisionRowId: did,
            movableDescription: '— بانتظار الإكمال',
            movableLocation: '—',
            judicialCustodianName: '',
            status: 'seized',
            seizedAtIso: nowIso,
            subject,
        };
        return { seizedMovables: [draft, ...prev] };
    }

    if (subtype === 'third_party') {
        const prev = Array.isArray(executionData?.thirdPartySeizures)
            ? (executionData!.thirdPartySeizures as ThirdPartySeizure[])
            : [];
        if (prev.some((x) => String(x.decisionRowId || '') === did)) return null;
        const draft: ThirdPartySeizure = {
            id: `tps_${did}`,
            decisionRowId: did,
            thirdPartyName: '— بانتظار الإكمال',
            requestedAmountIqd: null,
            notificationDateIso: null,
            replyStatus: 'pending',
            transferredAmountIqd: null,
            status: 'pending',
        };
        return { thirdPartySeizures: [draft, ...prev] };
    }

    return null;
}
