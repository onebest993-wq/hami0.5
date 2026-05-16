import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, ChevronDown, XCircle } from 'lucide-react';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';

export type ExecutionInlineStepTone = 'neutral' | 'success' | 'danger';

export type ExecutionInlineStepStatus = 'done' | 'active' | 'locked';

export type ExecutionInlineStep = {
    id: string;
    title: string;
    subtitle?: string;
    status: ExecutionInlineStepStatus;
    tone?: ExecutionInlineStepTone;
    content?: React.ReactNode;
};

export function ExecutionInlineAccordion(props: {
    steps: ExecutionInlineStep[];
    className?: string;
}) {
    const steps = Array.isArray(props.steps) ? props.steps : [];
    const firstActiveIdx = steps.findIndex((s) => s.status === 'active');
    const activeIdx = firstActiveIdx >= 0 ? firstActiveIdx : -1;
    const visible = activeIdx >= 0 ? steps.slice(0, activeIdx + 1) : steps;
    const activeId = activeIdx >= 0 ? steps[activeIdx]?.id : null;
    const [openById, setOpenById] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        if (!activeId) {
            setOpenById({});
            return;
        }
        setOpenById((prev) => (activeId in prev ? prev : { ...prev, [activeId]: true }));
    }, [activeId]);

    React.useEffect(() => {
        const allowed = new Set(visible.map((s) => s.id));
        setOpenById((prev) => {
            let changed = false;
            const next: Record<string, boolean> = {};
            for (const [k, v] of Object.entries(prev)) {
                if (!allowed.has(k)) {
                    changed = true;
                    continue;
                }
                next[k] = v;
            }
            return changed ? next : prev;
        });
    }, [visible]);

    return (
        <div className={props.className || ''} dir="rtl">
            <div className="relative">
                <div className="absolute right-[11px] top-2 bottom-2 w-px bg-white/10" aria-hidden />
                <div className="space-y-2">
                    {visible.map((s, idx) => {
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
                            return <ChevronDown size={14} className="text-current" />;
                        })();
                        const hasContent = Boolean(s.content);
                        const open = hasContent ? (openById[s.id] ?? isActive) : false;

                        return (
                            <div key={s.id} className="relative pr-8">
                                <div
                                    className={`absolute right-0 top-1.5 grid size-6 place-items-center rounded-full border ${nodeCls}`}
                                    aria-hidden
                                >
                                    {icon}
                                </div>

                                {isActive ? (
                                    <div
                                        className={`rounded-2xl border p-3 ${
                                            tone === 'danger'
                                                ? 'border-rose-500/35 bg-rose-950/25'
                                                : 'border-amber-500/25 bg-[#05060D]/55'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p
                                                className={`min-w-0 flex-1 text-[11px] font-black text-right ${
                                                    tone === 'danger' ? 'text-rose-200' : 'text-slate-100'
                                                }`}
                                            >
                                                {s.title}
                                            </p>
                                            {hasContent ? (
                                                <button
                                                    type="button"
                                                    aria-label={open ? 'طي المحتوى' : 'توسيع المحتوى'}
                                                    aria-expanded={open}
                                                    onClick={() =>
                                                        setOpenById((prev) => ({
                                                            ...prev,
                                                            [s.id]: !(prev[s.id] ?? true),
                                                        }))
                                                    }
                                                    className="shrink-0 rounded-md p-0.5 text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
                                                >
                                                    <ChevronDown
                                                        size={14}
                                                        className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
                                                    />
                                                </button>
                                            ) : null}
                                        </div>
                                        {s.subtitle ? (
                                            <p className="mt-1 text-[10px] text-slate-400 text-right">
                                                {s.subtitle}
                                            </p>
                                        ) : null}
                                        <AnimatePresence initial={false}>
                                            {s.content && open ? (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.22 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-3 border-t border-white/10 pt-3">
                                                        {s.content}
                                                    </div>
                                                </motion.div>
                                            ) : null}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    hasContent ? (
                                        <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1 text-right">
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
                                                        <p className="mt-1 text-[10px] text-slate-500">
                                                            {s.subtitle}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <button
                                                    type="button"
                                                    aria-label={open ? 'طي المحتوى' : 'توسيع المحتوى'}
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
                                            <AnimatePresence initial={false}>
                                                {open ? (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.22 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="mt-3 border-t border-white/10 pt-3">
                                                            {s.content}
                                                        </div>
                                                    </motion.div>
                                                ) : null}
                                            </AnimatePresence>
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
                                                <p className="text-[10px] text-slate-500 text-right">
                                                    {s.subtitle}
                                                </p>
                                            ) : null}
                                        </div>
                                    )
                                )}

                                {idx === visible.length - 1 ? null : (
                                    <div className="h-2" aria-hidden />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export function ExecutionInlineExecutorDecisionActions(props: {
    executionId: string | undefined;
    decisionId: string;
    requestKind?: string;
    personalCoerciveSubtype?: string;
    disabled?: boolean;
    onOpenAppealCenter?: () => void;
}) {
    const disabled = Boolean(props.disabled) || !props.executionId || !props.decisionId;
    const [busy, setBusy] = React.useState(false);

    const resolve = React.useCallback(
        (outcome: 'approved' | 'rejected') => {
            if (disabled || busy) return;
            const executionId = String(props.executionId || '').trim();
            const decisionId = String(props.decisionId || '').trim();
            if (!executionId || !decisionId) return;
            const nowIso = new Date().toISOString();
            setBusy(true);
            try {
                patchExecutorDecisionRow(executionId, decisionId, {
                    executorOutcome: outcome,
                    status: outcome === 'rejected' ? 'rejected' : 'accepted',
                    appealStatus: 'pending',
                    appealPhase: null,
                    appealBaseBranch: outcome === 'rejected' ? 'after_rejection' : 'after_approval',
                    resolvedAt: nowIso,
                } as any);
            } catch {
                setBusy(false);
                return;
            }
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-execution-decision-outcome', {
                        detail: {
                            executionId,
                            requestKind: props.requestKind,
                            outcome,
                            decisionId,
                            personalCoerciveSubtype: props.personalCoerciveSubtype,
                        },
                    })
                );
            } catch {
                /* ignore */
            }
            setBusy(false);
        },
        [busy, disabled, props.decisionId, props.executionId, props.requestKind]
    );

    return (
        disabled && props.onOpenAppealCenter ? (
            <button
                type="button"
                onClick={props.onOpenAppealCenter}
                className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15"
            >
                تقديم طعن (الذهاب لمركز القرارات)
            </button>
        ) : (
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    disabled={disabled || busy}
                    onClick={() => resolve('rejected')}
                    className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-[11px] font-extrabold text-rose-200 hover:bg-rose-500/15 disabled:opacity-40"
                >
                    رفض
                </button>
                <button
                    type="button"
                    disabled={disabled || busy}
                    onClick={() => resolve('approved')}
                    className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-40"
                >
                    موافقة
                </button>
            </div>
        )
    );
}
