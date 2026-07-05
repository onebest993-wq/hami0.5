import { motion, AnimatePresence } from 'motion/react';
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
    const resolveExpanded = (): Party | null => {
        if (!openPartyKey) return null;
        const matchP1 = plaintiffs.find((p, idx) => `p1-${p.id ?? idx}` === openPartyKey);
        if (matchP1) return matchP1;
        const matchP2 = defendants.find((p, idx) => `p2-${p.id ?? idx}` === openPartyKey);
        if (matchP2) return matchP2;
        const matchTp = interpleaders.find((p, idx) => `tp-${p.id ?? idx}` === openPartyKey);
        if (matchTp) return matchTp;
        return null;
    };

    const activeParty = resolveExpanded();
    const addressLine = activeParty
        ? String(activeParty.address ?? '').trim() || 'العنوان غير محدد'
        : null;

    if (plaintiffs.length === 0 && defendants.length === 0 && interpleaders.length === 0) return null;

    const hasMainParties = plaintiffs.length > 0 || defendants.length > 0;

    return (
        <div className="space-y-2" dir="rtl">
            {hasMainParties ? (
                <>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 min-w-0">
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

                    <AnimatePresence initial={false}>
                        {addressLine && openPartyKey?.startsWith('p') ? (
                            <motion.p
                                key={openPartyKey}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="rounded-[16px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.038),rgba(255,255,255,0.015))] px-2.5 py-2 text-[10px] text-white/52 truncate"
                            >
                                {addressLine}
                            </motion.p>
                        ) : null}
                    </AnimatePresence>
                </>
            ) : null}

            {interpleaders.length > 0 ? (
                <InterpleaderPartiesPane
                    parties={interpleaders}
                    openPartyKey={openPartyKey}
                    onToggleParty={onToggleParty}
                />
            ) : null}

            <AnimatePresence initial={false}>
                {addressLine && openPartyKey?.startsWith('tp-') ? (
                    <motion.p
                        key={openPartyKey}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-[16px] border border-[#E6C673]/12 bg-[#E6C673]/[0.05] px-2.5 py-2 text-[10px] text-white/52 truncate"
                    >
                        {addressLine}
                    </motion.p>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
