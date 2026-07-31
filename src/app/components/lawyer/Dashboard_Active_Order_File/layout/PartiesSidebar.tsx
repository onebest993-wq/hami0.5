import React from 'react';
import { PartyCardItem } from '../components/PartyCardItem';
import { getDynamicPartyLabels } from '../utils/partyLabels';
import { URGENT_DOSSIER_CARD, URGENT_DOSSIER_SECTION_TITLE } from './urgentDossierUi';

export type PartiesSidebarProps = {
    party1Entries: Record<string, unknown>[];
    party2Entries: Record<string, unknown>[];
    procedureType: string;
    isFinalized: boolean;
    onEditParty: (payload: { type: 'party1' | 'party2'; index: number; party: Record<string, unknown> }) => void;
    embedded?: boolean;
};

function PartyGroup({
    title,
    entries,
    type,
    procedureType,
    isFinalized,
    onEditParty,
}: {
    title: string;
    entries: Record<string, unknown>[];
    type: 'party1' | 'party2';
    procedureType: string;
    isFinalized: boolean;
    onEditParty: PartiesSidebarProps['onEditParty'];
}) {
    if (entries.length === 0) return null;

    return (
        <section className="space-y-2 min-w-0" aria-label={title}>
            <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#E6C673]/70">{title}</h3>
            <div className="space-y-2">
                {entries.map((p, index) => (
                    <PartyCardItem
                        key={`${type}-${String(p?.name ?? 'party')}-${index}`}
                        party={p}
                        type={type}
                        index={index}
                        procedureType={procedureType}
                        totalCount={entries.length}
                        onEdit={onEditParty}
                        readOnly={isFinalized}
                    />
                ))}
            </div>
        </section>
    );
}

export function PartiesSidebar({
    party1Entries,
    party2Entries,
    procedureType,
    isFinalized,
    onEditParty,
    embedded = false,
}: PartiesSidebarProps) {
    const labels = getDynamicPartyLabels(procedureType);

    const content = (
        <>
            <div className="mb-3">
                <h2 className={URGENT_DOSSIER_SECTION_TITLE}>أطراف الإضبارة</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PartyGroup
                    title={labels.party1}
                    entries={party1Entries}
                    type="party1"
                    procedureType={procedureType}
                    isFinalized={isFinalized}
                    onEditParty={onEditParty}
                />
                <PartyGroup
                    title={labels.party2}
                    entries={party2Entries}
                    type="party2"
                    procedureType={procedureType}
                    isFinalized={isFinalized}
                    onEditParty={onEditParty}
                />
            </div>
        </>
    );

    if (embedded) {
        return (
            <div className="px-4 py-3" aria-label="أطراف الإضبارة">
                {content}
            </div>
        );
    }

    return (
        <aside className="w-full min-w-0" aria-label="أطراف الإضبارة">
            <div className={`${URGENT_DOSSIER_CARD} p-4`}>{content}</div>
        </aside>
    );
}
