import React from 'react';
import {
    isAffiliativeThirdPartyRole,
    isAppealIntegratedInterpleaderRole,
    isInterpleaderThirdPartyRole,
} from '../smartFile/partyRoleClassification';
import { CLIENT_MARKER_SLOT } from './smartHeaderPresentation';
import type { HeaderParty } from './smartHeaderTypes';

type PartyAccent = 'emerald' | 'rose' | 'gold';

interface PartyChipProps {
    party: HeaderParty;
    accent: PartyAccent;
    groupLabel?: string;
    groupCount?: number;
    variant?: 'main' | 'affiliative' | 'interpleader' | 'compact';
}

const ACCENT_THEME: Record<PartyAccent, { bar: string; shell: string; dot: string }> = {
    emerald: {
        bar: 'bg-emerald-400/75',
        shell: 'border-emerald-500/18 bg-emerald-500/[0.04] hover:border-emerald-400/32',
        dot: 'bg-emerald-400',
    },
    rose: {
        bar: 'bg-rose-400/75',
        shell: 'border-rose-500/18 bg-rose-500/[0.04] hover:border-rose-400/32',
        dot: 'bg-rose-400',
    },
    gold: {
        bar: 'bg-[#E6C673]/80',
        shell: 'border-[#E6C673]/20 bg-[#E6C673]/[0.05] hover:border-[#E6C673]/34',
        dot: 'bg-[#E6C673]',
    },
};

export const PartyChip = ({
    party,
    accent,
    groupLabel,
    groupCount,
    variant = 'compact',
}: PartyChipProps) => {
    const name = String(party.name ?? '').trim() || '—';
    const role = String(party.role ?? '');
    const affiliative = isAffiliativeThirdPartyRole(role);
    const interpleader = isInterpleaderThirdPartyRole(role);
    const appealIntegratedInterpleader = isAppealIntegratedInterpleaderRole(role);
    const isClient = Boolean(party.isClient);
    const isMain = variant === 'main';
    const showClientMarker = isMain || variant === 'interpleader';
    const theme = ACCENT_THEME[accent];

    return (
        <div
            className={[
                'group relative border transition-colors',
                isMain
                    ? 'flex w-full items-center gap-2 min-w-0 rounded-xl px-2.5 py-1.5 overflow-hidden'
                    : variant === 'affiliative' || variant === 'interpleader'
                      ? 'flex w-full min-w-0 items-center gap-1.5 rounded-xl px-2 py-1.5 overflow-hidden'
                      : 'inline-flex items-center gap-1.5 max-w-[10rem] shrink-0 rounded-lg px-2 py-1 overflow-hidden',
                theme.shell,
            ].join(' ')}
        >
            <span
                className={`absolute inset-y-1.5 right-0 w-0.5 rounded-full ${theme.bar}`}
                aria-hidden
            />

            {showClientMarker ? (
                <span className={CLIENT_MARKER_SLOT} aria-hidden={!isClient}>
                    {isClient ? (
                        <span className="text-[8px] font-black leading-none text-[#0A0F1C] bg-[#E6C673] px-1.5 py-0.5 rounded-full">
                            موكل
                        </span>
                    ) : null}
                </span>
            ) : null}

            <div className="flex-1 min-w-0 flex flex-col gap-0.5 pr-0.5">
                {isMain && groupLabel ? (
                    <span className="mb-0.5 flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[9px] font-bold tracking-wide text-white/45">
                            {groupLabel}
                        </span>
                        {typeof groupCount === 'number' ? (
                            <span className="inline-flex min-w-4 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.04] px-1 py-0.5 text-[8px] font-bold leading-none text-white/38">
                                {groupCount}
                            </span>
                        ) : null}
                    </span>
                ) : null}
                <span
                    className={[
                        'font-bold text-white truncate',
                        isMain ? 'text-[13px] leading-snug' : 'text-[11px] leading-tight',
                    ].join(' ')}
                    title={name}
                >
                    {name}
                </span>
                {variant === 'compact' && affiliative ? (
                    <span className="text-[8px] font-bold text-indigo-200/80">طرف انضمامي</span>
                ) : null}
                {interpleader && !appealIntegratedInterpleader && variant === 'compact' ? (
                    <span className="text-[8px] font-bold text-[#E6C673]/75">اختصامي</span>
                ) : null}
            </div>

            {!showClientMarker && isClient ? (
                <span className={`rounded-full shrink-0 w-2 h-2 ${theme.dot}`} aria-hidden />
            ) : null}
        </div>
    );
};
