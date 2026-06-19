import React from 'react';
import { UserCheck } from 'lucide-react';
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

function PartyStack({ role, parties }: { role: string; parties: Party[] }) {
    return (
        <div className="rounded-lg bg-white/[0.07] border border-white/[0.14] px-2 py-1.5 min-h-[3rem] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <p className={`text-[8px] font-black tracking-widest ${PS_TEXT_BEIGE} mb-1.5 opacity-90`}>{role}</p>
            {parties.length === 0 ? (
                <p className={`text-[10px] ${PS_TEXT_MUTED}`}>—</p>
            ) : (
                <ul className="space-y-1">
                    {parties.map((p) => (
                        <li key={String(p.id)} className="flex items-center justify-between gap-1">
                            <span className={`text-[11px] font-semibold ${PS_TEXT_PEARL} truncate`}>
                                {p.name || '—'}
                            </span>
                            {p.isClient ? (
                                <UserCheck size={10} className="text-[#C9B89A] shrink-0" />
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function PersonalStatusIdentityFolio({
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

    return (
        <article
            className={`${PS_PANEL} rounded-t-[1.75rem] rounded-bl-md rounded-br-[1.75rem] mb-2.5 overflow-hidden`}
        >
            <PersonalStatusArabesqueLayers primary={0.05} fine={0.025} />

            <div className="relative z-[1]">
                <div className="h-[2px] bg-gradient-to-l from-white/[0.35] via-[#ECE8E2]/40 to-[#F8F6F0]/25" />

                <div className="px-3 pt-2 pb-1.5 flex items-center justify-between gap-2 border-b border-white/[0.10]">
                    <div className="min-w-0 flex-1">
                        <p className={`text-[10px] ${PS_TEXT_MUTED} truncate leading-tight`}>{court}</p>
                        <h1 className={`text-[15px] font-bold ${PS_TEXT_PEARL} leading-tight mt-0.5 truncate`}>
                            {lawsuitType}
                        </h1>
                        {judge ? (
                            <p className={`text-[9px] ${PS_TEXT_MUTED} mt-0.5 leading-tight`}>القاضي · {judge}</p>
                        ) : null}
                    </div>
                    <div className="shrink-0 text-left">
                        <p className={`text-sm font-mono font-bold ${PS_TEXT_PEARL} tracking-wide leading-none`} dir="ltr">
                            {displayCaseNo(formData?.caseNo)}
                        </p>
                    </div>
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
                    <PartyStack role={p1Role} parties={plaintiffs} />
                    <PartyStack role={p2Role} parties={defendants} />
                </div>
            </div>
        </article>
    );
}
