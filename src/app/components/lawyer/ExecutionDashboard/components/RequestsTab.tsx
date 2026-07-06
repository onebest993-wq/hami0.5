import React from 'react';
import { Eye, EyeOff, Send } from 'lucide-react';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import { shouldAlwaysShowHiddenRequestsToggle, hasAnyHiddenFollowupContent } from './hiddenFollowupRequestsUtils';
import {
    DECISIONS_RELOAD_EVENT,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type { HiddenFollowupRequestOptionsProps } from './HiddenFollowupRequestOptions';

const LazyHiddenFollowupRequestOptions = React.lazy(() =>
    import('./HiddenFollowupRequestOptions').then((m) => ({
        default: m.HiddenFollowupRequestOptions,
    }))
);
const LazyRequestsTabLatestDecisionPanel = React.lazy(() =>
    import('./RequestsTabLatestDecisionPanel').then((m) => ({
        default: m.RequestsTabLatestDecisionPanel,
    }))
);

export { SPECIAL_REQUEST_MANUAL_MODE } from './requestsTabConstants';

export interface RequestsTabProps {
    executionId: string | undefined;
    specialRequestTemplatePick: string;
    setSpecialRequestTemplatePick: (v: string) => void;
    specialRequestDate: string;
    setSpecialRequestDate: (v: string) => void;
    specialRequestContent: string;
    setSpecialRequestContent: (v: string) => void;
    specialRequestManualTitle: string;
    setSpecialRequestManualTitle: (v: string) => void;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    runSpecialFollowupSubmit: () => void;
    activeDebtorIsDeceased?: boolean;
    activeDebtorIsLegalEntity?: boolean;
    /** وكيل المدين أو مدين معنوي — لا طلبات جبريّة مخفية */
    hideHiddenFollowupRequests?: boolean;
    hiddenFollowupRequestOptions?: Omit<
        HiddenFollowupRequestOptionsProps,
        'executionId' | 'breakDecisions'
    >;
    appealPerspective?: AppealUiPerspective;
}

export const RequestsTab: React.FC<RequestsTabProps> = ({
    executionId,
    specialRequestManualTitle,
    setSpecialRequestManualTitle,
    specialRequestDate,
    setSpecialRequestDate,
    specialRequestContent,
    setSpecialRequestContent,
    inlineActionGateKey,
    setInlineActionGateKey,
    runSpecialFollowupSubmit,
    activeDebtorIsDeceased = false,
    activeDebtorIsLegalEntity = false,
    hideHiddenFollowupRequests = false,
    hiddenFollowupRequestOptions,
    appealPerspective = 'creditor_agent',
}) => {
    const exId = String(executionId || '').trim();
    const [showHiddenPersonalRequests, setShowHiddenPersonalRequests] = React.useState(false);
    React.useEffect(() => {
        if (activeDebtorIsLegalEntity) setShowHiddenPersonalRequests(false);
    }, [activeDebtorIsLegalEntity]);
    const [decisions, setDecisions] = React.useState<Record<string, unknown>[]>(() =>
        readExecutorDecisionsArray(exId)
    );
    React.useEffect(() => {
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

    const showHiddenRequestsButton =
        !activeDebtorIsLegalEntity &&
        !hideHiddenFollowupRequests &&
        shouldAlwaysShowHiddenRequestsToggle({ activeDebtorIsDeceased }) &&
        hiddenFollowupRequestOptions &&
        hasAnyHiddenFollowupContent(
            hiddenFollowupRequestOptions.flags,
            hiddenFollowupRequestOptions.guarantorCtx,
            hiddenFollowupRequestOptions.domainContext
        );

    return (
        <div className="space-y-4 p-3 text-right" dir="rtl">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-950/10 p-4 space-y-3">
                <div className="flex flex-row-reverse items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300/80">
                        <Send size={12} />
                        {showHiddenPersonalRequests
                            ? 'الطلبات المخفية'
                            : 'طلب يدوي — أدخل البيانات'}
                    </div>
                    {showHiddenRequestsButton ? (
                        <button
                            type="button"
                            onClick={() => setShowHiddenPersonalRequests((v) => !v)}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[9px] font-bold transition-all ${
                                showHiddenPersonalRequests
                                    ? 'border-emerald-400/35 bg-emerald-500/12 text-emerald-100'
                                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-emerald-400/25 hover:text-emerald-100'
                            }`}
                        >
                            {showHiddenPersonalRequests ? <EyeOff size={11} /> : <Eye size={11} />}
                            {showHiddenPersonalRequests
                                ? 'العودة للطلب اليدوي'
                                : 'الطلبات المخفية'}
                        </button>
                    ) : null}
                </div>

                {showHiddenPersonalRequests && hiddenFollowupRequestOptions ? (
                    <React.Suspense fallback={<div className="rounded-xl border border-white/10 bg-black/20 px-3 py-4 text-center text-[10px] text-slate-400">جاري تحميل الطلبات المخفية...</div>}>
                        <LazyHiddenFollowupRequestOptions
                            executionId={exId}
                            breakDecisions={decisions}
                            {...hiddenFollowupRequestOptions}
                        />
                    </React.Suspense>
                ) : (
                    <>
                        <div>
                            <label className="mb-1 block text-[9px] text-slate-400">موضوع الطلب *</label>
                            <input
                                type="text"
                                value={specialRequestManualTitle}
                                onChange={(e) => setSpecialRequestManualTitle(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white focus:border-emerald-500/50 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-[9px] text-slate-400">تاريخ الطلب</label>
                            <input
                                type="date"
                                value={specialRequestDate}
                                onChange={(e) => setSpecialRequestDate(e.target.value)}
                                max={new Date().toISOString().slice(0, 10)}
                                dir="rtl"
                                className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-emerald-500/50 [&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-[9px] text-slate-400">
                                مضمون الطلب / التفاصيل *
                            </label>
                            <textarea
                                value={specialRequestContent}
                                onChange={(e) => setSpecialRequestContent(e.target.value)}
                                rows={4}
                                className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-emerald-500/50 resize-none"
                            />
                        </div>

                        <div className="relative pt-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineActionGateKey('requests_submit');
                                }}
                                disabled={
                                    !specialRequestDate.trim() ||
                                    !specialRequestContent.trim() ||
                                    !specialRequestManualTitle.trim()
                                }
                                className="w-full py-3 bg-emerald-700/80 text-white hover:bg-emerald-700 rounded-xl font-bold text-[11px] border border-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Send size={14} />
                                تأكيد إرسال الطلب
                            </button>
                            <InlineActionGate
                                gateKey="requests_submit"
                                activeKey={inlineActionGateKey}
                                onConfirm={() => {
                                    setInlineActionGateKey(null);
                                    void runSpecialFollowupSubmit();
                                }}
                                onCancel={() => setInlineActionGateKey(null)}
                            />
                        </div>
                    </>
                )}
            </div>

            <React.Suspense fallback={null}>
                <LazyRequestsTabLatestDecisionPanel
                    executionId={exId}
                    decisions={decisions}
                    appealPerspective={appealPerspective}
                />
            </React.Suspense>
        </div>
    );
};
