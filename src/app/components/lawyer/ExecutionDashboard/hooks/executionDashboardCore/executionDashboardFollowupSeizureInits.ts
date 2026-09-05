import type { RealEstateGender, SeizedMovable } from '@/app/types/execution';

/** Input shape retained for phone-body / prop-key honesty — init save is retired. */
export type SaveSeizedPropertyInitInput = {
    decisionId: string;
    subject?: string;
    propertyNumber: string;
    propertyGender: RealEstateGender;
    deedNotes: string;
};

export type SaveSeizedMovableInitInput = {
    decisionId: string;
    subject?: string;
    movableDescription: string;
    movableLocation: string;
    judicialCustodianName: string;
};

/** Post-approve entity creation removed — bare request + decisions hub only. */
export function runSaveSeizedPropertyInitForDecision(
    _input: SaveSeizedPropertyInitInput,
    _deps?: unknown,
): void {
    /* no-op */
}

/** Post-approve entity creation removed — bare request + decisions hub only. */
export function runSaveSeizedMovableInitForDecision(
    _input: SaveSeizedMovableInitInput,
    _deps?: unknown,
): SeizedMovable | null {
    return null;
}
