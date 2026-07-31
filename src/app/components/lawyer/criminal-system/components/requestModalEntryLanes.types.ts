/**
 * Local draft for a seized asset before persisting it into the criminal store.
 * Keeping this type outside the lazy UI component prevents boot graph coupling.
 */
export type SeizedAssetDraft = {
    localId: string;
    description: string;
    referenceNumber?: string;
    seizureDate?: string;
    notes?: string;
};
