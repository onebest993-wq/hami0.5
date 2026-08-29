import type { CriminalDefendant } from './criminalStore';

export const UNKNOWN_DEFENDANT_LABEL_PREFIX = 'مشكو منه مجهول';
export const JUVENILE_UNKNOWN_DEFENDANT_LABEL_PREFIX = 'حدث مجهول';

function resolveDefendantFullNameLite(
    d: CriminalDefendant | Record<string, unknown> | undefined | null,
): string {
    if (!d) return '';
    const rec = d as Record<string, unknown>;
    const fromFullName = String(rec.fullName ?? '').trim();
    if (fromFullName) return fromFullName;
    return String(rec.name ?? '').trim();
}

function isUnknownDefendantDisplayNameLite(name: string): boolean {
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

function isEmptyDefendantShellLite(d: CriminalDefendant | undefined | null): boolean {
    if (!d || isDefendantIdentityUnknownLite(d)) return false;
    return !resolveDefendantFullNameLite(d);
}

function pruneEmptyDefendantShellsLite(defendants: CriminalDefendant[] | undefined): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => !isEmptyDefendantShellLite(d));
}

export function getIdentifiedDefendantsLite(defendants: CriminalDefendant[] | undefined): CriminalDefendant[] {
    return pruneEmptyDefendantShellsLite(
        (Array.isArray(defendants) ? defendants : []).filter((d) => !isDefendantIdentityUnknownLite(d)),
    );
}

