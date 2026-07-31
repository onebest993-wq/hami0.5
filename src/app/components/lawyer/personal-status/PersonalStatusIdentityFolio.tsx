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
import {
    PersonalStatusArabesqueLayers,
    PersonalStatusMoroccanDivider,
} from './PersonalStatusMoroccanGlass';

const FOLIO_LABEL =
    'text-[8px] font-black tracking-[0.14em] text-[#9894A0] uppercase leading-none';

const CLIENT_BADGE_CLASS =
    'rounded-md border border-[#E6C673]/40 bg-[#E6C673]/12 px-1.5 py-px text-[8px] font-extrabold text-[#E6C673] shrink-0';

function FolioField({
    label,
    children,
    className = '',
    align = 'start',
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
    align?: 'start' | 'end';
}) {
    return (
        <div className={`min-w-0 ${className}`}>
            <p className={`${FOLIO_LABEL} ${align === 'end' ? 'text-right' : ''}`}>{label}</p>
            <div className="mt-1">{children}</div>
        </div>
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
        <div className="rounded-lg bg-white/[0.07] border border-white/[0.14] px-2 py-1.5 min-h-[3rem] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <p className={`text-[8px] font-black tracking-widest ${PS_TEXT_BEIGE} mb-1.5 opacity-90`}>{role}</p>
            {parties.length === 0 ? (
                <p className={`text-[10px] ${PS_TEXT_MUTED}`}>—</p>
            ) : (
                <ul className="space-y-1">
                    {parties.map((p) => {
                        const isClient = partyShowsClientMark(p, parties, representedParty, side);
                        return (
                            <li key={String(p.id)} className="flex items-center gap-1 min-w-0">
                                <span className={`text-[11px] font-semibold ${PS_TEXT_PEARL} truncate min-w-0`}>
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
            className={`${PS_PANEL} rounded-t-[1.75rem] rounded-bl-md rounded-br-[1.75rem] mb-2.5 overflow-hidden`}
        >
            <PersonalStatusArabesqueLayers primary={0.05} fine={0.025} />

            <div className="relative z-[1]">
                <div className="h-[2px] bg-gradient-to-l from-white/[0.35] via-[#ECE8E2]/40 to-[#F8F6F0]/25" />

                <div className="px-3 pt-2.5 pb-2 border-b border-white/[0.10] space-y-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-2 items-start">
                        <FolioField label="رقم الدعوى">
                            <p
                                className={`text-sm font-mono font-bold ${PS_TEXT_PEARL} tracking-wide leading-none`}
                                dir="ltr"
                            >
                                {displayCaseNo(formData?.caseNo)}
                            </p>
                        </FolioField>
                        <FolioField label="المحكمة" align="end">
                            <p className={`text-[11px] font-semibold ${PS_TEXT_BEIGE} leading-snug text-right truncate`}>
                                {court}
                            </p>
                        </FolioField>
                    </div>
                    <FolioField label="نوع الدعوى">
                        <h1 className={`text-[14px] font-bold ${PS_TEXT_PEARL} leading-snug`}>{lawsuitType}</h1>
                    </FolioField>
                    {judge ? (
                        <FolioField label="القاضي">
                            <p className={`text-[11px] font-semibold ${PS_TEXT_BEIGE} leading-snug`}>{judge}</p>
                        </FolioField>
                    ) : null}
                </div>

                {lawLabel ? (
                    <>
                        <p className={`px-3 py-1.5 text-[10px] ${PS_TEXT_MUTED}`}>
                            <span className={`font-bold ${PS_TEXT_BEIGE}`}>القانون · </span>
                            {lawLabel}
                        </p>
                        <PersonalStatusMoroccanDivider className="pb-0.5" />
                    </>
                ) : null}

                <div className="grid grid-cols-2 gap-1.5 p-2">
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
