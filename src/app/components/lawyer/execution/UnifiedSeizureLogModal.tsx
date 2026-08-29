import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase } from '@/app/components/ui/icons/Briefcase';
import { Car } from '@/app/components/ui/icons/Car';
import { Home } from '@/app/components/ui/icons/Home';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import { X } from '@/app/components/ui/icons/X';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import { EXEC_MODAL_CLOSE_BTN_CLASS } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import { useExecutionOverlayDismiss } from '@/app/components/lawyer/ExecutionDashboard/useExecutionOverlayDismiss';
import { UNIFIED_SEIZURE_TAB_ORDER } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogHelpers';
import {
    type SeizureLogTab,
} from '@/app/components/lawyer/execution/unifiedSeizureLogTabTypes';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';

export type { SeizureLogTab } from '@/app/components/lawyer/execution/unifiedSeizureLogTabTypes';
export { isSeizureLogTab } from '@/app/components/lawyer/execution/unifiedSeizureLogTabTypes';
export type {
    UnifiedSeizureLogEntry,
    UnifiedSeizureLogEntryKind,
} from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';

const TAB_META: Record<
    SeizureLogTab,
    { label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; active: string; idle: string }
> = {
    property: {
        label: 'عقار',
        Icon: Home,
        active: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
        idle: 'border-white/10 bg-slate-900/35 text-slate-300 hover:bg-slate-900/45',
    },
    salary: {
        label: 'راتب',
        Icon: Wallet,
        active: 'border-amber-400/35 bg-amber-500/10 text-amber-200',
        idle: 'border-white/10 bg-slate-900/35 text-slate-300 hover:bg-slate-900/45',
    },
    movable: {
        label: 'منقول',
        Icon: Car,
        active: 'border-sky-400/35 bg-sky-500/10 text-sky-200',
        idle: 'border-white/10 bg-slate-900/35 text-slate-300 hover:bg-slate-900/45',
    },
    third_party: {
        label: 'لدى الغير',
        Icon: Briefcase,
        active: 'border-violet-400/35 bg-violet-500/10 text-violet-200',
        idle: 'border-white/10 bg-slate-900/35 text-slate-300 hover:bg-slate-900/45',
    },
};

const KIND_ACCENT: Record<SeizureLogTab, string> = {
    property: 'border-amber-500/30',
    salary: 'border-emerald-500/30',
    movable: 'border-sky-500/30',
    third_party: 'border-violet-500/30',
};

function statusTone(statusLabel: string): string {
    const s = String(statusLabel || '');
    if (/مباع|تم البيع|إحالة|استلام|تم الحجز|فعال|مسجّل|إقرار/i.test(s)) {
        return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100';
    }
    if (/بانتظار|أكمل|موافقة/i.test(s)) {
        return 'border-amber-500/25 bg-amber-500/10 text-amber-100';
    }
    if (/فُك|مؤرشف|ملغى|نفي|رفض/i.test(s)) {
        return 'border-slate-500/25 bg-slate-500/10 text-slate-300';
    }
    return 'border-white/12 bg-white/5 text-slate-200';
}

const TAB_ORDER = UNIFIED_SEIZURE_TAB_ORDER;

export function UnifiedSeizureLogModal(props: {
    open: boolean;
    activeTab: SeizureLogTab;
    onTabChange: (tab: SeizureLogTab) => void;
    counts: Record<SeizureLogTab, number>;
    entries: UnifiedSeizureLogEntry[];
    onClose: () => void;
    renderEntryFooter?: (entry: UnifiedSeizureLogEntry) => React.ReactNode;
}) {
    const visibleEntries = useMemo(
        () => props.entries.filter((e) => e.kind === props.activeTab),
        [props.entries, props.activeTab]
    );

    const tabMeta = TAB_META[props.activeTab];
    useExecutionOverlayDismiss(props.open, props.onClose);

    if (!props.open || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) props.onClose();
            }}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#E6C673]/30 bg-[#0B1120] shadow-2xl shadow-black/60"
                data-testid="unified-seizure-log"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex shrink-0 items-center justify-between border-b border-[#E6C673]/20 px-4 py-3">
                    <button
                        type="button"
                        onClick={props.onClose}
                        className={`${EXEC_MODAL_CLOSE_BTN_CLASS} text-slate-400 hover:bg-white/5 hover:text-white`}
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                    <div className="text-right">
                        <p className="text-[13px] font-black text-[#E6C673]">سجل الحجز</p>
                        <p className="text-[10px] text-slate-400">
                            {tabMeta.label} — {props.counts[props.activeTab]} سجل
                        </p>
                    </div>
                    <span className="w-8" aria-hidden />
                </div>

                <div className="shrink-0 border-b border-white/6 px-3 py-2.5">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {TAB_ORDER.map((tab) => {
                            const meta = TAB_META[tab];
                            const Icon = meta.Icon;
                            const isActive = props.activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => props.onTabChange(tab)}
                                    className={`inline-flex flex-row-reverse items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 text-[10px] font-black transition-colors ${
                                        isActive ? meta.active : meta.idle
                                    }`}
                                >
                                    <Icon size={12} className="opacity-90" />
                                    <span>
                                        {meta.label} ({props.counts[tab]})
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                    {visibleEntries.length === 0 ? (
                        <p className="py-10 text-center text-[11px] text-slate-500">
                            لا يوجد سجل حجز في قسم {tabMeta.label} بعد.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {visibleEntries.map((entry, idx) => {
                                const footer = props.renderEntryFooter?.(entry);
                                return (
                                    <article
                                        key={entry.id}
                                        className={`rounded-2xl border bg-[#05060D]/70 ${KIND_ACCENT[props.activeTab]}`}
                                    >
                                        <div className="flex flex-row-reverse items-start justify-between gap-2 px-3 py-2.5">
                                            <div className="min-w-0 flex-1 text-right">
                                                <div className="mb-1 flex flex-row-reverse items-center gap-1.5">
                                                    <span className="text-[9px] tabular-nums text-slate-500">#{idx + 1}</span>
                                                    {entry.dateYmd ? (
                                                        <span className="text-[9px] tabular-nums text-slate-500">{entry.dateYmd}</span>
                                                    ) : null}
                                                </div>
                                                <p className="truncate text-[12px] font-black text-slate-50">{entry.title}</p>
                                            </div>
                                            <span
                                                className={`shrink-0 rounded-lg border px-2 py-0.5 text-[9px] font-bold ${statusTone(entry.statusLabel)}`}
                                            >
                                                {entry.statusLabel}
                                            </span>
                                        </div>

                                        {String(entry.description || '').trim() && !footer ? (
                                            <pre className="border-t border-white/6 px-3 py-2 text-[10px] leading-relaxed text-slate-300 whitespace-pre-wrap">
                                                {entry.description}
                                            </pre>
                                        ) : null}

                                        {footer ? (
                                            <div className="border-t border-white/6 px-3 py-2.5">{footer}</div>
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
