import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { ChevronDown, PenLine } from '@/app/components/ui/lucideIcons';
import { AnimatePresence, motion } from 'motion/react';
import type { OtherPartyActionLogEntry } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildOtherPartyActionLogEntry,
    prependOtherPartyActionLog,
} from '@/app/application/execution/followup/otherPartyActionLogPersist';
import {
    resolveOtherPartyLogDecisionRow,
    resolveOtherPartyLogEntryOutcome,
} from '@/app/application/execution/followup/otherPartyActionLogOutcome';
import {
    DECISIONS_RELOAD_EVENT,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { ExecutorDecisionFollowupMirror } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    resolveSpecialFollowupStatusLabel,
    shouldShowSpecialFollowupExecutorStrip,
} from '@/app/components/lawyer/ExecutionDashboard/utils/dossierControlDecisions';

type Props = {
    entries: OtherPartyActionLogEntry[];
    onPersist: (next: OtherPartyActionLogEntry[]) => void;
    onSubmitToDecisions: (input: {
        date: string;
        content: string;
    }) => { ok: boolean; decisionId?: string; logEntryId?: string } | undefined | null;
    /** داخل لوحة موحّدة — بطاقة قابلة للطي */
    embedded?: boolean;
    /** وكيل المدين — لا قائمة مكررة؛ السجل في السجل الزمني فقط */
    hideSavedEntries?: boolean;
    executionId?: string;
    appealPerspective?: AppealUiPerspective;
};

/** يمنع انهيار «reading ok of undefined» عندما يكون المعالج stub أو لم يُحمَّل بعد */
function normalizeOtherPartySubmitResult(
    result: { ok: boolean; decisionId?: string; logEntryId?: string } | undefined | null,
): { ok: boolean; decisionId?: string; logEntryId?: string } {
    if (result && typeof result === 'object' && typeof result.ok === 'boolean') {
        return result;
    }
    return { ok: false };
}

function useMergedOtherPartyEntries(entries: OtherPartyActionLogEntry[]) {
    const [optimisticEntries, setOptimisticEntries] = useState<OtherPartyActionLogEntry[]>([]);

    useEffect(() => {
        setOptimisticEntries((prev) =>
            prev.filter((row) => !entries.some((saved) => saved.id === row.id)),
        );
    }, [entries]);

    const mergedEntries = useMemo(() => {
        const merged = new Map<string, OtherPartyActionLogEntry>();
        const decisionOwner = new Map<string, string>();

        for (const row of [...optimisticEntries, ...entries]) {
            const decisionId = String(row.decisionRowId || '').trim();
            if (decisionId) {
                const existingId = decisionOwner.get(decisionId);
                if (existingId && existingId !== row.id) {
                    merged.delete(existingId);
                }
                decisionOwner.set(decisionId, row.id);
            }
            merged.set(row.id, row);
        }

        return [...merged.values()];
    }, [entries, optimisticEntries]);

    return { mergedEntries, setOptimisticEntries };
}

function isPendingExecutorDecisionRow(row: Record<string, unknown> | null | undefined): boolean {
    if (!row) return false;
    const outcome = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending');
    return outcome === 'pending' || outcome === '';
}

/** البطاقة العلوية فقط للطلب قيد البت — المُعتمد/المرفوض يبقى في السجل السفلي */
function resolveActiveOtherPartyRequestCard(
    sorted: OtherPartyActionLogEntry[],
    decisions: Record<string, unknown>[],
    exId: string,
    appealPerspective: AppealUiPerspective,
): { entry: OtherPartyActionLogEntry; row: Record<string, unknown> } | null {
    if (!exId || sorted.length === 0) return null;

    for (const entry of sorted) {
        const row = resolveOtherPartyLogDecisionRow(entry, decisions);
        if (!row || !isPendingExecutorDecisionRow(row)) continue;
        if (
            !shouldShowSpecialFollowupExecutorStrip(row, {
                allDecisions: decisions,
                appealPerspective,
            })
        ) {
            continue;
        }
        return { entry, row };
    }

    const pending = sorted.find((e) => e.outcome === 'pending');
    if (!pending) return null;
    const row = resolveOtherPartyLogDecisionRow(pending, decisions);
    if (!row || !isPendingExecutorDecisionRow(row)) return null;
    if (
        !shouldShowSpecialFollowupExecutorStrip(row, {
            allDecisions: decisions,
            appealPerspective,
        })
    ) {
        return null;
    }
    return { entry: pending, row };
}

/** يمنع تكرار نفس السجل في البطاقة والقائمة — فقط للطلب النشط قيد البت */
function excludeActiveCardFromSavedList(
    sorted: OtherPartyActionLogEntry[],
    activeCard: { entry: OtherPartyActionLogEntry } | null | undefined,
): OtherPartyActionLogEntry[] {
    const activeId = String(activeCard?.entry.id || '').trim();
    if (!activeId) return sorted;
    return sorted.filter((row) => row.id !== activeId);
}

