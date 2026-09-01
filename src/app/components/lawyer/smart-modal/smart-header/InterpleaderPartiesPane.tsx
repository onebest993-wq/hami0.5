import { PartyChip } from './PartyChip';
import { INTERPLEADER_STRIP_SHELL, type InterpleaderPartiesPaneProps } from './interpleaderPresentation';

export function InterpleaderPartiesPane({
    parties,
}: InterpleaderPartiesPaneProps) {
    if (parties.length === 0) return null;

    return (
        <div className={`${INTERPLEADER_STRIP_SHELL} p-2.5`}>
            <div className="flex items-center gap-2 mb-2 min-w-0">
                <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-[#E6C673] tracking-wide truncate">
                        اختصامي
                    </span>
                </div>
                <span className="shrink-0 rounded-lg border border-[#E6C673]/25 bg-[#E6C673]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#E6C673]/85 tabular-nums">
                    {parties.length}
                </span>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
                {parties.map((party, idx) => {
                    const rowKey = `tp-${party.id ?? idx}`;
                    return (
                        <PartyChip
                            key={rowKey}
                            party={party}
                            accent="gold"
                            variant="interpleader"
                        />
                    );
                })}
            </div>
        </div>
    );
}
