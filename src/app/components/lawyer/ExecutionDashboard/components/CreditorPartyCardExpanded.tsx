import React from 'react';
import { MapPin } from '@/app/components/ui/icons/MapPin';
import { Users } from '@/app/components/ui/icons/Users';
import { ExecutionPartySpecialActionsMenu } from '@/app/components/lawyer/execution/ExecutionPartySpecialActionsMenu';
import type { Party } from '@/app/types/execution';

export type CreditorPartyCardExpandedProps = {
    occupation?: unknown;
    address?: unknown;
    isPmCred: boolean;
    ecIdx: number;
    creditorHeirsEditOnly: boolean;
    creditorDeathMenuLabel: string;
    handleCreditorDeathMenuAction: () => void;
    isHistoricalMode: boolean;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    openEditParty: (
        kind: 'creditor' | 'debtor',
        index: number,
        opts?: { forceHeirs?: boolean; party?: Party },
    ) => void;
    party: Party;
    creditorExtraMinorNames: string[];
    creditorExtraMinorLabel: string | null;
};

export function CreditorPartyCardExpanded({
    occupation,
    address,
    isPmCred,
    ecIdx,
    creditorHeirsEditOnly,
    creditorDeathMenuLabel,
    handleCreditorDeathMenuAction,
    isHistoricalMode,
    showToast,
    openEditParty,
    party,
    creditorExtraMinorNames,
    creditorExtraMinorLabel,
}: CreditorPartyCardExpandedProps) {
    return (
        <>
            <div className="relative z-20 mb-2 flex items-center justify-end pointer-events-auto">
                <ExecutionPartySpecialActionsMenu
                    variant="creditor"
                    creditorDeathEntryLabel={creditorDeathMenuLabel}
                    onReportCreditorDeath={handleCreditorDeathMenuAction}
                    isHistoricalMode={isHistoricalMode}
                    editPartyLabel={
                        creditorHeirsEditOnly ? 'تعديل بيانات الورثة' : 'تعديل بيانات الدائن'
                    }
                    onEditParty={() => {
                        if (isPmCred) {
                            showToast('لا يمكن تعديل هذا الدائن من هنا.', 'info');
                            return;
                        }
                        openEditParty('creditor', ecIdx, {
                            party,
                            forceHeirs: creditorHeirsEditOnly,
                        });
                    }}
                />
            </div>
            <div className="flex flex-col gap-2">
                {occupation ? (
                    <div className="min-w-0 rounded-lg border border-emerald-500/15 bg-slate-900/35 px-2.5 py-1.5">
                        <p className="mb-0.5 text-[10px] text-gray-400">الوظيفة</p>
                        <p className="text-xs font-medium leading-snug text-slate-200 break-words">
                            {String(occupation ?? '')}
                        </p>
                    </div>
                ) : null}
                {address ? (
                    <div className="min-w-0 rounded-lg border border-emerald-500/15 bg-slate-900/35 px-2.5 py-1.5">
                        <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                            <span>العنوان</span>
                            <MapPin size={12} className="shrink-0 text-emerald-400" />
                        </div>
                        <p className="text-xs leading-snug text-white break-words">
                            {String(address ?? '')}
                        </p>
                    </div>
                ) : null}
            </div>
            {!address && creditorExtraMinorNames.length === 0 && (
                <p className="py-1 text-center text-[11px] text-gray-500">لا يوجد عنوان مسجّل</p>
            )}
            {creditorExtraMinorNames.length > 0 && creditorExtraMinorLabel && (
                <div className="mt-1.5 border-t border-emerald-500/10 pt-1.5">
                    <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                        <span>{creditorExtraMinorLabel}</span>
                        <Users size={12} className="shrink-0 text-emerald-400" />
                    </div>
                    <p className="text-xs leading-snug text-white break-words">
                        {creditorExtraMinorNames.join('، ')}
                    </p>
                </div>
            )}
        </>
    );
}
