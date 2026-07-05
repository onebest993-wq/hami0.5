import React from 'react';
import { ChevronDown } from 'lucide-react';
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

const ACCENT_THEME: Record<
    PartyAccent,
    { bar: string; shell: string; open: string; dot: string }
> = {
    emerald: {
        bar: 'bg-gradient-to-b from-emerald-300/90 via-emerald-400/70 to-emerald-600/40',
        shell: 'border-emerald-500/12 hover:border-emerald-400/24 bg-gradient-to-l from-emerald-500/[0.06] via-emerald-500/[0.025] to-transparent',
        open: 'border-emerald-400/40 bg-emerald-500/[0.1] ring-1 ring-emerald-400/20 shadow-[0_0_24px_rgba(52,211,153,0.1)]',
        dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]',
    },
    rose: {
        bar: 'bg-gradient-to-b from-rose-300/90 via-rose-400/70 to-rose-600/40',
        shell: 'border-rose-500/12 hover:border-rose-400/24 bg-gradient-to-l from-rose-500/[0.06] via-rose-500/[0.025] to-transparent',
        open: 'border-rose-400/40 bg-rose-500/[0.1] ring-1 ring-rose-400/20 shadow-[0_0_24px_rgba(244,63,94,0.1)]',
        dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.55)]',
    },
    gold: {
        bar: 'bg-gradient-to-b from-[#E6C673]/90 via-[#D4AF37]/70 to-[#B8941F]/40',
        shell: 'border-[#E6C673]/14 hover:border-[#E6C673]/26 bg-gradient-to-l from-[#E6C673]/[0.07] via-[#E6C673]/[0.025] to-transparent',
        open: 'border-[#E6C673]/42 bg-[#E6C673]/[0.1] ring-1 ring-[#E6C673]/22 shadow-[0_0_24px_rgba(230,198,115,0.12)]',
        dot: 'bg-[#E6C673] shadow-[0_0_8px_rgba(230,198,115,0.55)]',
    },
};

export const PartyChip = ({ party, accent, isOpen, onToggle, variant = 'compact' }: PartyChipProps) => {
    const name = String(party.name ?? '').trim() || '—';
    const role = String(party.role ?? '');
    const roleLabel = role.trim();
    const affiliative = isAffiliativeThirdPartyRole(role);
    const interpleader = isInterpleaderThirdPartyRole(role);
    const appealIntegratedInterpleader = isAppealIntegratedInterpleaderRole(role);
    const isClient = Boolean(party.isClient);
    const isMain = variant === 'main';
    const showClientMarker = isMain || variant === 'interpleader';
    const theme = ACCENT_THEME[accent];

    return (
        <button
            type="button"
            onClick={onToggle}
            title={affiliative ? `${name} — انضمامي` : interpleader && !appealIntegratedInterpleader ? `${name} — اختصامي` : name}
            className={[
                'group relative overflow-hidden border backdrop-blur-md transition-all duration-200 touch-manipulation text-right',
                isMain
                    ? 'flex w-full items-center gap-2 min-w-0 rounded-[16px] px-2.5 py-2'
                    : variant === 'affiliative' || variant === 'interpleader'
                      ? 'flex w-full min-w-0 items-center gap-1.5 rounded-[15px] px-2 py-1.5'
                      : 'inline-flex items-center gap-1.5 max-w-[10rem] shrink-0 rounded-xl px-2 py-1',
                isOpen ? theme.open : theme.shell,
            ].join(' ')}
        >
            <span
                className={`absolute inset-y-1 right-0 w-0.5 rounded-full ${theme.bar}`}
                aria-hidden
            />

            {showClientMarker ? (
                <span className={CLIENT_MARKER_SLOT} aria-hidden={!isClient}>
                    {isClient ? (
                        <span className="text-[8px] font-black leading-none text-[#0A0F1C] bg-[#E6C673] px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(230,198,115,0.28)]">
                            موكل
                        </span>
                    ) : null}
                </span>
            ) : null}

            <div className="flex-1 min-w-0 flex flex-col gap-0.5 pr-0.5">
                <span
                    className={[
                        'font-bold text-white truncate',
                        isMain ? 'text-[13px] leading-snug' : 'text-[11px] leading-tight',
                    ].join(' ')}
                >
                    {name}
                </span>
                {isMain && roleLabel ? (
                    <span className="truncate text-[9px] font-semibold text-white/42">
                        {roleLabel}
                    </span>
                ) : null}
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

            {isMain ? (
                <ChevronDown
                    size={14}
                    className={`shrink-0 text-white/30 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#E6C673]/70' : 'group-hover:text-white/50'}`}
                    aria-hidden
                />
            ) : null}
        </button>
    );
};
