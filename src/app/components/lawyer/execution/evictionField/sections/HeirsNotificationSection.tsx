import React from 'react';
import { BTN_BASE, BTN_DISABLED } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function HeirsNotificationSection({
    locked,
    showDebtorHeirsEvictionTools,
    heirsNotificationDateYmd,
    onHeirsNotificationDateYmdChange,
    onIssueHeirsExecutionNoticeMemo,
}: Pick<
    EvictionFieldPanelModel,
    | 'locked'
    | 'showDebtorHeirsEvictionTools'
    | 'heirsNotificationDateYmd'
    | 'onHeirsNotificationDateYmdChange'
    | 'onIssueHeirsExecutionNoticeMemo'
>) {
    if (!showDebtorHeirsEvictionTools || !onIssueHeirsExecutionNoticeMemo) return null;

    return (
                <div className="rounded-2xl border border-white/10 bg-[#0A1122]/60 backdrop-blur-xl px-3 py-2.5 space-y-2 text-right">
                    <p className="text-[9px] text-slate-500">تبليغ الورثة — اختياري</p>
                    {onHeirsNotificationDateYmdChange && (
                        <label className="flex flex-col gap-1 items-stretch">
                            <span className="text-[10px] text-slate-400">تاريخ تبليغ الورثة</span>
                            <input
                                type="date"
                                value={heirsNotificationDateYmd}
                                onChange={(e) => onHeirsNotificationDateYmdChange(e.target.value)}
								className="w-full bg-black/20 border border-white/10 text-white rounded-2xl p-4 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 focus:bg-black/40 transition-all placeholder:text-white/20"
                            />
                        </label>
                    )}
                    <button
                        type="button"
                        disabled={locked}
                        className={`${BTN_BASE} ${locked ? BTN_DISABLED : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            onIssueHeirsExecutionNoticeMemo();
                        }}
                    >
                        <div className="flex flex-row-reverse items-center gap-3">
                            <span className="text-lg shrink-0 opacity-80" aria-hidden>
                                📜
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-sm">
                                    إصدار مذكرة إخبار بالتنفيذ للورثة
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
    );
}
