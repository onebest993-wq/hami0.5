import { PartyChip } from './PartyChip';
import { INTERPLEADER_STRIP_SHELL, type InterpleaderPartiesPaneProps } from './interpleaderPresentation';
import { Users } from '@/app/components/ui/icons/Users';

export function InterpleaderPartiesPane({
    parties,
    openPartyKey,
    onToggleParty,
}: InterpleaderPartiesPaneProps) {
    if (parties.length === 0) return null;

    return (
        <div className={`${INTERPLEADER_STRIP_SHELL} p-2.5`}>
            <div className="flex items-center gap-2 mb-2 min-w-0">
                <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-[#E6C673]/14 border border-[#E6C673]/32 shrink-0">
                    <Users size={13} className="text-[#E6C673]" strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-[#E6C673] tracking-wide truncate">
                        الطرف الثالث الاختصامي
                    </span>
                    <span className="block text-[8px] text-white/38 truncate">دخول أو اختصام في الدعوى</span>
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
                            isOpen={openPartyKey === rowKey}
                            onToggle={() => onToggleParty(openPartyKey === rowKey ? '' : rowKey)}
                        />
                    );
                })}
            </div>
        </div>
    );
}
