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
    openPartyKey,
    onToggleParty,
}: PartySidePaneProps) => {
    if (parties.length === 0) return null;
    const orderedParties = splitSideParties(parties as Party[]);

    return (
        <section
            className={`min-w-0 ${openPartyKey?.startsWith(keyPrefix) ? 'overflow-visible relative z-20' : 'overflow-hidden'}`}
        >
            <div className="mb-2">
                <span className={`text-[10px] font-black tracking-wide truncate uppercase ${labelClassName}`} title={label}>
                    {label}
                </span>
            </div>
            <div className={`flex flex-col gap-1.5 min-w-0 ${openPartyKey?.startsWith(keyPrefix) ? 'overflow-visible' : ''}`}>
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
                            isOpen={openPartyKey === rowKey}
                            onToggle={() => onToggleParty(openPartyKey === rowKey ? '' : rowKey)}
                        />
                    );

                    if (!affiliative && (!interpleader || appealIntegratedInterpleader)) {
                        return <div key={rowKey}>{chip}</div>;
                    }

                    return (
                        <div
                            key={rowKey}
                            className={
                                interpleader
                                    ? 'rounded-[15px] border border-[#E6C673]/20 bg-[#E6C673]/[0.05] backdrop-blur-sm px-1.5 py-1.5 space-y-1'
                                    : 'rounded-[15px] border border-indigo-400/20 bg-indigo-500/[0.05] backdrop-blur-sm px-1.5 py-1.5 space-y-1'
                            }
                        >
                            <span
                                className={
                                    interpleader
                                        ? 'block text-[8px] font-bold text-[#E6C673]/85 tracking-wide px-0.5'
                                        : 'block text-[8px] font-bold text-indigo-300/80 tracking-wide px-0.5'
                                }
                            >
                                {interpleader ? 'اختصام' : 'انضمام'}
                            </span>
                            {chip}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
