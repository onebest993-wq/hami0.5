import type { Party } from '../../LawyerShared';

type PartySideBucket = 'plaintiff' | 'defendant' | 'third' | 'unknown';

export function isThirdPartyRole(role: string): boolean {
    const r = String(role ?? '').trim();
    return r.includes('شخص ثالث') || r.includes('متدخل') || r.includes('اختصامي');
}

export function isAffiliativeThirdPartyRole(role: string): boolean {
    return String(role ?? '').trim().includes('انضمامي');
}

export function isInterpleaderThirdPartyRole(role: string): boolean {
    const r = String(role ?? '').trim();
    if (r.includes('اختصامي')) return true;
    if (isAffiliativeThirdPartyRole(r)) return false;
    if (r.includes('شخص ثالث') && !r.includes('انضمامي')) {
        return !r.includes('بقرار المحكمة') && !r.includes('بطلب الخصم');
    }
    return false;
}

export function affiliativeThirdPartySide(role: string, side?: Party['side']): 'plaintiff' | 'defendant' | null {
    const r = String(role ?? '').trim();
    if (r.includes('جانب المدعي') || r.includes('— جانب المدعي')) return 'plaintiff';
    if (r.includes('جانب المدعى') || r.includes('— جانب المدعى')) return 'defendant';
    if (side === 'right') return 'plaintiff';
    if (side === 'left') return 'defendant';
    return null;
}

/** الجانب الأصلي بين قوسين بعد انقلاب الطعن — مثال: (المدعي) */
export function extractParentheticalUnderlyingSide(
    role: string,
): 'المدعي' | 'المدعى عليه' | null {
    const m = String(role ?? '').match(/\((المدعي|المدعى عليه)\)/);
    return m ? (m[1] as 'المدعي' | 'المدعى عليه') : null;
}

export function isAbsentObjectorRole(role: string): boolean {
    const r = String(role ?? '').trim();
    return (
        r.includes('المعترض على الحكم الغيابي')
        || (r.includes('معترض') && r.includes('على الحكم') && !r.includes('المعترض عليه'))
    );
}

export function isAbsentObjectedRole(role: string): boolean {
    const r = String(role ?? '').trim();
    return r.includes('المعترض عليه');
}

export function hasAbsentObjectionPartyRoles(
    parties?: Array<{ role?: string }> | null,
): boolean {
    if (!Array.isArray(parties)) return false;
    return parties.some(
        (p) => isAbsentObjectorRole(String(p.role ?? '')) || isAbsentObjectedRole(String(p.role ?? '')),
    );
}

/** الجانب الأصلي في الدعوى (مدعي/مدعى عليه) — من القوسين أو من صفة الاعتراض */
export function resolveAbsentObjectionOriginalSide(
    party: Pick<Party, 'role'> | { role?: string },
): 'المدعي' | 'المدعى عليه' | null {
    const role = String(party.role ?? '').trim();
    const fromParens = extractParentheticalUnderlyingSide(role);
    if (fromParens) return fromParens;
    if (isAbsentObjectorRole(role)) return 'المدعى عليه';
    if (isAbsentObjectedRole(role)) return 'المدعي';
    return null;
}

export function isAppellantAppealRole(role: string): boolean {
    const r = String(role ?? '').trim();
    if (isAbsentObjectorRole(r)) return true;
    if (isAbsentObjectedRole(r)) return false;
    if (r.includes('المستأنف عليه') || r.includes('المميز عليه')) return false;
    if (r.includes('المستأنف') || r.includes('المميز')) return true;
    if (r.includes('طالب إعادة المحاكمة') || r.includes('طالب')) return true;
    return false;
}

export function isAppelleeAppealRole(role: string): boolean {
    const r = String(role ?? '').trim();
    if (isAbsentObjectedRole(r)) return true;
    if (isAbsentObjectorRole(r)) return false;
    return (
        r.includes('المستأنف عليه')
        || r.includes('المميز عليه')
        || r.includes('المطلوب')
    );
}

/** اختصامي اندمج في عمود المستأنف/المستأنف عليه — يُعرَض كطرف عادي */
export function isAppealIntegratedInterpleaderRole(role: string): boolean {
    const r = String(role ?? '').trim();
    return isInterpleaderThirdPartyRole(r) && (isAppellantAppealRole(r) || isAppelleeAppealRole(r));
}

