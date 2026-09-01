import React from 'react';
import type { Party } from '../../LawyerShared';
import {
    isAffiliativeThirdPartyRole,
    isAppealIntegratedInterpleaderRole,
    isInterpleaderThirdPartyRole,
} from '../smartFile/partyRoleClassification';
import { PartyChip } from './PartyChip';
import { splitSideParties, type PartySidePaneProps } from './partyStripHelpers';

export const PartySidePane = ({
    label,
    labelClassName,
    accent,
    parties,
    keyPrefix,
}: PartySidePaneProps) => {
    if (parties.length === 0) return null;
    const orderedParties = splitSideParties(parties as Party[]);

    return (
        <section className="min-w-0 overflow-hidden">
            <div className="mb-2">
                <span className={`text-[10px] font-black tracking-wide truncate uppercase ${labelClassName}`} title={label}>
                    {label}
                </span>
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
                {orderedParties.map((party, idx) => {
                    const role = String(party.role ?? '');
                    const affiliative = isAffiliativeThirdPartyRole(role);
                    const interpleader = isInterpleaderThirdPartyRole(role);
                    const appealIntegratedInterpleader = isAppealIntegratedInterpleaderRole(role);
                    const rowKey = `${keyPrefix}-${party.id ?? idx}`;
                    const chip = (
                        <PartyChip
                            party={party}
                            accent={accent}
                            variant="main"
                        />
                    );

                    if (!affiliative && (!interpleader || appealIntegratedInterpleader)) {
                        return <div key={rowKey}>{chip}</div>;
                    }

                    return (
                        <div
                            key={rowKey}
                            className="rounded-xl border border-[#E6C673]/22 bg-[#E6C673]/[0.05] px-1.5 py-1.5 space-y-1"
                        >
                            <span className="block text-[8px] font-bold text-[#E6C673] tracking-wide px-0.5">
                                {interpleader ? 'اختصامي' : 'انضمامي'}
                            </span>
                            {chip}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
