import type { CriminalComplainant, CriminalDefendant } from '../criminalStore';

export type ActiveProfile =
    | { kind: 'complainant'; data: CriminalComplainant }
    | { kind: 'defendant'; data: CriminalDefendant }
    | null;

export type DeathConfirmTarget = { defendantId: string; displayName: string } | null;