export function isDefendantSideRole(role: string): boolean {
    const r = String(role ?? '').trim();
    if (!r) return false;
    if (isAppellantAppealRole(r)) return false;
    if (isAppelleeAppealRole(r)) return true;
    return (
        r.includes('مدعى عليه')
        || r.includes('مستأنف عليه')
        || r.includes('مميز عليه')
        || r.includes('معترض عليه')
        || r.includes('المطلوب')
    );
}

export function isPlaintiffSideRole(role: string): boolean {
    const r = String(role ?? '').trim();
    if (!r) return false;
    if (isAppellantAppealRole(r)) return true;
    if (isAppelleeAppealRole(r)) return false;
    if (isDefendantSideRole(r)) return false;
    return (
        r.includes('مدعي')
        || (r.includes('مستأنف') && !r.includes('عليه'))
        || (r.includes('مميز') && !r.includes('عليه'))
        || (r.includes('معترض') && !r.includes('عليه'))
        || r.includes('طالب')
        || r.includes('طاعن')
    );
}

export function classifyPartySideBucket(party: Party): PartySideBucket {
    const role = String(party.role ?? '').trim();

    const isAppealIntegratedThird =
        isInterpleaderThirdPartyRole(role)
        || isAffiliativeThirdPartyRole(role)
        || (isThirdPartyRole(role) && !isAffiliativeThirdPartyRole(role));
    if (isAppealIntegratedThird && (isAppellantAppealRole(role) || isAppelleeAppealRole(role))) {
        if (isAppellantAppealRole(role)) return 'plaintiff';
        if (isAppelleeAppealRole(role)) return 'defendant';
    }

    if (isAffiliativeThirdPartyRole(role)) {
        const affiliated = affiliativeThirdPartySide(role, party.side);
        if (affiliated === 'plaintiff') return 'plaintiff';
        if (affiliated === 'defendant') return 'defendant';
    }

    if (isInterpleaderThirdPartyRole(role) && (party.side === 'right' || party.side === 'left')) {
        return party.side === 'right' ? 'plaintiff' : 'defendant';
    }

    if (isInterpleaderThirdPartyRole(role)) return 'third';

    if (isThirdPartyRole(role) && !isAffiliativeThirdPartyRole(role)) return 'third';

    if (isDefendantSideRole(role)) return 'defendant';
    if (isPlaintiffSideRole(role)) return 'plaintiff';
    if (party.side === 'left') return 'defendant';
    if (party.side === 'right') return 'plaintiff';
    return 'unknown';
}

function partyDedupeKey(party: Party): string {
    if (party.id != null && String(party.id).trim() !== '') return `id:${party.id}`;
    const name = String(party.name ?? '').trim();
    const role = String(party.role ?? '').trim();
    return `name:${name}|role:${role}`;
}

function mergeDuplicateParty(existing: Party, incoming: Party): Party {
    const existingClient = Boolean(existing.isClient || existing.lawyer?.isMyOffice);
    const incomingClient = Boolean(incoming.isClient || incoming.lawyer?.isMyOffice);
    if (existingClient && !incomingClient) return incoming;
    if (!existingClient && incomingClient) return existing;
    return String(incoming.role ?? '').length >= String(existing.role ?? '').length
        ? incoming
        : existing;
}

function dedupeByNameInBucket(parties: Party[]): Party[] {
    const byId = new Map<string, Party>();
    const withoutId: Party[] = [];
    for (const party of parties) {
        const id = String(party.id ?? '').trim();
        if (id) {
            const existing = byId.get(id);
            byId.set(id, existing ? mergeDuplicateParty(existing, party) : party);
            continue;
        }
        withoutId.push(party);
    }

    const byName = new Map<string, Party>();
    for (const party of withoutId) {
        const name = String(party.name ?? '').trim();
        if (!name) {
            byName.set(`__empty_${byName.size}`, party);
            continue;
        }
        const existing = byName.get(name);
        if (!existing) {
            byName.set(name, party);
            continue;
        }
        byName.set(name, mergeDuplicateParty(existing, party));
    }

    return [...byId.values(), ...byName.values()];
}

/** Remove exact duplicates (same id or same name+role) before persisting stage parties. */
export function dedupePartiesList(parties: Party[]): Party[] {
    const byKey = new Map<string, Party>();
    for (const party of parties) {
        const key = partyDedupeKey(party);
        const existing = byKey.get(key);
        if (!existing) {
            byKey.set(key, party);
            continue;
        }
        byKey.set(key, mergeDuplicateParty(existing, party));
    }
    return Array.from(byKey.values());
}

