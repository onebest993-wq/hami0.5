import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_TOUCH_TARGET,
} from '../executionModalMobileShell';

export type HeirWorkflowRowState = {
    memoDate?: string;
    memoStatus?: string;
    summonDate?: string;
    summonStatus?: string;
    arrestWarrantStatus?: string;
};

export interface ExecutionHeirsNotificationModalContainerProps {
    showHeirsNotificationModal: boolean;
    setShowHeirsNotificationModal?: (show: boolean) => void;
    onCloseHeirsNotificationModal?: () => void;
    EXEC_MODAL_BACKDROP_STRONG: string;
    heirsNotificationModalZIndex: number;
    activeDebtorHeirsForNotification: readonly string[];
    normalizeHeirWorkflowKey: (name: string) => string;
    heirsWorkflowByHeir: Record<string, HeirWorkflowRowState>;
    computeDaysRemaining: (fromYmd: string, daysWindow: number) => number | null;
    computeDeadlineYmd: (fromYmd: string, daysWindow: number) => string;
    heirSummonsDatePickerOpenByHeir: Record<string, boolean>;
    setHeirSummonsDatePickerOpenByHeir: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    heirNoticeDateDrafts: Record<string, string>;
    setHeirNoticeDateDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    issueHeirMemoNotice: (heir: string) => void;
    closeHeirMemoManually: (heir: string) => void;
    issueHeirSummons: (heir: string) => void;
    markHeirSummonsAttended: (heir: string) => void;
    markHeirSummonsPeriodEnded: (heir: string) => void;
}

