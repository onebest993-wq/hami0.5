import React from 'react';
import { ExecutionInlineAccordionStepRow } from './ExecutionInlineAccordionStepRow';

export { ExecutionInlineExecutorDecisionActions } from '@/app/components/shared/ExecutionInlineExecutorDecisionActions';

export type ExecutionInlineStepTone = 'neutral' | 'success' | 'danger';

export type ExecutionInlineStepStatus = 'done' | 'active' | 'locked';

export type ExecutionInlineStep = {
    id: string;
    title: string;
    subtitle?: string;
    status: ExecutionInlineStepStatus;
    tone?: ExecutionInlineStepTone;
    content?: React.ReactNode;
    showBack?: boolean;
    onBack?: () => void;
    backLabel?: string;
};

export function ExecutionInlineAccordion(props: {
    steps: ExecutionInlineStep[];
    className?: string;
    stepNavRequest?: { targetStepId: string; collapseStepId?: string; seq: number } | null;
}) {
    const steps = Array.isArray(props.steps) ? props.steps : [];
    const firstActiveIdx = steps.findIndex((s) => s.status === 'active');
    const activeIdx = firstActiveIdx >= 0 ? firstActiveIdx : -1;
    const visible = activeIdx >= 0 ? steps.slice(0, activeIdx + 1) : steps;
    const activeId = activeIdx >= 0 ? steps[activeIdx]?.id : null;
    const [openById, setOpenById] = React.useState<Record<string, boolean>>({});
    const stepRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

    React.useEffect(() => {
        if (!activeId) {
            setOpenById({});
            return;
        }
        setOpenById((prev) => ({ ...prev, [activeId]: true }));
    }, [activeId]);

    React.useEffect(() => {
        const targetStepId = String(props.stepNavRequest?.targetStepId || '').trim();
        if (!targetStepId || !props.stepNavRequest?.seq) return;
        const collapseStepId = String(props.stepNavRequest.collapseStepId || '').trim();
        setOpenById((prev) => {
            const next = { ...prev, [targetStepId]: true };
            if (collapseStepId) next[collapseStepId] = false;
            return next;
        });
        queueMicrotask(() => {
            const el = stepRefs.current[targetStepId];
            if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }, [
        props.stepNavRequest?.seq,
        props.stepNavRequest?.targetStepId,
        props.stepNavRequest?.collapseStepId,
    ]);

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
                    {visible.map((s, idx) => (
                        <ExecutionInlineAccordionStepRow
                            key={s.id}
                            s={s}
                            idx={idx}
                            lastIdx={visible.length - 1}
                            activeId={activeId}
                            openById={openById}
                            setOpenById={setOpenById}
                            stepRefs={stepRefs}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
