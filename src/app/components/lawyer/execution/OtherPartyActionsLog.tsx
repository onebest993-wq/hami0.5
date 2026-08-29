import { useCallback, useMemo, useState } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { PenLine } from '@/app/components/ui/icons/PenLine';
import { AnimatePresence, motion } from '@/app/motion/overlayMotionRuntime';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    commitOtherPartySaveResult,
    normalizeOtherPartySubmitResult,
    resolveActiveOtherPartyRequestCard,
    useFollowupDecisions,
    useMergedOtherPartyEntries,
    type OtherPartyActionsLogProps,
} from './otherPartyActionsLog/otherPartyActionsLogModel';
import {
    OtherPartyLatestRequestCard,
    SavedEntriesList,
} from './otherPartyActionsLog/otherPartyActionsLogViews';

type Props = OtherPartyActionsLogProps;

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

/**
 * موزّع بلا خطافات بين الشكلين.
 *
 * كان `embedded` يُنهي المكوّن مبكراً فوق سبعة خطافات — خرقٌ لقواعد الخطافات
 * يُسقط React عند أي تبديل للوضع. الفصل إلى مكوّنين هو العلاج الصحيح لا نقل
 * الخروج تحت الخطافات: الشكل المضمَّن لا يحتاج قراءة القرارات ولا الفرز أصلاً.
 */
export function OtherPartyActionsLog(props: Props) {
    if (props.embedded) {
        return (
            <ManualOtherPartyLogBlock
                entries={props.entries}
                onPersist={props.onPersist}
                onSubmitToDecisions={props.onSubmitToDecisions}
                hideSavedEntries={props.hideSavedEntries ?? false}
                executionId={props.executionId}
                appealPerspective={props.appealPerspective ?? 'creditor_agent'}
            />
        );
    }
    return <StandaloneOtherPartyActionsLog {...props} />;
}

function StandaloneOtherPartyActionsLog({
    entries,
    onPersist,
    onSubmitToDecisions,
    hideSavedEntries = false,
    executionId,
    appealPerspective = 'creditor_agent',
}: Props) {
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
