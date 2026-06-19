import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, MapPin, UserCheck, X } from 'lucide-react';
import { hasBlockedWord } from '../LawyerNewCase/utils';
import type { Party } from '../LawyerNewCase/types';
import { personalFieldClass } from './personalStatusVisualTheme';

export function PersonalStatusPartyCard({
    party,
    index,
    side,
    onUpdate,
    onRemove,
    canRemove,
    errorMap,
}: {
    party: Party;
    index: number;
    side: 1 | 2;
    onUpdate: (field: keyof Party, value: string | boolean) => void;
    onRemove: () => void;
    canRemove: boolean;
    errorMap: Record<string, string>;
}) {
    const [expanded, setExpanded] = useState(index === 0);
    const isFirst = index === 0;
    const hasError = errorMap[`party_${party.id}`];
    const sideAccent = side === 1 ? 'from-violet-500/25 to-fuchsia-500/10' : 'from-teal-500/25 to-emerald-500/10';
    const sideBorder = side === 1 ? 'border-violet-300/25' : 'border-teal-300/25';
    const roleColor = side === 1 ? 'text-violet-200' : 'text-teal-200';

    return (
        <motion.div
            layout
            className={`rounded-[1.5rem] border ${sideBorder} bg-gradient-to-bl ${sideAccent} overflow-hidden`}
        >
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 text-right"
            >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${side === 1 ? 'bg-violet-500/20 text-violet-100' : 'bg-teal-500/20 text-teal-100'}`}>
                    {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                    {isFirst ? <span className={`text-[10px] font-bold ${roleColor} block`}>{party.status}</span> : null}
                    <span className="text-sm font-bold text-white/90 truncate block">{party.name || '— اسم غير مُدخل —'}</span>
                </div>
                <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="text-white/40">
                    <ChevronDown size={16} />
                </motion.span>
            </button>

            <AnimatePresence initial={false}>
                {expanded ? (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.06]">
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => onUpdate('isClient', !party.isClient)}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold border transition-all ${
                                        party.isClient
                                            ? side === 1
                                                ? 'border-violet-300/50 bg-violet-400/15 text-violet-50'
                                                : 'border-teal-300/50 bg-teal-400/15 text-teal-50'
                                            : 'border-white/12 bg-white/[0.03] text-white/45'
                                    }`}
                                >
                                    <UserCheck size={11} /> موكل
                                </button>
                                {canRemove ? (
                                    <button type="button" onClick={onRemove} className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                                        <X size={14} />
                                    </button>
                                ) : null}
                            </div>

                            <input
                                type="text"
                                value={party.name}
                                onChange={(e) => onUpdate('name', e.target.value)}
                                className={personalFieldClass(Boolean(hasError) || hasBlockedWord(party.name))}
                                placeholder="الاسم الكامل"
                            />
                            {hasBlockedWord(party.name) ? (
                                <p className="text-amber-400/90 text-[10px]">ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة</p>
                            ) : null}

                            <div className="relative">
                                <MapPin size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
                                <input
                                    type="text"
                                    value={party.address}
                                    onChange={(e) => onUpdate('address', e.target.value)}
                                    className={`${personalFieldClass()} pr-9 text-xs`}
                                    placeholder="العنوان (اختياري)"
                                />
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </motion.div>
    );
}
