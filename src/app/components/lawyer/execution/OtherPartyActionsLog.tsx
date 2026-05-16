import { useCallback, useMemo, useState } from 'react';
import type { OtherPartyActionLogEntry } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

type Props = {
    entries: OtherPartyActionLogEntry[];
    onPersist: (next: OtherPartyActionLogEntry[]) => void;
    onSubmitToDecisions: (input: { date: string; content: string }) => { ok: boolean; decisionId?: string };
};

export function OtherPartyActionsLog({ entries, onPersist, onSubmitToDecisions }: Props) {
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
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
                <div>
                    <label className="block text-xs text-amber-200/80 mb-1">تاريخ التحرك / الطلب</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-lg border border-white/14 bg-black/30 px-3 py-2 text-sm text-amber-50"
                    />
                </div>
                <div>
                    <label className="block text-xs text-amber-200/80 mb-1">مضمون الطلب / التحرك</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={3}
                        placeholder="…"
                        className="w-full rounded-lg border border-white/14 bg-black/30 px-3 py-2 text-sm text-amber-50 resize-y min-h-[72px]"
                    />
                </div>
                <div className="flex justify-end pt-1">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!content.trim()}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-100 disabled:opacity-40 disabled:pointer-events-none hover:bg-emerald-500/25"
                    >
                        حفظ السجل
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <div className="text-xs text-amber-200/70">السجلات المحفوظة ({sorted.length})</div>
                {sorted.length === 0 ? (
                    <p className="text-sm text-white/50 py-6 text-center border border-dashed border-white/10 rounded-xl">
                        لا توجد سجلات بعد.
                    </p>
                ) : (
                    <ul className="space-y-2 max-h-[min(40vh,280px)] overflow-y-auto pr-1">
                        {sorted.map((row) => (
                            <li
                                key={row.id}
                                className={`rounded-xl border border-white/10 bg-black/25 p-3 text-right border-r-4 ${
                                    row.outcome === 'approved'
                                        ? 'border-r-emerald-500'
                                        : row.outcome === 'rejected'
                                          ? 'border-r-red-500'
                                          : 'border-r-amber-500'
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                    <span className="text-xs text-amber-200/90">{row.date}</span>
                                    <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full ${
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
                                <p className="text-sm text-amber-50/95 whitespace-pre-wrap leading-relaxed">{row.content}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

