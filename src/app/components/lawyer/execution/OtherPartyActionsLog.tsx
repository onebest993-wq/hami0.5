import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, PenLine } from 'lucide-react';
import type { OtherPartyActionLogEntry } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

type Props = {
    entries: OtherPartyActionLogEntry[];
    onPersist: (next: OtherPartyActionLogEntry[]) => void;
    onSubmitToDecisions: (input: { date: string; content: string }) => { ok: boolean; decisionId?: string };
    /** داخل لوحة موحّدة — بطاقة قابلة للطي */
    embedded?: boolean;
    /** وكيل المدين — لا قائمة مكررة؛ السجل في السجل الزمني فقط */
    hideSavedEntries?: boolean;
};

function SavedEntriesList({ sorted }: { sorted: OtherPartyActionLogEntry[] }) {
    if (sorted.length === 0) {
        return (
            <p className="rounded-lg border border-dashed border-white/10 py-4 text-center text-[10px] text-slate-500">
                لا سجلات يدوية بعد.
            </p>
        );
    }

    return (
        <ul className="max-h-[min(36vh,240px)] space-y-2 overflow-y-auto pr-1">
            {sorted.map((row) => (
                            <li
                                key={row.id}
                                className={`rounded-xl border p-3 text-right border-r-4 ${
                                    row.outcome === 'approved'
                                        ? 'border-emerald-400/40 border-r-emerald-400 bg-emerald-950/35 shadow-[0_0_24px_-8px_rgba(52,211,153,0.45)]'
                                        : row.outcome === 'rejected'
                                          ? 'border-white/10 border-r-red-500 bg-black/25'
                                          : 'border-white/10 border-r-amber-500 bg-black/25'
                                }`}
                            >
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-amber-200/90">{row.date}</span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${
                                row.outcome === 'approved'
                                    ? 'bg-emerald-500/25 text-emerald-100'
                                    : row.outcome === 'rejected'
                                      ? 'bg-red-500/25 text-red-100'
                                      : 'bg-amber-500/20 text-amber-100'
                            }`}
                        >
                            {row.outcome === 'approved'
                                ? 'موافقة'
                                : row.outcome === 'rejected'
                                  ? 'رفض'
                                  : 'قيد النظر'}
                        </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-50/95">{row.content}</p>
                </li>
            ))}
        </ul>
    );
}

export function ManualOtherPartyLogBlock({
    entries,
    onPersist,
    onSubmitToDecisions,
    hideSavedEntries = false,
}: Omit<Props, 'embedded'>) {
    const [expanded, setExpanded] = useState(false);
    const [date, setDate] = useState(() => getLocalTodayYmd());
    const [content, setContent] = useState('');

    const sorted = useMemo(() => {
        return [...entries].sort(
            (a, b) =>
                String(b.date).localeCompare(String(a.date)) ||
                String(b.savedAt || '').localeCompare(String(a.savedAt || ''))
        );
    }, [entries]);

    const handleSave = useCallback(() => {
        const trimmed = content.trim();
        if (!trimmed) return;
        const submitRes = onSubmitToDecisions({
            date: date || getLocalTodayYmd(),
            content: trimmed,
        });
        if (!submitRes.ok) return;
        if (!hideSavedEntries) {
            const id = `opa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            const row: OtherPartyActionLogEntry = {
                id,
                date: date || getLocalTodayYmd(),
                content: trimmed,
                outcome: 'pending',
                savedAt: new Date().toISOString(),
            };
            onPersist([row, ...entries]);
        }
        setContent('');
        setExpanded(true);
    }, [content, date, entries, hideSavedEntries, onPersist, onSubmitToDecisions]);

    return (
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
                            {!hideSavedEntries ? <SavedEntriesList sorted={sorted} /> : null}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

export function OtherPartyActionsLog({
    entries,
    onPersist,
    onSubmitToDecisions,
    embedded = false,
    hideSavedEntries = false,
}: Props) {
    if (embedded) {
        return (
            <ManualOtherPartyLogBlock
                entries={entries}
                onPersist={onPersist}
                onSubmitToDecisions={onSubmitToDecisions}
                hideSavedEntries={hideSavedEntries}
            />
        );
    }

    const [date, setDate] = useState(() => getLocalTodayYmd());
    const [content, setContent] = useState('');

    const sorted = useMemo(() => {
        return [...entries].sort(
            (a, b) =>
                String(b.date).localeCompare(String(a.date)) ||
                String(b.savedAt || '').localeCompare(String(a.savedAt || ''))
        );
    }, [entries]);

    const handleSave = useCallback(() => {
        const trimmed = content.trim();
        if (!trimmed) return;
        const submitRes = onSubmitToDecisions({
            date: date || getLocalTodayYmd(),
            content: trimmed,
        });
        if (!submitRes.ok) return;
        const id = `opa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const row: OtherPartyActionLogEntry = {
            id,
            date: date || getLocalTodayYmd(),
            content: trimmed,
            outcome: 'pending',
            savedAt: new Date().toISOString(),
        };
        onPersist([row, ...entries]);
        setContent('');
    }, [content, date, entries, onPersist, onSubmitToDecisions]);

    return (
        <div className="space-y-4 text-right" dir="rtl">
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

            <div className="space-y-2">
                <div className="text-xs text-amber-200/70">السجلات المحفوظة ({sorted.length})</div>
                <SavedEntriesList sorted={sorted} />
            </div>
        </div>
    );
}
