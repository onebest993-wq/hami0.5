import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from '@/app/motion/overlayMotionRuntime';
import { useCriminalStore } from '../criminalStore';
import {
    buildProceduralLinkOptions,
    type ProceduralContextValue,
    type ProceduralLinkOption,
} from '../proceduralItemLink';

export type ProceduralContextLinkFieldProps = {
    caseId: string;
    value: ProceduralContextValue;
    onChange: (next: ProceduralContextValue) => void;
};

type PickMode = 'none' | 'timeline' | 'request' | 'text';

const linkPanelMotion = {
    initial: { opacity: 0, height: 0, marginTop: 0 },
    animate: { opacity: 1, height: 'auto', marginTop: 8 },
    exit: { opacity: 0, height: 0, marginTop: 0 },
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

export const ProceduralContextLinkField = ({ caseId, value, onChange }: ProceduralContextLinkFieldProps) => {
    const caseRow = useCriminalStore((s) => s.casesById[caseId]);
    const { timeline, requests } = useMemo(
        () =>
            buildProceduralLinkOptions({
                timelineEvents: caseRow?.timelineEvents,
                lawyerRequests: caseRow?.lawyerRequests,
            }),
        [caseRow?.lawyerRequests, caseRow?.timelineEvents],
    );

    const [mode, setMode] = useState<PickMode>(() =>
        value.link ? value.link.kind : value.contextNote && !value.link ? 'text' : 'none',
    );
    const [query, setQuery] = useState('');

    const list: ProceduralLinkOption[] = mode === 'timeline' ? timeline : mode === 'request' ? requests : [];

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return list.slice(0, 40);
        return list.filter((o) => `${o.label} ${o.sublabel ?? ''}`.toLowerCase().includes(q)).slice(0, 40);
    }, [list, query]);

    const setModeAndReset = (m: PickMode) => {
        setMode(m);
        setQuery('');
        if (m === 'text') {
            onChange({ link: undefined, contextNote: value.contextNote ?? '' });
        } else if (m === 'none') {
            onChange({});
        } else {
            onChange({ link: undefined, contextNote: value.contextNote });
        }
    };

    const pick = (opt: ProceduralLinkOption) => {
        onChange({
            link: { kind: opt.kind, id: opt.id, label: opt.label },
            contextNote: value.contextNote,
        });
    };

    const tabActiveClass =
        'border-[#E6C673] bg-[#E6C673] text-[#0B1021]';
    const tabIdleClass = 'border-slate-600/50 text-white/55 hover:text-white hover:border-slate-500/70 bg-transparent';

    return (
        <div className="space-y-2">
            <label className="block text-white/70 text-xs font-black">ربط بالقضية (اختياري)</label>
            <div className="flex flex-wrap gap-1">
                {(
                    [
                        { id: 'none', label: 'بدون ربط' },
                        { id: 'timeline', label: '📅 تايم لاين' },
                        { id: 'request', label: '📋 طلب' },
                        { id: 'text', label: 'نص حر' },
                    ] as const
                ).map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setModeAndReset(tab.id as PickMode)}
                        className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black border transition-all duration-200 ${
                            mode === tab.id ? tabActiveClass : tabIdleClass
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {value.link ? (
                <div className="rounded-lg border border-[#E6C673]/35 bg-[#E6C673]/10 px-3 py-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 text-[11px] font-bold text-[#E6C673]/95 break-words">
                        {value.link.kind === 'timeline' ? '📅' : '📋'} {value.link.label}
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange({ contextNote: value.contextNote })}
                        className="text-[10px] font-black text-white/50 hover:text-red-300 shrink-0"
                    >
                        إزالة
                    </button>
                </div>
            ) : null}

            <AnimatePresence initial={false} mode="wait">
                {mode === 'timeline' || mode === 'request' ? (
                    <motion.div
                        key={mode}
                        {...linkPanelMotion}
                        className="overflow-hidden"
                    >
                        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-2 space-y-2">
                            <input
                                className="w-full bg-slate-950 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-[#E6C673]/50"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="بحث سريع..."
                            />
                            {filtered.length === 0 ? (
                                <div className="text-white/45 text-[10px] font-bold px-1 py-2 text-center">
                                    لا توجد سجلات — أضفها من تبويب التايم لاين أو الطلبات أولاً
                                </div>
                            ) : (
                                <ul className="max-h-36 overflow-y-auto space-y-1">
                                    {filtered.map((opt) => (
                                        <li key={`${opt.kind}-${opt.id}`}>
                                            <button
                                                type="button"
                                                onClick={() => pick(opt)}
                                                className={`w-full text-right rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${
                                                    value.link?.id === opt.id && value.link?.kind === opt.kind
                                                        ? 'bg-[#E6C673]/20 text-[#E6C673] border border-[#E6C673]/40'
                                                        : 'text-white/80 hover:bg-slate-800 border border-transparent'
                                                }`}
                                            >
                                                <div className="whitespace-normal break-words">{opt.label}</div>
                                                {opt.sublabel ? (
                                                    <div className="text-white/40 text-[9px] mt-0.5">{opt.sublabel}</div>
                                                ) : null}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </motion.div>
                ) : null}

                {mode === 'text' ? (
                    <motion.div key="text" {...linkPanelMotion} className="overflow-hidden">
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={value.contextNote ?? ''}
                            onChange={(e) => onChange({ contextNote: e.target.value.trim() || undefined })}
                            placeholder="مرجع نصي حر..."
                        />
                    </motion.div>
                ) : null}

                {(mode === 'timeline' || mode === 'request') && value.link ? (
                    <motion.div key="link-note" {...linkPanelMotion} className="overflow-hidden">
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#E6C673]/60"
                            value={value.contextNote ?? ''}
                            onChange={(e) =>
                                onChange({
                                    link: value.link,
                                    contextNote: e.target.value.trim() || undefined,
                                })
                            }
                            placeholder="ملاحظة إضافية بجانب الربط (اختياري)"
                        />
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
};
