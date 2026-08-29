import React from 'react';
import { ArrowRightLeft } from '@/app/components/ui/icons/ArrowRightLeft';
import type { Party } from '../../LawyerShared';
import { PartyItem } from './PartyItem';
import type { CrossAppealEligibility } from '../smartFile/crossAppealEngine';

export function SmartHeaderCrossAppealCard({
    crossAppealEligibility,
    isAppealStage,
}: {
    crossAppealEligibility: CrossAppealEligibility;
    isAppealStage: boolean;
}) {
    if (!(crossAppealEligibility.filedCrossAppellants.length > 0 && isAppealStage)) {
        return null;
    }

    return (
        <div className="mt-4 mx-4 mb-4 border border-indigo-500/30 rounded-xl overflow-hidden relative">
            <div className="bg-indigo-900/30 p-2.5 border-b border-indigo-500/20 flex items-center justify-center gap-2 backdrop-blur-sm">
                <ArrowRightLeft size={14} className="text-indigo-400" />
                <span className="text-xs font-bold text-indigo-300">أطراف الاستئناف المتقابل</span>
            </div>

            <div className="grid grid-cols-2 divide-x divide-x-reverse divide-indigo-500/10 bg-black/40 backdrop-blur-sm">
                <div className="p-4 flex flex-col gap-3 group/cross-appellant hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-end mb-1">
                        <span className="text-[10px] font-bold text-indigo-400 tracking-wide uppercase opacity-80 text-right bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">المستأنف المتقابل</span>
                    </div>
                    {crossAppealEligibility.filedCrossAppellants.map((party: Party, index: number) => (
                        <div key={String(party.id ?? index)} className="w-full">
                            <PartyItem party={party} isEditing={false} align="right" />
                            {index < crossAppealEligibility.filedCrossAppellants.length - 1 && <hr className="border-slate-700/50 my-2" />}
                        </div>
                    ))}
                </div>

                <div className="p-4 flex flex-col gap-3 group/cross-appellee hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-end mb-1">
                        <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase opacity-80 text-right bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">المستأنف عليه المتقابل</span>
                    </div>
                    {crossAppealEligibility.crossAppellees.map((party: Party, index: number) => (
                        <div key={String(party.id ?? index)} className="w-full">
                            <PartyItem party={party} isEditing={false} align="left" />
                            {index < crossAppealEligibility.crossAppellees.length - 1 && <hr className="border-slate-700/50 my-2" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