export const ExecutionHeirsNotificationModalContainer: React.FC<ExecutionHeirsNotificationModalContainerProps> = ({
    showHeirsNotificationModal,
    setShowHeirsNotificationModal,
    onCloseHeirsNotificationModal,
    EXEC_MODAL_BACKDROP_STRONG,
    heirsNotificationModalZIndex,
    activeDebtorHeirsForNotification,
    normalizeHeirWorkflowKey,
    heirsWorkflowByHeir,
    computeDaysRemaining,
    computeDeadlineYmd,
    heirSummonsDatePickerOpenByHeir,
    setHeirSummonsDatePickerOpenByHeir,
    heirNoticeDateDrafts,
    setHeirNoticeDateDrafts,
    issueHeirMemoNotice,
    closeHeirMemoManually,
    issueHeirSummons,
    markHeirSummonsAttended,
    markHeirSummonsPeriodEnded,
}) => {
    const closeHeirsNotificationModal = () => {
        if (typeof onCloseHeirsNotificationModal === 'function') {
            onCloseHeirsNotificationModal();
        } else {
            setShowHeirsNotificationModal?.(false);
        }
    };

    if (!showHeirsNotificationModal || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            style={{ zIndex: heirsNotificationModalZIndex }}
            role="presentation"
            onClick={() => closeHeirsNotificationModal()}
        >
            <div
                className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-3xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className={`border-b border-cyan-500/30 p-4 flex items-center justify-between ${EXEC_MODAL_HEADER_SAFE_TOP}`}>
                    <button
                        type="button"
                        onClick={() => closeHeirsNotificationModal()}
                        className={`${EXEC_MODAL_CLOSE_BTN_CLASS} hover:bg-cyan-500/20`}
                    >
                        <X size={20} className="text-white" />
                    </button>
                    <h3 className="text-cyan-300 font-bold text-sm">مركز تبليغ الورثة — متابعة مستقلة</h3>
                </div>
                <div className="p-4 space-y-3 max-h-[72vh] overflow-y-auto">
                    {activeDebtorHeirsForNotification.map((heir, idx) => {
                        const key = normalizeHeirWorkflowKey(heir);
                        const row = heirsWorkflowByHeir[key] || {};
                        const memoDate = row.memoDate || '';
                        const memoStatus = row.memoStatus || 'none';
                        const summonDate = row.summonDate || '';
                        const summonStatus = row.summonStatus || 'none';
                        const arrestWarrantStatus = row.arrestWarrantStatus || 'none';
                        const memoRemaining = memoDate ? computeDaysRemaining(memoDate, 7) : null;
                        const memoDone =
                            memoStatus === 'closed_manual' || memoStatus === 'attended';
                        const summonDatePickerOpen = Boolean(
                            heirSummonsDatePickerOpenByHeir[key]
                        );
                        const heirOrdinal = (idx + 1).toLocaleString('ar-IQ');
                        return (
                            <div
                                key={`${idx}-${heir}`}
                                className="rounded-xl border border-cyan-500/25 bg-slate-950/45 p-3 space-y-2"
                            >
                                <div
                                    className="flex w-full flex-row items-center justify-between gap-2"
                                    dir="rtl"
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                        <span
                                            className="flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-lg border border-cyan-500/35 bg-cyan-950/50 text-[11px] font-black tabular-nums text-cyan-100"
                                            aria-hidden
                                        >
                                            {heirOrdinal}
                                        </span>
                                        <span className="min-w-0 truncate text-right text-base font-semibold text-cyan-100 [unicode-bidi:plaintext]">
                                            {heir}
                                        </span>
                                    </div>
                                    <span className="shrink-0 text-[10px] text-slate-400">
                                        {arrestWarrantStatus === 'issued'
                                            ? '🚨 مذكرة قبض'
                                            : summonStatus === 'active'
                                                ? '📨 تكليف بالحضور'
                                                : memoStatus === 'active'
                                                  ? '📋 مذكرة إخبار'
                                                  : '—'}
                                    </span>
                                </div>

                                {(memoStatus === 'none' || (memoDone && summonDatePickerOpen)) && (
                                    <div className="rounded-lg border border-white/10 bg-slate-900/60 p-2 space-y-1.5">
                                        <label className="block text-[10px] text-slate-300">
                                            تاريخ التبليغ
                                        </label>
                                        <input
                                            type="date"
                                            value={heirNoticeDateDrafts[key] || ''}
                                            onChange={(e) =>
                                                setHeirNoticeDateDrafts((prev) => ({
                                                    ...prev,
                                                    [key]: e.target.value,
                                                }))
                                            }
                                            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-100"
                                        />
                                    </div>
                                )}

                                {memoStatus === 'none' && (
                                    <button
                                        type="button"
                                        onClick={() => issueHeirMemoNotice(heir)}
                                        className={`${EXEC_MODAL_TOUCH_TARGET} w-full rounded-lg bg-cyan-700/80 py-2 text-[11px] font-bold text-white`}
                                    >
                                        إصدار مذكرة الإخبار بالتنفيذ
                                    </button>
                                )}

                                {memoStatus === 'active' && (
                                    <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2 space-y-1.5">
                                        <p className="text-[10px] text-amber-200">
                                            نهاية مهلة المذكرة: {computeDeadlineYmd(memoDate, 7) || '—'} | المتبقي:{' '}
                                            {memoRemaining ?? '—'} يوم
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => closeHeirMemoManually(heir)}
                                            className="w-full rounded-lg bg-amber-700/80 py-1.5 text-[11px] font-bold text-white"
                                        >
                                            إنهاء التبليغ
                                        </button>
                                    </div>
                                )}

                                {memoDone && summonStatus === 'none' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!summonDatePickerOpen) {
                                                setHeirSummonsDatePickerOpenByHeir((prev) => ({
                                                    ...prev,
                                                    [key]: true,
                                                }));
                                                return;
                                            }
                                            issueHeirSummons(heir);
                                        }}
                                        className={`${EXEC_MODAL_TOUCH_TARGET} w-full rounded-lg bg-indigo-700/80 py-2 text-[11px] font-bold text-white`}
                                    >
                                        {summonDatePickerOpen ? 'تأكيد التكليف بالحضور' : 'تكليف بالحضور'}
                                    </button>
                                )}

                                {summonStatus === 'active' && (
                                    <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-2 space-y-1.5">
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => markHeirSummonsAttended(heir)}
                                                className="flex-1 rounded-lg bg-emerald-700/80 py-1.5 text-[11px] font-bold text-white"
                                            >
                                                حضور الوريث
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => markHeirSummonsPeriodEnded(heir)}
                                                className="flex-1 rounded-lg bg-amber-700/80 py-1.5 text-[11px] font-bold text-white"
                                            >
                                                إنهاء التكليف
                                            </button>
                                        </div>
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );
};
