import React from 'react';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { XCircle } from '@/app/components/ui/icons/XCircle';
import { FollowupFlowBackButton } from './FollowupFlowBackButton';
import type { ExecutionInlineStep, ExecutionInlineStepTone } from './ExecutionInlineAccordion';

function stepContentProvided(content: React.ReactNode | undefined): boolean {
    return content != null && content !== false;
}

function ExpandableStepContent({ children, open }: { children: React.ReactNode; open: boolean }) {
    if (!open) return null;
    return (
        <div className="relative z-[1] mt-3 border-t border-white/10 pt-3 pointer-events-auto">
            {children}
        </div>
    );
}

export function ExecutionInlineAccordionStepRow({
    s,
    idx,
    lastIdx,
    activeId,
    openById,
    setOpenById,
    stepRefs,
}: {
    s: ExecutionInlineStep;
    idx: number;
    lastIdx: number;
    activeId: string | null;
    openById: Record<string, boolean>;
    setOpenById: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    stepRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
    const isActive = s.id === activeId && s.status === 'active';
    const isDone = s.status === 'done';
    const tone: ExecutionInlineStepTone =
        s.tone || (isDone ? 'success' : isActive ? 'neutral' : 'neutral');
    const nodeCls =
        tone === 'danger'
            ? 'bg-rose-500/25 border-rose-500/35 text-rose-200'
            : tone === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/35 text-emerald-200'
              : isActive
                ? 'bg-amber-500/15 border-amber-500/35 text-amber-200'
                : 'bg-slate-500/10 border-white/10 text-slate-300';
    const icon = (() => {
        if (tone === 'danger') return <XCircle size={14} className="text-current" />;
        if (isDone) return <CheckCircle size={14} className="text-current" />;
        if (isActive) {
            return <span className="block size-2 rounded-full bg-current opacity-90" aria-hidden />;
        }
        return <ChevronDown size={14} className="text-current" />;
    })();
    const hasContent = stepContentProvided(s.content);
    const open = hasContent ? (isActive ? openById[s.id] !== false : Boolean(openById[s.id])) : false;

    return (
        <div
            ref={(el) => {
                stepRefs.current[s.id] = el;
            }}
            className="relative pr-8"
        >
            <div
                className={`absolute right-0 top-1.5 grid size-6 place-items-center rounded-full border ${nodeCls}`}
                aria-hidden
            >
                {icon}
            </div>

            {isActive ? (
                <div
                    className={`relative rounded-2xl border p-3 ${
                        tone === 'danger'
                            ? 'border-rose-500/35 bg-rose-950/25'
                            : 'border-amber-500/25 bg-[#05060D]/55'
                    }`}
                >
                    <div className="flex flex-row items-start gap-2">
                        {s.showBack && s.onBack ? (
                            <FollowupFlowBackButton
                                onClick={s.onBack}
                                label={s.backLabel || 'رجوع'}
                                variant="inline"
                            />
                        ) : null}
                        <button
                            type="button"
                            aria-label={open ? 'طي المحتوى' : 'عرض المحتوى'}
                            aria-expanded={open}
                            onClick={() =>
                                setOpenById((prev) => ({
                                    ...prev,
                                    [s.id]: open ? false : true,
                                }))
                            }
                            className="min-w-0 flex-1 rounded-lg text-right transition hover:bg-white/[0.03]"
                        >
                            <p
                                className={`text-[11px] font-black leading-snug ${
                                    tone === 'danger' ? 'text-rose-200' : 'text-slate-100'
                                }`}
                            >
                                {s.title}
                            </p>
                            {s.subtitle ? (
                                <p className="mt-1 text-[10px] text-slate-400">{s.subtitle}</p>
                            ) : null}
                        </button>
                    </div>
                    {hasContent && open ? (
                        <ExpandableStepContent open={open}>{s.content}</ExpandableStepContent>
                    ) : null}
                </div>
            ) : hasContent ? (
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                    <div className="flex items-start justify-between gap-2">
                        <button
                            type="button"
                            aria-label={open ? 'طي التفاصيل' : 'عرض التفاصيل'}
                            aria-expanded={open}
                            onClick={() =>
                                setOpenById((prev) => ({
                                    ...prev,
                                    [s.id]: !(prev[s.id] ?? false),
                                }))
                            }
                            className="min-w-0 flex-1 cursor-pointer rounded-lg text-right transition hover:bg-white/[0.03]"
                        >
                            <p
                                className={`text-[11px] font-bold leading-tight ${
                                    tone === 'danger'
                                        ? 'text-rose-200'
                                        : tone === 'success'
                                          ? 'text-emerald-200'
                                          : 'text-slate-200'
                                }`}
                            >
                                {s.title}
                            </p>
                            {s.subtitle ? (
                                <p className="mt-1 text-[10px] text-slate-500">{s.subtitle}</p>
                            ) : null}
                        </button>
                        <button
                            type="button"
                            aria-label={open ? 'طي التفاصيل' : 'عرض التفاصيل'}
                            aria-expanded={open}
                            onClick={() =>
                                setOpenById((prev) => ({
                                    ...prev,
                                    [s.id]: !(prev[s.id] ?? false),
                                }))
                            }
                            className="shrink-0 rounded-md p-0.5 text-gray-500 transition hover:bg-white/5 hover:text-gray-300"
                        >
                            <ChevronDown
                                size={14}
                                className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
                            />
                        </button>
                    </div>
                    {hasContent && open ? (
                        <ExpandableStepContent open={open}>{s.content}</ExpandableStepContent>
                    ) : null}
                </div>
            ) : (
                <div className="flex flex-col gap-0.5">
                    <p
                        className={`text-[11px] font-bold text-right ${
                            tone === 'danger'
                                ? 'text-rose-200'
                                : tone === 'success'
                                  ? 'text-emerald-200'
                                  : 'text-slate-200'
                        }`}
                    >
                        {s.title}
                    </p>
                    {s.subtitle ? (
                        <p className="text-[10px] text-slate-500 text-right">{s.subtitle}</p>
                    ) : null}
                </div>
            )}

            {idx === lastIdx ? null : <div className="h-2" aria-hidden />}
        </div>
    );
}
