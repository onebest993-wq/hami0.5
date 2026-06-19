import React from 'react';
import { UserCheck } from 'lucide-react';
import type { FileData, Party } from '../LawyerShared';
import { groupPartiesForHeader } from '../smart-modal/smartFile/incidentalCaseLinking';
import { resolveDisplayParties } from '../smart-modal/smartFile/resolveDisplayParties';
import { displayCaseNo, resolveLawsuitTypeLabel } from '../smart-modal/smart-header/smartHeaderPresentation';
import type { SmartHeaderProps } from '../smart-modal/smart-header/smartHeaderTypes';
import { getPersonalStatusRoleForSide, resolvePersonalApplicableLawLabel } from './personalStatusValidation';
import {
    PS_CARD,
    PS_CARD_INSET,
    PS_DIVIDER,
    PS_TEXT_BODY,
    PS_TEXT_LABEL,
    PS_TEXT_MUTED,
} from './personalStatusDossierTheme';

function PartyColumn({ role, parties }: { role: string; parties: Party[] }) {
    return (
        <div className={`${PS_CARD_INSET} min-w-0`}>
            <p className={`${PS_TEXT_LABEL} mb-1.5`}>{role}</p>
            {parties.length === 0 ? (
                <p className={PS_TEXT_MUTED}>—</p>
            ) : (
                <ul className="space-y-1">
                    {parties.map((party) => (
                        <li key={String(party.id)} className="flex items-center justify-between gap-2 min-w-0">
                            <span className={`${PS_TEXT_BODY} truncate`}>{party.name || '—'}</span>
                            {party.isClient ? (
                                <span className="inline-flex items-center gap-0.5 shrink-0 text-[8px] font-bold text-[#C4A574]">
                                    <UserCheck size={9} /> موكل
                                </span>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function PersonalStatusSmartHeader({
    formData,
    caseType,
    file,
}: SmartHeaderProps & { file?: FileData }) {
    const partiesList = Array.isArray(formData?.parties) && formData.parties.length > 0
        ? formData.parties
        : resolveDisplayParties({ displayStage: formData, allStages: [] });
    const { plaintiffs, defendants } = groupPartiesForHeader(partiesList);

    const stageName = String(formData?.stageName ?? formData?.stage ?? '').trim() || 'أحوال شخصية';
    const p1Role = getPersonalStatusRoleForSide(stageName, 1, plaintiffs.length || 1);
    const p2Role = getPersonalStatusRoleForSide(stageName, 2, defendants.length || 1);
    const lawsuitType = resolveLawsuitTypeLabel(formData) || caseType || '—';
    const court = String(formData?.court ?? '').trim() || 'محكمة الأحوال الشخصية';
    const judge = String(formData?.judge ?? formData?.judgeName ?? '').trim();
    const lawLabel = resolvePersonalApplicableLawLabel(file?.applicableLaw);
    const caseNo = displayCaseNo(formData?.caseNo);

    return (
        <div className={`${PS_CARD} mb-3`}>
            <div className={`${PS_CARD_INSET} flex items-start justify-between gap-3 border-b ${PS_DIVIDER}`}>
                <div className="min-w-0 flex-1">
                    <p className={`${PS_TEXT_MUTED} truncate`}>{court}</p>
                    <p className="text-sm font-bold text-white/90 truncate mt-0.5">{lawsuitType}</p>
                    {judge ? (
                        <p className="text-[10px] text-white/35 mt-0.5 truncate">القاضي · {judge}</p>
                    ) : null}
                </div>
                <div className="shrink-0 text-left">
                    <p className="text-[9px] font-bold text-[#C4A574]/70">{stageName}</p>
                    <p className="text-base font-mono font-bold text-white/92 tracking-wide" dir="ltr">
                        {caseNo}
                    </p>
                </div>
            </div>

            {lawLabel ? (
                <p className={`${PS_CARD_INSET} py-2 text-[10px] text-white/42 border-b ${PS_DIVIDER}`}>
                    <span className="text-[#C4A574]/75 font-bold">القانون · </span>
                    {lawLabel}
                </p>
            ) : null}

            <div className={`grid grid-cols-2 divide-x divide-x-reverse ${PS_DIVIDER}`}>
                <PartyColumn role={p1Role} parties={plaintiffs} />
                <PartyColumn role={p2Role} parties={defendants} />
            </div>
        </div>
    );
}
