import React from 'react';
import type { FileData, Party } from '../LawyerShared';
import { groupPartiesForHeader } from '../smart-modal/smartFile/incidentalCaseLinking';
import { resolveDisplayParties } from '../smart-modal/smartFile/resolveDisplayParties';
import { displayCaseNo, resolveLawsuitTypeLabel } from '../smart-modal/smart-header/smartHeaderPresentation';
import type { SmartHeaderProps } from '../smart-modal/smart-header/smartHeaderTypes';
import { getPersonalStatusRoleForSide, resolvePersonalApplicableLawLabel } from './personalStatusValidation';
import {
    PS_PANEL,
    PS_TEXT_BEIGE,
    PS_TEXT_MUTED,
    PS_TEXT_PEARL,
} from './personalStatusPearlTheme';
import { PersonalStatusArabesqueLayers } from './PersonalStatusMoroccanGlass';

const FOLIO_LABEL =
    'text-[8px] font-black tracking-[0.1em] text-[#9894A0] uppercase leading-none shrink-0';

const FOLIO_VALUE =
    'text-[11px] font-bold text-[#FFFEF9] leading-none truncate min-w-0';

const FOLIO_VALUE_MONO =
    'text-[11px] font-mono font-bold text-[#FFFEF9] tracking-wide leading-none truncate min-w-0';

const FOLIO_DOT = 'text-[#9894A0]/35 text-[10px] leading-none shrink-0 select-none';

const CLIENT_BADGE_CLASS =
    'rounded-md border border-[#E6C673]/40 bg-[#E6C673]/12 px-1.5 py-px text-[8px] font-extrabold text-[#E6C673] shrink-0';

function FolioMeta({
    label,
    children,
    mono = false,
    valueDir,
}: {
    label: string;
    children: React.ReactNode;
    mono?: boolean;
    valueDir?: 'ltr' | 'rtl' | 'auto';
}) {
    return (
        <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
            <span className={FOLIO_LABEL}>{label}</span>
            <span className={mono ? FOLIO_VALUE_MONO : FOLIO_VALUE} dir={valueDir}>
                {children}
            </span>
        </span>
    );
}

function partyShowsClientMark(
    p: Party,
    parties: Party[],
    representedParty?: string | null,
    side: 'plaintiff' | 'defendant',
): boolean {
    if (p.isClient) return true;
    const rp = String(representedParty ?? '').trim();
    if (!rp) return false;
    if (parties.some((x) => x.isClient)) return false;
    if (side === 'plaintiff' && rp === 'المدعي' && parties[0]?.id === p.id) return true;
    if (side === 'defendant' && rp === 'المدعى عليه' && parties[0]?.id === p.id) return true;
    return false;
}

function PartyStack({
    role,
    parties,
    representedParty,
    side,
}: {
    role: string;
    parties: Party[];
    representedParty?: string | null;
    side: 'plaintiff' | 'defendant';
}) {
    return (
        <div className="rounded-lg bg-white/[0.06] border border-white/[0.12] px-1.5 py-1 min-w-0 backdrop-blur-sm">
            <p className={`text-[7px] font-black tracking-[0.14em] ${PS_TEXT_BEIGE} mb-0.5 opacity-90`}>
                {role}
            </p>
            {parties.length === 0 ? (
                <p className={`text-[10px] ${PS_TEXT_MUTED} leading-none`}>—</p>
            ) : (
                <ul className="space-y-0.5">
                    {parties.map((p) => {
                        const isClient = partyShowsClientMark(p, parties, representedParty, side);
                        return (
                            <li key={String(p.id)} className="flex items-center gap-1 min-w-0">
                                <span className={`text-[10px] font-semibold ${PS_TEXT_PEARL} truncate min-w-0`}>
                                    {p.name || '—'}
                                </span>
                                {isClient ? (
                                    <span className={CLIENT_BADGE_CLASS} title="موكل">
                                        موكل
                                    </span>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export function PersonalStatusIdentityFolio({
    formData,
    caseType,
    file,
    representedParty,
}: SmartHeaderProps & { file?: FileData; representedParty?: string | null }) {
    const partiesList = Array.isArray(formData?.parties) && formData.parties.length > 0
        ? formData.parties
        : resolveDisplayParties({ displayStage: formData, allStages: [] });
    const { plaintiffs, defendants } = groupPartiesForHeader(partiesList);

    const resolvedRepresentedParty =
        representedParty ??
        (typeof formData?.representedParty === 'string' ? formData.representedParty : null) ??
        (typeof file?.representedParty === 'string' ? file.representedParty : null);

    const stageName = String(formData?.stageName ?? formData?.stage ?? '').trim() || 'أحوال شخصية';
    const p1Role = getPersonalStatusRoleForSide(stageName, 1, plaintiffs.length || 1);
    const p2Role = getPersonalStatusRoleForSide(stageName, 2, defendants.length || 1);
    const lawsuitType = resolveLawsuitTypeLabel(formData) || caseType || '—';
    const court = String(formData?.court ?? '').trim() || 'محكمة الأحوال الشخصية';
    const judge = String(formData?.judge ?? formData?.judgeName ?? '').trim();
    const lawLabel = resolvePersonalApplicableLawLabel(file?.applicableLaw);

    return (
        <article
            className={`${PS_PANEL} rounded-t-[1.25rem] rounded-bl-md rounded-br-[1.25rem] mb-2 overflow-hidden`}
            dir="rtl"
        >
            <PersonalStatusArabesqueLayers primary={0.05} fine={0.025} />

            <div className="relative z-[1]">
                <div className="px-2 py-1.5 border-b border-white/[0.10] space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <FolioMeta label="رقم الدعوى" mono valueDir="ltr">
                            {displayCaseNo(formData?.caseNo)}
                        </FolioMeta>
                        <span className={FOLIO_DOT} aria-hidden>
                            ·
                        </span>
                        <FolioMeta label="المحكمة">{court}</FolioMeta>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <FolioMeta label="نوع الدعوى">{lawsuitType}</FolioMeta>
                        {judge ? (
                            <>
                                <span className={FOLIO_DOT} aria-hidden>
                                    ·
                                </span>
                                <FolioMeta label="القاضي">{judge}</FolioMeta>
                            </>
                        ) : null}
                    </div>

                    {lawLabel ? (
                        <p className={`text-[9px] ${PS_TEXT_MUTED} leading-snug truncate pt-0.5`}>
                            <span className={`font-bold ${PS_TEXT_BEIGE}`}>القانون · </span>
                            {lawLabel}
                        </p>
                    ) : null}
                </div>

                <div className="grid grid-cols-2 gap-1 p-1.5">
                    <PartyStack
                        role={p1Role}
                        parties={plaintiffs}
                        representedParty={resolvedRepresentedParty}
                        side="plaintiff"
                    />
                    <PartyStack
                        role={p2Role}
                        parties={defendants}
                        representedParty={resolvedRepresentedParty}
                        side="defendant"
                    />
                </div>
            </div>
        </article>
    );
}
