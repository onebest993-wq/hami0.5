import type { Party } from '../../LawyerShared';

export const INTERPLEADER_STRIP_SHELL =
    'rounded-xl border border-[#E6C673]/22 bg-[#E6C673]/[0.05]';

export interface InterpleaderPartiesPaneProps {
    parties: Party[];
}
