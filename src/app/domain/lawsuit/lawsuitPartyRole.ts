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

export function isLawsuitPlaintiffRecord(p: LawsuitPartyRoleRecord): boolean {
    const role = partyRoleText(p);
    const side = partySideText(p);
    if (role === 'plaintiff' || role === 'client' || role === 'creditor') return true;
    if (side === 'right') return true;
    if (role.includes('مدعي') && !role.includes('مدعى')) return true;
    if (role.includes('دائن')) return true;
    return false;
}

export function isLawsuitDefendantRecord(p: LawsuitPartyRoleRecord): boolean {
    const role = partyRoleText(p);
    const side = partySideText(p);
    if (role === 'defendant' || role === 'opponent' || role === 'debtor') return true;
    if (side === 'left') return true;
    if (role.includes('مدعى') || role.includes('مدين') || role.includes('خصم')) return true;
    return false;
}

export function normalizeLawsuitPartyRoleLabel(raw: string, fallback: string): string {
    const role = raw.trim();
    if (!role) return fallback;
    const lower = role.toLowerCase();
    if (lower === 'plaintiff' || lower === 'client' || lower === 'creditor') return 'المدعي';
    if (lower === 'defendant' || lower === 'opponent' || lower === 'debtor') return 'المدعى عليه';
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
