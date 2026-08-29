import React from 'react';
import { MapPin } from '@/app/components/ui/icons/MapPin';
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
    /** Address pin — only used when `variant === 'main'`. */
    isOpen?: boolean;
    onToggle?: () => void;
    groupLabel?: string;
    groupCount?: number;
    variant?: 'main' | 'affiliative' | 'interpleader' | 'compact';
}

const ACCENT_THEME: Record<
    PartyAccent,
    { bar: string; shell: string; dot: string; pin: string }
> = {
    emerald: {
        bar: 'bg-gradient-to-b from-emerald-300/90 via-emerald-400/70 to-emerald-600/40',
        shell: 'border-emerald-500/12 hover:border-emerald-400/24 bg-gradient-to-l from-emerald-500/[0.06] via-emerald-500/[0.025] to-transparent',
        dot: 'bg-emerald-400',
        pin: 'border-emerald-400/35 text-emerald-200 hover:bg-emerald-500/15',
    },
    rose: {
        bar: 'bg-gradient-to-b from-rose-300/90 via-rose-400/70 to-rose-600/40',
        shell: 'border-rose-500/12 hover:border-rose-400/24 bg-gradient-to-l from-rose-500/[0.06] via-rose-500/[0.025] to-transparent',
        dot: 'bg-rose-400',
        pin: 'border-rose-400/35 text-rose-200 hover:bg-rose-500/15',
    },
    gold: {
        bar: 'bg-gradient-to-b from-[#E6C673]/90 via-[#D4AF37]/70 to-[#B8941F]/40',
        shell: 'border-[#E6C673]/14 hover:border-[#E6C673]/26 bg-gradient-to-l from-[#E6C673]/[0.07] via-[#E6C673]/[0.025] to-transparent',
        dot: 'bg-[#E6C673]',
        pin: 'border-[#E6C673]/40 text-[#E6C673] hover:bg-[#E6C673]/12',
    },
};

export const PartyChip = ({
    party,
    accent,
    isOpen = false,
    onToggle,
    groupLabel,
    groupCount,
    variant = 'compact',
}: PartyChipProps) => {
    const name = String(party.name ?? '').trim() || '—';
    const role = String(party.role ?? '');
    const roleLabel = role.trim();
    const address = String(party.address ?? '').trim();
    const hasAddress = Boolean(address);
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
                'group relative border backdrop-blur-sm transition-all duration-200',
                isMain
                    ? `flex w-full items-center gap-2 min-w-0 rounded-[16px] px-2.5 py-2 ${isOpen ? 'overflow-visible z-30' : 'overflow-hidden'}`
                    : variant === 'affiliative' || variant === 'interpleader'
                      ? 'flex w-full min-w-0 items-center gap-1.5 rounded-[15px] px-2 py-1.5 overflow-hidden'
                      : 'inline-flex items-center gap-1.5 max-w-[10rem] shrink-0 rounded-xl px-2 py-1 overflow-hidden',
                theme.shell,
            ].join(' ')}
        >
            <span
                className={`absolute inset-y-1 right-0 w-0.5 rounded-full ${theme.bar}`}
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
                        <span className="truncate text-[9px] font-black tracking-wide text-white/48">
                            {groupLabel}
                        </span>
                        {typeof groupCount === 'number' ? (
                            <span className="inline-flex min-w-4 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.045] px-1 py-0.5 text-[8px] font-bold leading-none text-white/38">
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

            {isMain && onToggle ? (
                <div className="relative shrink-0">
                    <button
                        type="button"
                        onClick={onToggle}
                        aria-expanded={isOpen}
                        aria-label={hasAddress ? 'عرض العنوان' : 'العنوان غير محدد'}
                        title={hasAddress ? 'عرض العنوان' : 'العنوان غير محدد'}
                        className={`inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border bg-white/[0.03] transition-colors touch-manipulation ${
                            isOpen
                                ? 'border-[#E6C673]/45 bg-[#E6C673]/15 text-[#E6C673]'
                                : theme.pin
                        }`}
                    >
                        <MapPin size={14} strokeWidth={2.2} aria-hidden />
                    </button>
                    {isOpen ? (
                        <div
                            role="dialog"
                            aria-label="عنوان الطرف"
                            className="absolute top-1/2 end-full me-2 z-40 w-[min(13.5rem,55vw)] -translate-y-1/2 rounded-xl border border-white/15 bg-white/[0.08] px-2.5 py-2 text-right shadow-[0_8px_20px_rgba(0,0,0,0.22)] backdrop-blur-sm"
                        >
                            <p className="mb-0.5 text-[9px] font-bold text-white/40">العنوان</p>
                            <p className="text-[11px] font-medium leading-snug text-white/85 whitespace-normal break-words">
                                {hasAddress ? address : 'غير محدد'}
                            </p>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};
