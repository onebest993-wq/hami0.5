import React from 'react';
import { Bell, CheckCircle, Newspaper, UserCheck } from 'lucide-react';
import type { SummonsHubActiveSnapshot, SummonsHubKind } from '../summonsHubActiveLocks';
import { countActiveSummonsPaths } from '../summonsHubActiveLocks';

type Props = {
    snapshot: SummonsHubActiveSnapshot;
    onOpenKind: (kind: Exclude<SummonsHubKind, 'status'>) => void;
};

/**
 * لوحة «الوضع الحالي» — ملخص المسارات السارية مع انتقال سريع لإدارتها.
 */
const STATUS_CARD_BASE =
    'w-full rounded-2xl p-3.5 text-right backdrop-blur-xl transition-all duration-200 active:scale-[0.99] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_34px_rgba(0,0,0,0.4)]';

export function SummonsHubActiveStatusPanel({ snapshot, onOpenKind }: Props) {
    const count = countActiveSummonsPaths(snapshot);

    if (count === 0) {
        return (
            <div
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-5 text-right space-y-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_34px_rgba(0,0,0,0.4)] backdrop-blur-xl"
                dir="rtl"
            >
                <p className="text-white text-sm font-black">لا يوجد تبليغ سارٍ حالياً</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                    اختر نوع التبليغ من القائمة أعلاه لتسجيل مسار جديد. لا يمكن تشغيل أكثر من مسار
                    تبليغ/تكليف/نشر في الوقت نفسه.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3" dir="rtl">
            <div className="rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/[0.12] via-[#0A0F1C]/40 to-transparent px-3.5 py-2.5 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                <p className="text-[11px] font-black text-indigo-100">
                    مسارات سارية: <span className="font-mono tabular-nums">{count}</span>
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                    أنهِ المسار الساري قبل بدء نوع آخر — من البطاقة أدناه أو من تبويبه.
                </p>
            </div>

            {snapshot.tabligh ? (
                <button
                    type="button"
                    onClick={() => onOpenKind('tabligh')}
                    className={`${STATUS_CARD_BASE} border border-cyan-400/25 bg-gradient-to-br from-cyan-500/[0.12] via-[#0A0F1C]/45 to-transparent hover:border-cyan-300/40 hover:from-cyan-500/[0.18]`}
                >
                    <div className="flex flex-row-reverse items-start justify-between gap-2">
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/15">
                            <Bell size={15} className="text-cyan-200" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-cyan-100">تبليغ عادي سارٍ</p>
                            <p className="mt-1 text-[11px] font-mono text-slate-200">
                                {snapshot.tabligh.noticeDateYmd}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                                {snapshot.tabligh.purpose}
                            </p>
                        </div>
                    </div>
                </button>
            ) : null}

            {snapshot.taklif ? (
                <button
                    type="button"
                    onClick={() => onOpenKind('taklif')}
                    className={`${STATUS_CARD_BASE} border border-amber-400/25 bg-gradient-to-br from-amber-500/[0.12] via-[#0A0F1C]/45 to-transparent hover:border-amber-300/40 hover:from-amber-500/[0.18]`}
                >
                    <div className="flex flex-row-reverse items-start justify-between gap-2">
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/15">
                            <UserCheck size={15} className="text-amber-200" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-amber-100">
                                تكليف بالحضور —{' '}
                                {snapshot.taklif.phase === 'active'
                                    ? 'سارٍ'
                                    : snapshot.taklif.phase === 'absent_declared'
                                      ? 'عدم حضور'
                                      : snapshot.taklif.phase === 'investigation_pending'
                                        ? 'مفاتحة'
                                        : 'أمر قبض'}
                            </p>
                            {snapshot.taklif.notifyDate ? (
                                <p className="mt-1 text-[11px] font-mono text-slate-200">
                                    تبليغ: {snapshot.taklif.notifyDate}
                                </p>
                            ) : null}
                            {snapshot.taklif.purpose ? (
                                <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                                    {snapshot.taklif.purpose}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </button>
            ) : null}

            {snapshot.nashr ? (
                <button
                    type="button"
                    onClick={() => onOpenKind('nashr')}
                    className={`${STATUS_CARD_BASE} border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.12] via-[#0A0F1C]/45 to-transparent hover:border-violet-300/40 hover:from-violet-500/[0.18]`}
                >
                    <div className="flex flex-row-reverse items-start justify-between gap-2">
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/15">
                            <Newspaper size={15} className="text-violet-200" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-violet-100">تبليغ بالنشر سارٍ</p>
                            <p className="mt-1 text-[11px] font-mono text-slate-200">
                                {snapshot.nashr.publicationDateYmd}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                                {snapshot.nashr.newspaper1} · {snapshot.nashr.newspaper2}
                            </p>
                        </div>
                    </div>
                </button>
            ) : null}

            {snapshot.guarantor ? (
                <button
                    type="button"
                    onClick={() => onOpenKind('guarantor')}
                    className={`${STATUS_CARD_BASE} border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.12] via-[#0A0F1C]/45 to-transparent hover:border-emerald-300/40 hover:from-emerald-500/[0.18]`}
                >
                    <div className="flex flex-row-reverse items-start justify-between gap-2">
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15">
                            <CheckCircle size={15} className="text-emerald-200" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-emerald-100">تبليغ الكفيل سارٍ</p>
                            <p className="mt-1 text-[11px] font-mono text-slate-200">
                                {snapshot.guarantor.noticeDateYmd}
                            </p>
                        </div>
                    </div>
                </button>
            ) : null}
        </div>
    );
}