function commitOtherPartySaveResult(args: {
    submitRes: { ok: boolean; decisionId?: string; logEntryId?: string };
    date: string;
    content: string;
    entries: OtherPartyActionLogEntry[];
    hideSavedEntries: boolean;
    onPersist: (next: OtherPartyActionLogEntry[]) => void;
    setOptimisticEntries: Dispatch<SetStateAction<OtherPartyActionLogEntry[]>>;
}): void {
    const { submitRes, date, content, entries, hideSavedEntries, onPersist, setOptimisticEntries } =
        args;
    const row = buildOtherPartyActionLogEntry({
        id: submitRes.logEntryId,
        date,
        content,
        decisionRowId: submitRes.decisionId,
    });

    if (!hideSavedEntries) {
        const handlerAlreadyPersisted = Boolean(submitRes.logEntryId);
        if (!handlerAlreadyPersisted) {
            onPersist(prependOtherPartyActionLog(entries, row));
        }
    }

    if (submitRes.decisionId || submitRes.logEntryId) {
        setOptimisticEntries((prev) => [row, ...prev.filter((item) => item.id !== row.id)]);
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(DECISIONS_RELOAD_EVENT));
    }
}

function resolveSavedEntryOutcome(
    entry: OtherPartyActionLogEntry,
    decisions: Record<string, unknown>[],
): OtherPartyActionLogEntry['outcome'] {
    return resolveOtherPartyLogEntryOutcome(entry, decisions);
}

function OtherPartyLatestRequestCard(props: {
    entry: OtherPartyActionLogEntry;
    decisionRow: Record<string, unknown> | null;
    executionId: string;
    appealPerspective: AppealUiPerspective;
    decisions: Record<string, unknown>[];
}) {
    const { entry, decisionRow, executionId, appealPerspective, decisions } = props;
    const [expanded, setExpanded] = useState(false);
    const executorStripVisible = Boolean(
        decisionRow &&
            shouldShowSpecialFollowupExecutorStrip(decisionRow, {
                allDecisions: decisions,
                appealPerspective,
            })
    );
    const statusLabel = decisionRow
        ? resolveSpecialFollowupStatusLabel(decisionRow, appealPerspective)
        : entry.outcome === 'pending'
          ? 'قرار المنفذ — قيد البت'
          : entry.outcome === 'approved'
            ? 'موافق'
            : entry.outcome === 'rejected'
              ? 'مرفوض'
              : 'آخر تحرك — اضغط للتفاصيل';

    return (
        <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-950/15 text-right">
            <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full flex-row-reverse items-center justify-between gap-2 px-4 py-3 text-right transition-colors hover:bg-white/[0.03]"
            >
                <span className="min-w-0 flex-1 text-right">
                    <p className="truncate text-[12px] font-bold text-amber-100">
                        تحرك الطرف الآخر — {entry.date}
                    </p>
                    <p className="text-[10px] text-amber-200/70">{statusLabel}</p>
                </span>
                {!executorStripVisible ? (
                    <ChevronDown
                        size={18}
                        className={`shrink-0 text-amber-300/70 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        aria-hidden
                    />
                ) : null}
            </button>
            {executorStripVisible && decisionRow ? (
                <div className="border-t border-white/10 px-3 pb-2 pt-2">
                    <ExecutorDecisionFollowupMirror
                        executionId={executionId}
                        row={decisionRow}
                        requestKind="special_followup"
                        appealPerspective={appealPerspective}
                    />
                </div>
            ) : null}
            {expanded ? (
                <div className="border-t border-white/10 px-3 pb-3 pt-2">
                    <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-slate-300">
                        {entry.content}
                    </p>
                </div>
            ) : null}
        </div>
    );
}


function SavedEntriesList({
    sorted,
    activeCardEntryId,
    decisions = [],
}: {
    sorted: OtherPartyActionLogEntry[];
    activeCardEntryId?: string | null;
    decisions?: Record<string, unknown>[];
}) {
    const filtered = excludeActiveCardFromSavedList(
        sorted,
        activeCardEntryId ? { entry: { id: activeCardEntryId } as OtherPartyActionLogEntry } : null,
    );
    if (filtered.length === 0) {
        return (
            <p className="rounded-lg border border-dashed border-white/10 py-4 text-center text-[10px] text-slate-500">
                لا سجلات يدوية بعد.
            </p>
        );
    }

    return (
        <ul className="max-h-[min(36vh,240px)] space-y-2 overflow-y-auto pr-1">
            {filtered.map((row) => {
                const outcome = resolveSavedEntryOutcome(row, decisions);
                return (
                <li
                    key={row.id}
                    className={`rounded-xl border p-3 text-right border-r-4 ${
                        outcome === 'approved'
                            ? 'border-emerald-400/40 border-r-emerald-400 bg-emerald-950/35 shadow-[0_0_24px_-8px_rgba(52,211,153,0.45)]'
                            : outcome === 'rejected'
                              ? 'border-white/10 border-r-red-500 bg-black/25'
                              : 'border-white/10 border-r-amber-500 bg-black/25'
                    }`}
                >
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-amber-200/90">{row.date}</span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${
                                outcome === 'approved'
                                    ? 'bg-emerald-500/25 text-emerald-100'
                                    : outcome === 'rejected'
                                      ? 'bg-red-500/25 text-red-100'
                                      : 'bg-amber-500/20 text-amber-100'
                            }`}
                        >
                            {outcome === 'approved'
                                ? 'موافقة'
                                : outcome === 'rejected'
                                  ? 'رفض'
                                  : 'قيد النظر'}
                        </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-50/95">{row.content}</p>
                </li>
            );
            })}
        </ul>
    );
}