/** Drop stale plain interpleader row only when the same party id has an appeal-integrated role. */
export function dedupeAppealThirdPartyShadows(parties: Party[]): Party[] {
    const integratedById = new Set<string>();
    for (const party of parties) {
        const id = String(party.id ?? '').trim();
        if (!id) continue;
        const role = String(party.role ?? '').trim();
        if (
            isInterpleaderThirdPartyRole(role)
            && (isAppellantAppealRole(role) || isAppelleeAppealRole(role))
        ) {
            integratedById.add(id);
        }
    }
    if (integratedById.size === 0) return parties;

    return parties.filter((party) => {
        const id = String(party.id ?? '').trim();
        const role = String(party.role ?? '').trim();
        if (!id || !integratedById.has(id)) return true;
        if (!isInterpleaderThirdPartyRole(role)) return true;
        if (isAppellantAppealRole(role) || isAppelleeAppealRole(role)) return true;
        return false;
    });
}

/** Header display: main columns + interpleader third parties (اختصامي). */
export function partitionPartiesForHeader(parties: Party[]): {
    plaintiffs: Party[];
    defendants: Party[];
    interpleaders: Party[];
} {
    const seen = new Set<string>();
    const plaintiffs: Party[] = [];
    const defendants: Party[] = [];
    const interpleaders: Party[] = [];
    const unknown: Party[] = [];

    for (const party of parties) {
        const key = partyDedupeKey(party);
        if (seen.has(key)) continue;
        seen.add(key);

        const bucket = classifyPartySideBucket(party);
        if (bucket === 'third') interpleaders.push(party);
        else if (bucket === 'plaintiff') plaintiffs.push(party);
        else if (bucket === 'defendant') defendants.push(party);
        else unknown.push(party);
    }

    for (const party of unknown) {
        if (plaintiffs.length === 0) plaintiffs.push(party);
        else if (defendants.length === 0) defendants.push(party);
        else interpleaders.push(party);
    }

    const assignedIds = new Set(
        [...plaintiffs, ...defendants]
            .map((p) => String(p.id ?? '').trim())
            .filter(Boolean),
    );
    const filteredInterpleaders = interpleaders.filter((party) => {
        const id = String(party.id ?? '').trim();
        if (id && assignedIds.has(id)) return false;
        return true;
    });

    return {
        plaintiffs: dedupeByNameInBucket(plaintiffs),
        defendants: dedupeByNameInBucket(defendants),
        interpleaders: dedupeByNameInBucket(filteredInterpleaders),
    };
}

/** Single-pass partition: each party appears in at most one column. */
export function partitionPartiesBySide(parties: Party[]): { plaintiffs: Party[]; defendants: Party[] } {
    const { plaintiffs, defendants } = partitionPartiesForHeader(parties);
    return { plaintiffs, defendants };
}

/**
 * تسمية عمود الأطراف من صفاتهم الفعلية — لا من اسم المرحلة فقط.
 * يُرجع null إذا لم يُستنتج من الأطراف (يُستخدم getLegalRole كاحتياط).
 */
export function resolveHeaderPartyColumnLabel(
    columnParties: Party[],
    count?: number,
): string | null {
    if (!columnParties.length) return null;
    const n = count ?? columnParties.length;

    if (columnParties.some((p) => isAbsentObjectorRole(String(p.role ?? '')))) {
        return n === 1
            ? 'المعترض على الحكم الغيابي'
            : 'المعترضون على الحكم الغيابي';
    }
    if (columnParties.some((p) => isAbsentObjectedRole(String(p.role ?? '')))) {
        return n === 1
            ? 'المعترض عليه بالحكم الغيابي'
            : 'المعترض عليهم بالحكم الغيابي';
    }

    const hasAppellant = columnParties.some(
        (p) => isAppellantAppealRole(String(p.role ?? '')) && !isAbsentObjectorRole(String(p.role ?? '')),
    );
    const hasAppellee = columnParties.some(
        (p) => isAppelleeAppealRole(String(p.role ?? '')) && !isAbsentObjectedRole(String(p.role ?? '')),
    );

    if (hasAppellant && !hasAppellee) {
        return n === 1 ? 'المستأنف' : n === 2 ? 'المستأنفان' : 'المستأنفون';
    }
    if (hasAppellee && !hasAppellant) {
        return n === 1 ? 'المستأنف عليه' : n === 2 ? 'المستأنف عليهما' : 'المستأنف عليهم';
    }

    return null;
}
