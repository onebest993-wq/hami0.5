import type { Party } from '../../LawyerShared';

export const INTERPLEADER_STRIP_SHELL =
    'rounded-2xl border border-[#E6C673]/28 bg-gradient-to-br from-[#E6C673]/[0.1] via-[#0A0F1C]/50 to-[#0A0F1C]/35 backdrop-blur-xl shadow-[0_8px_32px_rgba(230,198,115,0.14),inset_0_1px_0_rgba(255,255,255,0.07)] ring-1 ring-inset ring-[#E6C673]/15';

export interface InterpleaderPartiesPaneProps {
    parties: Party[];
    openPartyKey: string | null;
    onToggleParty: (key: string) => void;
}
