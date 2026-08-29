import React from 'react';
import type { LawyerRequest } from '../../criminalStore';
import { formatLawyerRequestStatusLabel } from '../../criminalStageUtils';
import { isTimelineNextDateInvalid } from '../../criminalStageUtils';

export type RequestQuickFinalizeModalProps = {
    open: boolean;
    request: LawyerRequest | null;
    nextStatus: 'approved' | 'rejected';
    judgeMargin: string;
    decisionDate: string;
    onStatusChange: (status: 'approved' | 'rejected') => void;
    onJudgeMarginChange: (value: string) => void;
    onDecisionDateChange: (value: string) => void;
    onClose: () => void;
    onSave: () => void;
};

export const RequestQuickFinalizeModal = ({
    open,
    request,
    nextStatus,
    judgeMargin,
    decisionDate,
    onStatusChange,
    onJudgeMarginChange,
    onDecisionDateChange,
    onClose,
    onSave,
}: RequestQuickFinalizeModalProps) => {
    if (!open || !request) return null;

    const requestDate = String(request.requestDate ?? '').trim();
    const decisionBeforeRequest =
        requestDate &&
        decisionDate.trim() &&
        isTimelineNextDateInvalid(requestDate, decisionDate.trim());

    const canSave =
        judgeMargin.trim().length > 0 &&
        decisionDate.trim().length > 0 &&
        !decisionBeforeRequest;

    return (
        <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm whitespace-normal break-words">✍️ تسجيل هامش القاضي</div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] min-w-[44px] px-3 text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words touch-manipulation"
                    >
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="rounded-xl border border-slate-600/60 bg-slate-800/40 px-3 py-2 text-white/80 text-xs font-bold whitespace-normal break-words">
                        {request.requestDate} • {request.type}
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">نتيجة القاضي *</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={nextStatus}
                            onChange={(e) => onStatusChange(e.target.value as 'approved' | 'rejected')}
                        >
                            <option value="approved" className="bg-slate-900 text-white">
                                {formatLawyerRequestStatusLabel('approved')}
                            </option>
                            <option value="rejected" className="bg-slate-900 text-white">
                                {formatLawyerRequestStatusLabel('rejected')}
                            </option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            قرار / هامش القاضي الختامي *
                        </label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[90px] resize-none"
                            value={judgeMargin}
                            onChange={(e) => onJudgeMarginChange(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            تاريخ قرار القاضي *
                        </label>
                        <input
                            type="date"
                            min={requestDate || undefined}
                            className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 ${
                                decisionBeforeRequest ? 'border-red-500/60' : 'border-slate-700'
                            }`}
                            value={decisionDate}
                            onChange={(e) => onDecisionDateChange(e.target.value)}
                        />
                        {decisionBeforeRequest ? (
                            <p className="mt-1 text-[11px] font-bold text-red-300 whitespace-normal break-words">
                                لا يمكن أن يكون تاريخ القرار سابقاً لتاريخ تقديم الطلب ({requestDate || '—'}).
                            </p>
                        ) : null}
                    </div>
                    {nextStatus === 'rejected' ? (
                        <div className="rounded-lg border border-violet-500/35 bg-violet-950/30 px-3 py-2 text-[11px] font-bold text-violet-100 whitespace-normal break-words">
                            عند الحاجة يمكن تسجيل «طعن تمييزي» يدوياً من كارت القرار في السجل الزمني.
                        </div>
                    ) : null}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-[44px] px-4 rounded-xl border border-slate-700 bg-slate-900 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words touch-manipulation"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={!canSave}
                            className="min-h-[44px] px-4 rounded-lg bg-[#E6C673] text-[#0B1021] font-black text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words touch-manipulation"
                        >
                            حفظ هامش القاضي وقفل
                        </button>
                    </div>
                </div>
        </div>
    );
};
