export type CriminalActionParty = {
    id: string;
    fullName: string;
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    source: 'complainant' | 'defendant';
    isDeceased?: boolean;
    inMutualComplaint?: boolean;
    isAccusedAsComplainant?: boolean;
};

export function anonymizeJuvenilePartyName(fullName: string): string {
    const parts = String(fullName ?? '')
        .trim()
        .split(/\s+/)
        .filter((p) => p.length > 0);
    if (!parts.length) return '—';
    return parts.map((p) => `${p.charAt(0)}.`).join(' ');
}

export function displayPartyNameForCase(
    fullName: string,
    options: { isJuvenile?: boolean; isConfidential?: boolean; forExportOrPrint?: boolean },
): string {
    const raw = String(fullName ?? '').trim() || '—';
    if (raw.startsWith('مشكو منه مجهول') || raw.startsWith('حدث مجهول')) return raw;
    if (!options.isJuvenile) return raw;
    if (options.isConfidential || options.forExportOrPrint) {
        return anonymizeJuvenilePartyName(raw);
    }
    return raw;
}

export function formatConcernedPartyLabel(
    party: CriminalActionParty,
    opts?: { anonymizeJuvenile?: boolean },
): string {
    const name = displayPartyNameForCase(String(party.fullName ?? '').trim() || '—', {
        isJuvenile: Boolean(party.isJuvenile),
        isConfidential: opts?.anonymizeJuvenile === true,
        forExportOrPrint: opts?.anonymizeJuvenile === true,
    });
    if (party.inMutualComplaint) {
        const prefix = party.isUnderSeven ? 'الطرف-صغير' : party.isJuvenile ? 'الطرف-حدث' : 'الطرف';
        return `${prefix}: ${name}`;
    }
    if (party.source === 'complainant') {
        if (party.isUnderSeven) return `مشتكي/مجني عليه-صغير: ${name}`;
        return party.isJuvenile ? `مشتكي/مجني عليه-حدث: ${name}` : `مشتكي: ${name}`;
    }
    if (party.isUnderSeven) return `مشكو منه/متهم-صغير: ${name}`;
    return party.isJuvenile ? `مشكو منه/متهم-حدث: ${name}` : `متهم: ${name}`;
}

