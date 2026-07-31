import type { CriminalDefendant } from './criminalStore';

export const UNKNOWN_DEFENDANT_LABEL_PREFIX = 'مشكو منه مجهول';
export const JUVENILE_UNKNOWN_DEFENDANT_LABEL_PREFIX = 'حدث مجهول';

export function resolveDefendantFullNameLite(
    d: CriminalDefendant | Record<string, unknown> | undefined | null,
): string {
    if (!d) return '';
    const rec = d as Record<string, unknown>;
    const fromFullName = String(rec.fullName ?? '').trim();
    if (fromFullName) return fromFullName;
    return String(rec.name ?? '').trim();
}

export function isUnknownDefendantDisplayNameLite(name: string): boolean {
    const normalized = String(name ?? '').trim();
    return (
        normalized.startsWith(UNKNOWN_DEFENDANT_LABEL_PREFIX) ||
        normalized.startsWith(JUVENILE_UNKNOWN_DEFENDANT_LABEL_PREFIX)
    );
}

export function isDefendantIdentityUnknownLite(d: CriminalDefendant | undefined | null): boolean {
    if (!d) return false;
    if (d.isIdentityUnknown === true) return true;
    if (d.isIdentityUnknown === false) return false;
    return isUnknownDefendantDisplayNameLite(resolveDefendantFullNameLite(d));
}

export function isEmptyDefendantShellLite(d: CriminalDefendant | undefined | null): boolean {
    if (!d || isDefendantIdentityUnknownLite(d)) return false;
    return !resolveDefendantFullNameLite(d);
}

export function pruneEmptyDefendantShellsLite(defendants: CriminalDefendant[] | undefined): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => !isEmptyDefendantShellLite(d));
}

export function getIdentifiedDefendantsLite(defendants: CriminalDefendant[] | undefined): CriminalDefendant[] {
    return pruneEmptyDefendantShellsLite(
        (Array.isArray(defendants) ? defendants : []).filter((d) => !isDefendantIdentityUnknownLite(d)),
    );
}

export function getUnknownIdentityDefendantsLite(defendants: CriminalDefendant[] | undefined): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => isDefendantIdentityUnknownLite(d));
}

export function hasUnrevealedUnknownDefendantsLite(defendants: CriminalDefendant[] | undefined): boolean {
    return getUnknownIdentityDefendantsLite(defendants).length > 0;
}

export function hasIdentifiedDefendantLite(defendants: CriminalDefendant[] | undefined): boolean {
    return getIdentifiedDefendantsLite(defendants).length > 0;
}

export function investigationDossierHasMixedUnknownAndIdentifiedLite(
    defendants: CriminalDefendant[] | undefined,
): boolean {
    return hasUnrevealedUnknownDefendantsLite(defendants) && hasIdentifiedDefendantLite(defendants);
}

export function filterSeveranceSelectableDefendantsLite(
    defendants: CriminalDefendant[] | undefined,
): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => {
        if ((d as { isPartyRecordLocked?: boolean }).isPartyRecordLocked) return false;
        const status = String(d.investigationStatus ?? '').trim();
        if (status === 'closed_pending' || status === 'closed_final') return false;
        return true;
    });
}

export function countSeveranceSelectableDefendantsLite(defendants: CriminalDefendant[] | undefined): number {
    return filterSeveranceSelectableDefendantsLite(defendants).length;
}

export function caseAllowsDefendantSeveranceLite(defendants: CriminalDefendant[] | undefined): boolean {
    return countSeveranceSelectableDefendantsLite(defendants) >= 2;
}
