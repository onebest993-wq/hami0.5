/**
 * أزرار موافقة/رفض قرار المنفّذ — سطح مشترك (تنفيذ + FOC) بلا عكس اعتماد الشرائح.
 */
import React from 'react';
import { syncExecutorDecisionResolution } from '@/app/utils/syncExecutorDecisionResolution';
import { resolveExecutorDecisionRowContext } from '@/app/utils/executorSeizureDecisionQueue';

export function ExecutionInlineExecutorDecisionActions(props: {
    executionId: string | undefined;
    decisionId: string;
    /** صف القرار الحاكم — يضمن بتّ المنفذ حتى مع اختلاف مفتاح التخزين */
    decisionRow?: Record<string, unknown> | null;
    requestKind?: string;
    personalCoerciveSubtype?: string;
    disabled?: boolean;
    onOpenAppealCenter?: () => void;
    onResolved?: (result: {
        ok: boolean;
        outcome?: 'approved' | 'rejected';
        personalCoerciveSubtype?: string;
        storageExecutionId?: string;
    }) => void;
    /** داخل محضر المتابعة — لا إشعار اختصار للقرارات */
    suppressNavigatorToast?: boolean;
}) {
    const disabled = Boolean(props.disabled) || !props.executionId || !props.decisionId;
    const [busy, setBusy] = React.useState(false);

    const resolve = React.useCallback(
        (outcome: 'approved' | 'rejected') => {
            if (disabled || busy) return;
            const executionId = String(props.executionId || '').trim();
            const decisionId = String(props.decisionId || '').trim();
            if (!executionId || !decisionId) return;
            setBusy(true);
            let syncResult: {
                ok: boolean;
                outcome?: 'approved' | 'rejected';
                personalCoerciveSubtype?: string;
                storageExecutionId?: string;
            } = { ok: false, outcome };
            try {
                const rowCtx = resolveExecutorDecisionRowContext(executionId, decisionId);
                const storageExecutionId = String(
                    rowCtx?.storageExecutionId || executionId
                ).trim();
                const result = syncExecutorDecisionResolution({
                    executionId: storageExecutionId || executionId,
                    decisionId,
                    resolution: outcome,
                    row: props.decisionRow ?? rowCtx?.row ?? undefined,
                    suppressNavigatorToast: props.suppressNavigatorToast,
                });
                syncResult = {
                    ok: result.ok,
                    outcome,
                    personalCoerciveSubtype:
                        result.personalCoerciveSubtype ||
                        String(props.personalCoerciveSubtype || '').trim() ||
                        undefined,
                    storageExecutionId: result.storageExecutionId,
                };
            } catch {
                syncResult = { ok: false, outcome };
            }
            props.onResolved?.(syncResult);
            queueMicrotask(() => setBusy(false));
        },
        [
            busy,
            disabled,
            props.decisionId,
            props.decisionRow,
            props.executionId,
            props.onResolved,
            props.suppressNavigatorToast,
        ]
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
                    onClick={(e) => {
                        e.stopPropagation();
                        resolve('rejected');
                    }}
                    className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-[11px] font-extrabold text-rose-200 hover:bg-rose-500/15 disabled:opacity-40"
                >
                    رفض
                </button>
                <button
                    type="button"
                    disabled={disabled || busy}
                    onClick={(e) => {
                        e.stopPropagation();
                        resolve('approved');
                    }}
                    className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-40"
                >
                    موافقة
                </button>
            </div>
        )
    );
}
