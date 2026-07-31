import type { Party } from '../../LawyerShared';
import { PartySidePane } from './PartySidePane';
import { InterpleaderPartiesPane } from './InterpleaderPartiesPane';

export interface HeaderPartiesStripProps {
    plaintiffs: Party[];
    defendants: Party[];
    interpleaders: Party[];
    p1Role: string;
    p2Role: string;
    openPartyKey: string | null;
    onToggleParty: (key: string) => void;
}

export function HeaderPartiesStrip({
    plaintiffs,
    defendants,
    interpleaders,
    p1Role,
    p2Role,
    openPartyKey,
    onToggleParty,
}: HeaderPartiesStripProps) {
    if (plaintiffs.length === 0 && defendants.length === 0 && interpleaders.length === 0) return null;

    const hasMainParties = plaintiffs.length > 0 || defendants.length > 0;
    // Always side-by-side when both sides exist — never flip between stacked/horizontal by breakpoint.
    const bothSides = plaintiffs.length > 0 && defendants.length > 0;

    return (
        <div className="space-y-2" dir="rtl">
            {hasMainParties ? (
                <div
                    className={`grid gap-2 min-w-0 ${bothSides ? 'grid-cols-2' : 'grid-cols-1'}`}
                >
                    <PartySidePane
                        label={p1Role}
                        labelClassName="text-emerald-400/95"
                        accent="emerald"
                        parties={plaintiffs}
                        keyPrefix="p1"
                        openPartyKey={openPartyKey}
                        onToggleParty={onToggleParty}
                    />

                    <PartySidePane
                        label={p2Role}
                        labelClassName="text-rose-400/95"
                        accent="rose"
                        parties={defendants}
                        keyPrefix="p2"
                        openPartyKey={openPartyKey}
                        onToggleParty={onToggleParty}
                    />
                </div>
            ) : null}

            {interpleaders.length > 0 ? (
                <InterpleaderPartiesPane
                    parties={interpleaders}
                    openPartyKey={openPartyKey}
                    onToggleParty={onToggleParty}
                />
            ) : null}
        </div>
    );
}
