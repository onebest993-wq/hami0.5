/** طرف إضبارة أو نموذج إنشاء — صفة من `role` أو `status`. */
export type LawsuitPartyRoleRecord = {
    id?: unknown;
    role?: unknown;
    status?: unknown;
    side?: unknown;
};

function partyRoleText(p: LawsuitPartyRoleRecord): string {
    return String(p.role ?? p.status ?? '')
        .trim()
        .toLowerCase();
}

function partySideText(p: LawsuitPartyRoleRecord): string {
    return String(p.side ?? '')
        .trim()
        .toLowerCase();
}

function partyRoleRaw(p: LawsuitPartyRoleRecord): string {
    return String(p.role ?? p.status ?? '').trim();
}

/** مستأنف عليه / مميز عليه — قبل فحص «مدعي» داخل الأقواس */
function isAppealAppelleeLabel(role: string): boolean {
    const r = role.trim();
    return (
        r.includes('المستأنف عليه')
        || r.includes('مستأنف عليه')
        || r.includes('المميز عليه')
        || r.includes('مميز عليه')
        || r.includes('المعترض عليه')
    );
}

function isAppealAppellantLabel(role: string): boolean {
    const r = role.trim();
    if (isAppealAppelleeLabel(r)) return false;
    return (
        r.includes('المستأنف')
        || r.includes('مستأنف')
        || r.includes('المميز')
        || r.includes('مميز')
        || r.includes('المعترض على الحكم')
        || (r.includes('معترض') && r.includes('على الحكم') && !r.includes('المعترض عليه'))
    );
}

export function isLawsuitPlaintiffRecord(p: LawsuitPartyRoleRecord): boolean {
    const raw = partyRoleRaw(p);
    const role = partyRoleText(p);
    const side = partySideText(p);

    if (isAppealAppelleeLabel(raw)) return false;
    if (isAppealAppellantLabel(raw)) return true;

    if (role === 'plaintiff' || role === 'client' || role === 'creditor') return true;
    if (side === 'right' || side === '1' || side === 'plaintiff') return true;
    /* مدعي دون مدعى — بعد استبعاد المستأنف عليه (المدعي) أعلاه */
    if (role.includes('مدعي') && !role.includes('مدعى')) return true;
    if (role.includes('دائن')) return true;
    return false;
}

export function isLawsuitDefendantRecord(p: LawsuitPartyRoleRecord): boolean {
    const raw = partyRoleRaw(p);
    const role = partyRoleText(p);
    const side = partySideText(p);

    if (isAppealAppelleeLabel(raw)) return true;
    if (isAppealAppellantLabel(raw)) return false;

    if (role === 'defendant' || role === 'opponent' || role === 'debtor') return true;
    if (side === 'left' || side === '2' || side === 'defendant') return true;
    if (role.includes('مدعى') || role.includes('مدين') || role.includes('خصم')) return true;
    return false;
}

export function normalizeLawsuitPartyRoleLabel(raw: string, fallback: string): string {
    const role = raw.trim();
    if (!role) return fallback;
    const lower = role.toLowerCase();
    if (lower === 'plaintiff' || lower === 'client' || lower === 'creditor') return 'المدعي';
    if (lower === 'defendant' || lower === 'opponent' || lower === 'debtor') return 'المدعى عليه';
    /* أبقِ تسمية الطعن الكاملة إن وُجدت — أوضح من «المدعي» وحده */
    if (isAppealAppelleeLabel(role) || isAppealAppellantLabel(role)) return role;
    return role;
}

export function partitionLawsuitPartiesByRole<T extends LawsuitPartyRoleRecord>(
    parties: T[],
): { plaintiffs: T[]; defendants: T[] } {
    const plaintiffs = parties.filter(isLawsuitPlaintiffRecord);
    const plaintiffIds = new Set(
        plaintiffs
            .map((p) => String(p.id ?? '').trim())
            .filter(Boolean),
    );
    const defendants = parties.filter((p) => {
        if (!isLawsuitDefendantRecord(p)) return false;
        const id = String(p.id ?? '').trim();
        if (id && plaintiffIds.has(id)) return false;
        return true;
    });
    return { plaintiffs, defendants };
}
