import React from 'react';
import { PartyCardItem } from '../components/PartyCardItem';

export type PartiesSidebarProps = {
    party1Entries: Record<string, unknown>[];
    party2Entries: Record<string, unknown>[];
    procedureType: string;
    isFinalized: boolean;
    onEditParty: (payload: { type: 'party1' | 'party2'; index: number; party: Record<string, unknown> }) => void;
};

export function PartiesSidebar({
    party1Entries,
    party2Entries,
    procedureType,
    isFinalized,
    onEditParty,
}: PartiesSidebarProps) {
    return (
        <div className="lg:col-span-1 space-y-4">
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4">
                <div className="space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full mb-8">
                        <div className="flex flex-col gap-4 w-full">
                            {party1Entries.map((p, index) => (
                                <PartyCardItem
                                    key={`${String(p?.name ?? 'party1')}-${index}`}
                                    party={p}
                                    type="party1"
                                    index={index}
                                    procedureType={procedureType}
                                    totalCount={party1Entries.length}
                                    onEdit={onEditParty}
                                    readOnly={isFinalized}
                                />
                            ))}
                        </div>
                        <div className="flex flex-col gap-4 w-full">
                            {party2Entries.map((p, index) => (
                                <PartyCardItem
                                    key={`${String(p?.name ?? 'party2')}-${index}`}
                                    party={p}
                                    type="party2"
                                    index={index}
                                    procedureType={procedureType}
                                    totalCount={party2Entries.length}
                                    onEdit={onEditParty}
                                    readOnly={isFinalized}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
