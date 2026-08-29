/**
 * Court info types.
 */

export interface CourtInfo {
    name: string;
    type: CourtType;
    location?: string;
    judge?: string;
    caseNumber?: string;
}

export type CourtType =
    | 'civil'
    | 'sharia'
    | 'criminal'
    | 'administrative'
    | 'appeal'
    | 'cassation';
