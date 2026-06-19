export interface FastTrackPetitionSummary {
    id: string;
    requestType?: string;
    subject?: string;
    status?: string;
    type?: string;
    reason?: string;
    submissionDate?: string;
    requestDate?: string;
}

export interface AttachmentShieldSummary {
    id: string;
    attachedProperty?: string;
    status?: string;
    legalBasis?: string;
}

export type FastTrackPreset = { requestType: string };

export type OnAddFastTrackFn = (preset?: FastTrackPreset) => void;
