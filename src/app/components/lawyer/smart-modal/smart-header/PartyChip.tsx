import React from 'react';
import {
    isAffiliativeThirdPartyRole,
    isAppealIntegratedInterpleaderRole,
    isInterpleaderThirdPartyRole,
} from '../smartFile/partyRoleClassification';
import { CLIENT_MARKER_SLOT } from './smartHeaderPresentation';

type PartyAccent = 'emerald' | 'rose' | 'gold';

interface PartyChipProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    party: any;
    accent: PartyAccent;
    isOpen: boolean;
    onToggle: () => void;
    variant?: 'main' | 'affiliative' | 'interpleader' | 'compact';
}

export const PartyChip = ({ party, accent, isOpen, onToggle, variant = 'compact' }: PartyChipProps) => {
    const name = String(party.name ?? '').trim() || '—';
    const role = String(party.role ?? '');
    const affiliative = isAffiliativeThirdPartyRole(role);
    const interpleader = isInterpleaderThirdPartyRole(role);
    const appealIntegratedInterpleader = isAppealIntegratedInterpleaderRole(role);
    const isClient = Boolean(party.isClient);
    const isMain = variant === 'main';
    const showClientMarker = isMain || variant === 'interpleader';

    const accentIdle =
        accent === 'emerald'
            ? 'border-emerald-400/18 hover:border-emerald-400/32 hover:bg-emerald-500/[0.06]'
            : accent === 'rose'
              ? 'border-rose-400/18 hover:border-rose-400/32 hover:bg-rose-500/[0.06]'
              : 'border-[#E6C673]/22 hover:border-[#E6C673]/38 hover:bg-[#E6C673]/[0.06]';

    const affiliativeShell =
        accent === 'emerald'
            ? 'border-indigo-400/20 bg-indigo-500/[0.07] hover:border-indigo-400/35'
            : 'border-indigo-400/20 bg-indigo-500/[0.07] hover:border-indigo-400/35';

    const interpleaderShell =
        'border-[#E6C673]/22 bg-[#E6C673]/[0.06] hover:border-[#E6C673]/38 hover:bg-[#E6C673]/[0.1]';

    return (
        <button
            type="button"
            onClick={onToggle}
            title={affiliative ? `${name} — انضمامي` : interpleader && !appealIntegratedInterpleader ? `${name} — اختصامي` : name}
            className={[
                'rounded-lg border backdrop-blur-sm transition-all duration-150 touch-manipulation',
                isMain
                    ? 'flex w-full items-center gap-1 min-w-0 px-1.5 py-1 bg-black/30'
                    : variant === 'affiliative'
                      ? `flex w-full min-w-0 items-center px-1.5 py-1 bg-black/20 ${affiliativeShell}`
                      : variant === 'interpleader'
                        ? `flex w-full min-w-0 items-center px-1.5 py-1 bg-black/25 ${interpleaderShell}`
                        : 'inline-flex items-center gap-1.5 max-w-[9.5rem] shrink-0 px-1.5 py-0.5 bg-black/25',
                isOpen ? 'border-[#E6C673]/35 bg-[#E6C673]/[0.08] ring-1 ring-[#E6C673]/20' : accentIdle,
            ].join(' ')}
        >
            {showClientMarker ? (
                <span className={CLIENT_MARKER_SLOT} aria-hidden={!isClient}>
                    {isClient ? (
                        <span className="text-[7px] font-black leading-none text-[#E6C673] border border-[#E6C673]/35 bg-[#E6C673]/12 px-1 py-0.5 rounded-md shadow-[0_0_8px_rgba(230,198,115,0.2)]">
                            موكل
                        </span>
                    ) : null}
                </span>
            ) : null}
            {variant === 'compact' && affiliative ? (
                <span className="shrink-0 rounded-md px-1 py-px text-[7px] font-black leading-none bg-indigo-500/22 text-indigo-200/95 border border-indigo-400/25">
                    انضمام
                </span>
            ) : null}
            {interpleader && !appealIntegratedInterpleader && variant === 'compact' ? (
                <span className="shrink-0 rounded-md px-1 py-px text-[7px] font-black leading-none bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/28">
                    اختصام
                </span>
            ) : null}
            {!showClientMarker && isClient ? (
                <span
                    className="rounded-full bg-[#E6C673] shrink-0 shadow-[0_0_6px_rgba(230,198,115,0.55)] w-1.5 h-1.5"
                    aria-hidden
                />
            ) : null}
            <span
                className={[
                    'font-bold text-white/92 truncate',
                    isMain ? 'flex-1 min-w-0 text-[15px] leading-snug text-right' : variant === 'affiliative' || variant === 'interpleader' ? 'flex-1 min-w-0 text-[11px] text-right' : 'text-[11px]',
                ].join(' ')}
            >
                {name}
            </span>
        </button>
    );
};
