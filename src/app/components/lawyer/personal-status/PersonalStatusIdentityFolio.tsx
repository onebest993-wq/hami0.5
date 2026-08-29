import React from 'react';
import type { FileData, Party } from '../LawyerShared';
import { groupPartiesForHeader } from '../smart-modal/smartFile/incidentalCaseLinking';
import { resolveDisplayParties } from '../smart-modal/smartFile/resolveDisplayParties';
import { displayCaseNo, caseNoTextDir, displayMetaField, resolveLawsuitTypeLabel } from '../smart-modal/smart-header/smartHeaderPresentation';
import type { SmartHeaderProps } from '../smart-modal/smart-header/smartHeaderTypes';
import { getPersonalStatusRoleForSide, resolvePersonalApplicableLawLabel } from './personalStatusValidation';

function partyShowsClientMark(
    p: Party,
    parties: Party[],
    representedParty: string | null | undefined,
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

function MetaCell({
    label,
    children,
    valueDir,
    wide = false,
}: {
    label: string;
    children: React.ReactNode;
    valueDir?: 'ltr' | 'rtl' | 'auto';
    wide?: boolean;
}) {
    return (
        <div className={wide ? 'min-w-0 col-span-2' : 'min-w-0'} dir="rtl">
            <dt className="text-[10px] font-bold text-white/40 leading-tight">{label}</dt>
            <dd
                className={
                    wide
                        ? 'mt-0.5 text-[12px] font-semibold text-white/88 leading-snug'
                        : 'mt-0.5 text-[12px] font-semibold text-white/88 truncate leading-snug'
                }
                dir={valueDir}
            >
                {children}
            </dd>
        </div>
    );
}

function PartyColumn({
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
        <div className="min-w-0">
            <p className="text-[10px] font-bold text-white/40 mb-0.5 leading-tight">{role}</p>
            {parties.length === 0 ? (
                <p className="text-[12px] text-white/35">غير محدد</p>
            ) : (
                <ul className="space-y-0.5">
                    {parties.map((p) => {
                        const isClient = partyShowsClientMark(p, parties, representedParty, side);
                        return (
                            <li key={String(p.id)} className="flex items-center gap-1 min-w-0">
                                <span className="text-[12px] font-semibold text-white/88 truncate min-w-0">
                                    {displayMetaField(p.name)}
                                </span>
                                {isClient ? (
                                    <span className="text-[10px] font-bold text-[#E6C673] shrink-0">موكل</span>
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
    const partiesList =
        Array.isArray(formData?.parties) && formData.parties.length > 0
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
    const lawsuitType = displayMetaField(resolveLawsuitTypeLabel(formData) || caseType);
    const court = displayMetaField(formData?.court);
    const judge = displayMetaField(formData?.judge ?? formData?.judgeName);
    const lawLabel = resolvePersonalApplicableLawLabel(file?.applicableLaw);

    return (
        <article className="mb-2 pb-2 border-b border-white/[0.07]" dir="rtl">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <MetaCell label="رقم الدعوى" valueDir={caseNoTextDir(formData?.caseNo)}>
                    {displayCaseNo(formData?.caseNo)}
                </MetaCell>
                <MetaCell label="المحكمة">{court}</MetaCell>
                <MetaCell label="نوع الدعوى">{lawsuitType}</MetaCell>
                <MetaCell label="القاضي">{judge}</MetaCell>
                {lawLabel ? (
                    <MetaCell label="القانون المطبق" wide>
                        {lawLabel}
                    </MetaCell>
                ) : null}
            </dl>

            <div className="mt-2 grid grid-cols-2 gap-x-4 border-t border-white/[0.07] pt-2">
                <PartyColumn
                    role={p1Role}
                    parties={plaintiffs}
                    representedParty={resolvedRepresentedParty}
                    side="plaintiff"
                />
                <PartyColumn
                    role={p2Role}
                    parties={defendants}
                    representedParty={resolvedRepresentedParty}
                    side="defendant"
                />
            </div>
        </article>
    );
}
