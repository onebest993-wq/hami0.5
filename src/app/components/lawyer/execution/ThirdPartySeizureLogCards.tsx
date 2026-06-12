import React, { useEffect, useState } from 'react';
import { formatNumberInput, parseAmount } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';
import type { ThirdPartySeizure, ThirdPartySeizureAsset } from '@/app/types/execution';
import type { TimelineEvent } from '@/app/types/execution';

export function ThirdPartySeizureWorkflowCard(props: {
    seizure: ThirdPartySeizure;
    fundsDraft: string;
    onFundsDraftChange: (value: string) => void;
    onSeizuresChange: (next: ThirdPartySeizure[]) => void;
    seizures: ThirdPartySeizure[];
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    setTimelineEvents: React.Dispatch<React.SetStateAction<TimelineEvent[]>>;
    nextTimelineId: () => string;
    showToast: (msg: string, kind?: 'success' | 'warning' | 'error' | 'info') => void;
    onCreditToFinancialCenter: (amountIqd: number) => { ok: boolean };
}) {
    const id = String(props.seizure?.id || '').trim();
    const status = String(props.seizure?.status || '').trim();
    const replyStatus = String(props.seizure?.replyStatus || '').trim();
    const deferred = Boolean(props.seizure?.funds_delivery_deferred);
    const thirdPartyName = String(props.seizure?.thirdPartyName || '').trim() || 'جهة غير محددة';

    const isDenied = status === 'replied' && replyStatus === 'denied';
    const isComplete = status === 'funds_received';
    const isAcknowledged = status === 'replied' && replyStatus === 'acknowledged';
    const awaitingReply = status === 'notified';

    const [deliveryFormOpen, setDeliveryFormOpen] = useState(false);
    const showDeliveryForm = deliveryFormOpen || deferred;

    useEffect(() => {
        if (deferred) setDeliveryFormOpen(true);
    }, [deferred]);

    const resolvedDraft = String(props.fundsDraft ?? '').trim();
    const draftAmount = Math.max(0, Math.trunc(parseAmount(resolvedDraft) || 0));
    const draftDisplay = resolvedDraft ? formatNumberInput(resolvedDraft) : '';

    const patchSeizure = (patch: Partial<ThirdPartySeizure>, timeline?: TimelineEvent) => {
        const nextSeizures = props.seizures.map((x) =>
            String(x?.id || '').trim() === id ? { ...x, ...patch } : x
        );
        props.onSeizuresChange(nextSeizures);
        if (timeline) {
            props.setTimelineEvents((prev) => {
                const nextTl = [timeline, ...prev];
                queueMicrotask(() =>
                    props.persistExecutionMerge({
                        thirdPartySeizures: nextSeizures,
                        timelineEvents: nextTl,
                    })
                );
                return nextTl;
            });
        } else {
            props.persistExecutionMerge({ thirdPartySeizures: nextSeizures });
        }
    };

    const completeDelivery = () => {
        if (!draftAmount) {
            props.showToast('أدخل المبلغ المستلم.', 'warning');
            return;
        }
        const credit = props.onCreditToFinancialCenter(draftAmount);
        const nowIso = new Date().toISOString();
        patchSeizure(
            {
                status: 'funds_received',
                transferredAmountIqd: draftAmount,
                funds_delivery_deferred: false,
            },
            {
                id: props.nextTimelineId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: '💰 استلام أموال محجوزة لدى الغير',
                description: `الجهة: ${thirdPartyName}\nالمبلغ المُسلَّم: ${draftAmount.toLocaleString('ar-IQ')} د.ع`,
                type: 'payment',
                source: 'المركز المالي — حجز لدى الغير',
                metadata: { thirdPartySeizureId: id },
            }
        );
        props.onFundsDraftChange('');
        if (credit.ok) {
            props.showToast(
                `تم التسليم وإيداع ${draftAmount.toLocaleString('ar-IQ')} د.ع في الأمانات — يُخصم من المتبقي.`,
                'success'
            );
        } else {
            props.showToast('تم تسجيل التسليم لكن تعذّر ربط المبلغ بالمركز المالي.', 'warning');
        }
    };

    if (isDenied || isComplete) return null;

    if (awaitingReply) {
        return (
            <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2">
                    <button
                        type="button"
                        className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                        onClick={() => {
                            const nowIso = new Date().toISOString();
                            patchSeizure(
                                { status: 'replied', replyStatus: 'acknowledged', funds_delivery_deferred: false },
                                {
                                    id: props.nextTimelineId(),
                                    date: nowIso.slice(0, 10),
                                    timestamp: nowIso,
                                    title: '📬 إجابة الجهة الثالثة — إقرار بوجود رصيد',
                                    description: `الجهة: ${thirdPartyName}`,
                                    type: 'coercive',
                                    source: 'محضر المتابعة — حجز لدى الغير',
                                    metadata: { thirdPartySeizureId: id },
                                }
                            );
                            props.showToast('تم الإقرار بوجود رصيد.', 'success');
                        }}
                    >
                        إقرار بوجود رصيد
                    </button>
                    <button
                        type="button"
                        className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[11px] font-extrabold text-rose-200 hover:bg-rose-500/15"
                        onClick={() => {
                            const nowIso = new Date().toISOString();
                            patchSeizure(
                                { status: 'replied', replyStatus: 'denied', funds_delivery_deferred: false },
                                {
                                    id: props.nextTimelineId(),
                                    date: nowIso.slice(0, 10),
                                    timestamp: nowIso,
                                    title: '📭 إجابة الجهة الثالثة — نفي',
                                    description: `الجهة: ${thirdPartyName}`,
                                    type: 'coercive',
                                    source: 'محضر المتابعة — حجز لدى الغير',
                                    metadata: { thirdPartySeizureId: id },
                                }
                            );
                            props.showToast('تم إغلاق المسار — نفي وجود رصيد.', 'success');
                        }}
                    >
                        نفي وجود رصيد
                    </button>
                </div>
            </div>
        );
    }

    if (isAcknowledged && !showDeliveryForm) {
        return (
            <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-2.5 text-[11px] font-extrabold text-emerald-100 hover:bg-emerald-500/22"
                        onClick={() => {
                            props.onFundsDraftChange('');
                            patchSeizure({ funds_delivery_deferred: false });
                            setDeliveryFormOpen(true);
                        }}
                    >
                        تم تسليم الأموال
                    </button>
                    <button
                        type="button"
                        className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15"
                        onClick={() => {
                            props.onFundsDraftChange('');
                            patchSeizure({ funds_delivery_deferred: true });
                            setDeliveryFormOpen(true);
                            props.showToast('التسليم لاحقاً — أكمل عند استلام الأموال.', 'info');
                        }}
                    >
                        التسليم لاحقاً
                    </button>
                </div>
            </div>
        );
    }

    if (isAcknowledged && showDeliveryForm) {
        return (
            <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-300">المبلغ المستلم (د.ع)</label>
                <input
                    type="text"
                    inputMode="numeric"
                    value={draftDisplay}
                    onChange={(e) => props.onFundsDraftChange(formatNumberInput(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right tabular-nums"
                    placeholder="أدخل المبلغ"
                />
                <button
                    type="button"
                    className="w-full rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-700 px-5 py-2.5 text-[12px] font-black text-white shadow-md shadow-black/20 disabled:opacity-40"
                    disabled={!draftAmount}
                    onClick={completeDelivery}
                >
                    تم التسليم
                </button>
            </div>
        );
    }

    return null;
}

export function ThirdPartySeizureRegistryCard(props: {
    asset: ThirdPartySeizureAsset;
    beginReceive: (asset: ThirdPartySeizureAsset) => void;
    updateReceiveDraft: (assetId: string, value: string) => void;
    cancelReceive: (asset: ThirdPartySeizureAsset) => void;
    confirmReceive: (asset: ThirdPartySeizureAsset) => void;
}) {
    const asset = props.asset;
    const locked = Boolean(asset.record_locked);
    const awaiting = Boolean(asset.awaiting_receive);
    const isPlaceholder = /بانتظار\s*الإكمال/i.test(String(asset.thirdPartyName || ''));
    const statusLabel =
        asset.status === 'waiting'
            ? isPlaceholder
                ? 'بانتظار إكمال البيانات'
                : 'بانتظار إجابة الجهة'
            : asset.status === 'received'
              ? 'تم الاستلام'
              : 'مؤرشف';
    const expected =
        typeof asset.expectedAmountIqd === 'number' &&
        Number.isFinite(asset.expectedAmountIqd) &&
        asset.expectedAmountIqd > 0
            ? `${asset.expectedAmountIqd.toLocaleString('ar-IQ')} د.ع`
            : '—';

    if (isPlaceholder) {
        return (
            <p className="text-[10px] text-amber-200/90 text-right">
                أكمل بيانات الحجز لدى الغير من تبويب طلبات الحجز لبدء المتابعة.
            </p>
        );
    }

    if (locked) {
        return (
            <p className="text-[10px] text-slate-400 text-right">
                {statusLabel}
                {asset.actualReceivedAmountIqd
                    ? ` — ${Number(asset.actualReceivedAmountIqd).toLocaleString('ar-IQ')} د.ع`
                    : ''}
            </p>
        );
    }

    if (awaiting) {
        return (
            <div className="space-y-2">
                <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberInput(String(asset.receive_amount_draft || ''))}
                    onChange={(e) => props.updateReceiveDraft(asset.id, formatNumberInput(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 text-right tabular-nums"
                    placeholder="المبلغ الفعلي المستلم (د.ع)"
                />
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => props.confirmReceive(asset)}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/15"
                    >
                        تم التسليم
                    </button>
                    <button
                        type="button"
                        onClick={() => props.cancelReceive(asset)}
                        className="rounded-xl border border-slate-500/30 bg-slate-500/10 py-2 text-[10px] font-bold text-slate-200 hover:bg-slate-500/15"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => props.beginReceive(asset)}
            className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[11px] font-extrabold text-cyan-100 hover:bg-cyan-500/15"
        >
            تسجيل استلام الأموال من الجهة
        </button>
    );
}