function useFollowupDecisions(executionId: string | undefined) {
    const exId = String(executionId || '').trim();
    const [decisions, setDecisions] = useState<Record<string, unknown>[]>(() =>
        readExecutorDecisionsArray(exId)
    );
    useEffect(() => {
        const sync = () => setDecisions(readExecutorDecisionsArray(exId));
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [exId]);
    return decisions;
}

export function ManualOtherPartyLogBlock({
    entries,
    onPersist,
    onSubmitToDecisions,
    hideSavedEntries = false,
    executionId,
    appealPerspective = 'creditor_agent',
}: Omit<Props, 'embedded'>) {
    const [expanded, setExpanded] = useState(false);
    const [date, setDate] = useState(() => getLocalTodayYmd());
    const [content, setContent] = useState('');
    const exId = String(executionId || '').trim();
    const decisions = useFollowupDecisions(exId);
    const { mergedEntries, setOptimisticEntries } = useMergedOtherPartyEntries(entries);

    const sorted = useMemo(() => {
        return [...mergedEntries].sort(
            (a, b) =>
                String(b.date).localeCompare(String(a.date)) ||
                String(b.savedAt || '').localeCompare(String(a.savedAt || ''))
        );
        }, [mergedEntries]);

    const activePendingCard = useMemo(
        () => resolveActiveOtherPartyRequestCard(sorted, decisions, exId, appealPerspective),
        [appealPerspective, decisions, exId, sorted],
    );

    const handleSave = useCallback(() => {
        const trimmed = content.trim();
        if (!trimmed) return;
        const submitRes = normalizeOtherPartySubmitResult(
            onSubmitToDecisions({
                date: date || getLocalTodayYmd(),
                content: trimmed,
            }),
        );
        if (!submitRes.ok) return;
        commitOtherPartySaveResult({
            submitRes,
            date: date || getLocalTodayYmd(),
            content: trimmed,
            entries,
            hideSavedEntries,
            onPersist,
            setOptimisticEntries,
        });
        setContent('');
        setExpanded(true);
    }, [content, date, entries, hideSavedEntries, onPersist, onSubmitToDecisions, setOptimisticEntries]);

    return (
        <div className="space-y-3">
            {activePendingCard ? (
                <OtherPartyLatestRequestCard
                    entry={activePendingCard.entry}
                    decisionRow={activePendingCard.row}
                    executionId={exId}
                    appealPerspective={appealPerspective}
                    decisions={decisions}
                />
            ) : null}
            <div className="overflow-hidden rounded-2xl border border-[#E6C673]/25 bg-gradient-to-l from-[#E6C673]/8 via-transparent to-transparent shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="flex w-full flex-row-reverse items-center gap-3 px-3 py-2.5 text-right transition-colors hover:bg-[#E6C673]/[0.06]"
                >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673]">
                        <PenLine size={17} />
                    </span>
                    <div className="min-w-0 flex-1 text-right">
                        <p className="text-[12px] font-bold text-[#F5E6A8]">إدخال يدوي</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                            {expanded
                                ? 'إخفاء النموذج'
                                : 'تحرّك أو طلب من الدائن غير مدرج أعلاه'}
                        </p>
                    </div>
                    {!hideSavedEntries && sorted.length > 0 ? (
                        <span className="shrink-0 rounded-full border border-[#E6C673]/30 bg-[#E6C673]/15 px-2.5 py-0.5 text-[9px] font-bold text-[#E6C673]">
                            {sorted.length} سجل
                        </span>
                    ) : null}
                    <motion.span
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400"
                    >
                        <ChevronDown size={14} />
                    </motion.span>
                </button>

                <AnimatePresence initial={false}>
                    {expanded ? (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-3 border-t border-[#E6C673]/15 bg-black/25 px-3 py-2.5">
                                <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                                    <div>
                                        <label className="mb-1 block text-xs text-amber-200/80">
                                            تاريخ التحرك / الطلب
                                        </label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full rounded-lg border border-white/14 bg-black/30 px-3 py-2 text-sm text-amber-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs text-amber-200/80">
                                            مضمون الطلب / التحرك
                                        </label>
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            rows={3}
                                            placeholder="صف طلب الدائن أو تحرّكه…"
                                            className="min-h-[72px] w-full resize-y rounded-lg border border-white/14 bg-black/30 px-3 py-2 text-sm text-amber-50"
                                        />
                                    </div>
                                    <div className="flex justify-end pt-1">
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={!content.trim()}
                                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-100 disabled:pointer-events-none disabled:opacity-40 hover:bg-emerald-500/25"
                                        >
                                            حفظ السجل
                                        </button>
                                    </div>
                                </div>
                                {!hideSavedEntries ? (
                                    <SavedEntriesList
                                        sorted={sorted}
                                        activeCardEntryId={activePendingCard?.entry.id}
                                        decisions={decisions}
                                    />
                                ) : null}
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </div>
    );
}

export function OtherPartyActionsLog({
    entries,
    onPersist,
    onSubmitToDecisions,
    embedded = false,
    hideSavedEntries = false,
    executionId,
    appealPerspective = 'creditor_agent',
}: Props) {
    if (embedded) {
        return (
            <ManualOtherPartyLogBlock
                entries={entries}
                onPersist={onPersist}
                onSubmitToDecisions={onSubmitToDecisions}
                hideSavedEntries={hideSavedEntries}
                executionId={executionId}
                appealPerspective={appealPerspective}
            />
        );
    }

    const [date, setDate] = useState(() => getLocalTodayYmd());
    const [content, setContent] = useState('');
    const exId = String(executionId || '').trim();
    const decisions = useFollowupDecisions(exId);
    const { mergedEntries, setOptimisticEntries } = useMergedOtherPartyEntries(entries);

    const sorted = useMemo(() => {
        return [...mergedEntries].sort(
            (a, b) =>
                String(b.date).localeCompare(String(a.date)) ||
                String(b.savedAt || '').localeCompare(String(a.savedAt || ''))
        );
        }, [mergedEntries]);

    const activePendingCard = useMemo(
        () => resolveActiveOtherPartyRequestCard(sorted, decisions, exId, appealPerspective),
        [appealPerspective, decisions, exId, sorted],
    );

    const handleSave = useCallback(() => {
        const trimmed = content.trim();
        if (!trimmed) return;
        const submitRes = normalizeOtherPartySubmitResult(
            onSubmitToDecisions({
                date: date || getLocalTodayYmd(),
                content: trimmed,
            }),
        );
        if (!submitRes.ok) return;
        commitOtherPartySaveResult({
            submitRes,
            date: date || getLocalTodayYmd(),
            content: trimmed,
            entries,
            hideSavedEntries: false,
            onPersist,
            setOptimisticEntries,
        });
        setContent('');
    }, [content, date, entries, onPersist, onSubmitToDecisions, setOptimisticEntries]);

    return (
        <div className="space-y-4 text-right" dir="rtl">
            {activePendingCard ? (
                <OtherPartyLatestRequestCard
                    entry={activePendingCard.entry}
                    decisionRow={activePendingCard.row}
                    executionId={exId}
                    appealPerspective={appealPerspective}
                    decisions={decisions}
                />
            ) : null}
            <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div>
                    <label className="mb-1 block text-xs text-amber-200/80">تاريخ التحرك / الطلب</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-lg border border-white/14 bg-black/30 px-3 py-2 text-sm text-amber-50"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs text-amber-200/80">مضمون الطلب / التحرك</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={3}
                        placeholder="…"
                        className="min-h-[72px] w-full resize-y rounded-lg border border-white/14 bg-black/30 px-3 py-2 text-sm text-amber-50"
                    />
                </div>
                <div className="flex justify-end pt-1">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!content.trim()}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-100 disabled:pointer-events-none disabled:opacity-40 hover:bg-emerald-500/25"
                    >
                        حفظ السجل
                    </button>
                </div>
            </div>

            {!hideSavedEntries ? (
                <div className="space-y-2">
                    <div className="text-xs text-amber-200/70">السجلات المحفوظة ({sorted.length})</div>
                    <SavedEntriesList
                        sorted={sorted}
                        activeCardEntryId={activePendingCard?.entry.id}
                        decisions={decisions}
                    />
                </div>
            ) : null}
        </div>
    );
}
