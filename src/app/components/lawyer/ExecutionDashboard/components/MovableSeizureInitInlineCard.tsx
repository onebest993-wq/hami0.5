import React from 'react';
import type { SeizedMovable } from '@/app/types/execution';
import type { SaveSeizedMovableInitInput } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardFollowupSeizureInits';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import { SeizedMovableWorkflowPanel } from '@/app/components/lawyer/ExecutionDashboard/components/SeizedMovableWorkflowPanel';
import { requireDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';

export type MovableSeizureInitInlineCardProps = {
    decisionId: string;
    subject?: string;
    seizedMovable?: SeizedMovable | null;
    movables?: SeizedMovable[];
    movableInlineSaveCtx: MovableInlineSaveContext;
    saveSeizedMovableInitForDecision: (input: SaveSeizedMovableInitInput) => SeizedMovable | null | void;
    decisionsStorageExecutionId?: string;
    executionId?: string;
    executionDataId?: string;
    executionData?: Record<string, unknown> | null;
    decisions?: Array<Record<string, unknown>>;
    showToast?: (message: string, type?: 'success' | 'warning' | 'info') => void;
    decisionsReloadEpoch?: number;
    appealPerspective?: string;
};

export function MovableSeizureInitInlineCard({
    decisionId,
    subject,
    seizedMovable,
    movables,
    movableInlineSaveCtx,
    saveSeizedMovableInitForDecision,
    decisionsStorageExecutionId,
    executionId,
    executionDataId,
    executionData,
    decisions = [],
    showToast,
    decisionsReloadEpoch = 0,
    appealPerspective = 'creditor_agent',
}: MovableSeizureInitInlineCardProps) {
    const [desc, setDesc] = React.useState('');
    const [loc, setLoc] = React.useState('');
    const [custodian, setCustodian] = React.useState('');
    const [savedMovable, setSavedMovable] = React.useState<SeizedMovable | null>(seizedMovable ?? null);

    React.useEffect(() => {
        if (seizedMovable) setSavedMovable(seizedMovable);
    }, [seizedMovable]);

    React.useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ decisionId?: string; movable?: SeizedMovable }>;
            if (String(ce.detail?.decisionId || '').trim() !== String(decisionId || '').trim()) return;
            if (ce.detail?.movable) setSavedMovable(ce.detail.movable);
        };
        const inlineHandler = (e: Event) => {
            const ce = e as CustomEvent<{ movableId?: string; movable?: SeizedMovable }>;
            const row = ce.detail?.movable;
            if (!row) return;
            const rowDecision = String(row.decisionRowId || '').trim();
            if (rowDecision && rowDecision === String(decisionId || '').trim()) {
                setSavedMovable(row);
                return;
            }
            if (savedMovable && String(row.id || '').trim() === String(savedMovable.id || '').trim()) {
                setSavedMovable(row);
            }
        };
        window.addEventListener('hami-seized-movable-init-saved', handler as EventListener);
        window.addEventListener('hami-seized-movable-inline-updated', inlineHandler as EventListener);
        return () => {
            window.removeEventListener('hami-seized-movable-init-saved', handler as EventListener);
            window.removeEventListener('hami-seized-movable-inline-updated', inlineHandler as EventListener);
        };
    }, [decisionId, savedMovable]);

    const activeMovable = React.useMemo(() => {
        const list = Array.isArray(movables) ? movables : [];
        const saved = savedMovable;
        if (!saved) return null;
        const id = String(saved.id || '').trim();
        const fromList = list.find((row) => String(row.id || '').trim() === id);
        return fromList ? { ...fromList, ...saved } : saved;
    }, [movables, savedMovable]);

    if (activeMovable) {
        const list = Array.isArray(movables) ? movables : [];
        const merged =
            list.some((row) => String(row.id || '').trim() === String(activeMovable.id || '').trim())
                ? list
                : [activeMovable, ...list];
        const rawStatus = String(activeMovable.status || '');
        const status =
            rawStatus === 'estimated'
                ? 'valued'
                : rawStatus === 'auction_scheduled'
                  ? 'published'
                  : rawStatus;
        return (
            <SeizedMovableWorkflowPanel
                movable={activeMovable}
                workflowStatus={status}
                decisionsStorageExecutionId={requireDecisionsStorageExecutionId({
                    decisionsStorageExecutionId,
                    executionId,
                    executionDataId,
                    executionData,
                })}
                executionId={executionId}
                executionDataId={executionDataId}
                executionData={executionData}
                decisions={decisions}
                movables={merged}
                movableInlineSaveCtx={movableInlineSaveCtx}
                showToast={showToast ?? movableInlineSaveCtx.showToast}
                decisionsReloadEpoch={decisionsReloadEpoch}
                appealPerspective={appealPerspective}
            />
        );
    }

    return (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3" dir="rtl">
            <p className="text-[11px] font-black text-sky-100 text-right">إكمال بيانات الحجز المنقول</p>
            <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                placeholder="وصف المال المنقول"
            />
            <input
                type="text"
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                placeholder="مكان تواجد المال المنقول"
            />
            <input
                type="text"
                value={custodian}
                onChange={(e) => setCustodian(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                placeholder="اسم الحارس القضائي"
            />
            <button
                type="button"
                onClick={() => {
                    const result = saveSeizedMovableInitForDecision({
                        decisionId,
                        subject,
                        movableDescription: desc,
                        movableLocation: loc,
                        judicialCustodianName: custodian,
                    });
                    if (result) setSavedMovable(result);
                }}
                className="w-full rounded-xl bg-gradient-to-l from-sky-500 to-sky-700 py-2.5 text-[11px] font-black text-white disabled:opacity-40"
                disabled={
                    !String(desc || '').trim() ||
                    !String(loc || '').trim() ||
                    !String(custodian || '').trim()
                }
            >
                حفظ وبدء الإجراءات
            </button>
        </div>
    );
}
