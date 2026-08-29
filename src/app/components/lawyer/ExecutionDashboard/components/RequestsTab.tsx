import React from 'react';
import { Eye } from '@/app/components/ui/icons/Eye';
import { EyeOff } from '@/app/components/ui/icons/EyeOff';
import { Send } from '@/app/components/ui/icons/Send';
import type { InlineActionGateKey } from '../types';
import { shouldAlwaysShowHiddenRequestsToggle, hasAnyHiddenFollowupContent } from './hiddenFollowupRequestsUtils';
import { SPECIAL_REQUEST_MANUAL_MODE } from './requestsTabConstants';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type { HiddenFollowupRequestOptionsProps } from './HiddenFollowupRequestOptions';
import { useFollowupTabDecisionsLoader } from '../hooks/useFollowupTabDecisionsLoader';
import { EXEC_MODAL_TOUCH_TARGET } from '../executionModalMobileShell';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';
import {
    LazyHiddenFollowupRequestOptions,
    LazyRequestsTabDecisionLog,
    prefetchHiddenFollowupRequestOptions,
    prefetchRequestsTabInnerSurfaces,
} from '../requestsTabInnerLazy';

const REQUESTS_INNER_PAINT_SLOT = (
    <div className="h-11 min-h-[44px] rounded-xl border border-white/10 bg-black/20" aria-hidden />
);

export { SPECIAL_REQUEST_MANUAL_MODE } from './requestsTabConstants';

export interface RequestsTabProps {
    executionId: string | undefined;
    executionData?: Record<string, unknown> | null;
    specialRequestTemplatePick: string;
    setSpecialRequestTemplatePick: (v: string) => void;
    specialRequestDate: string;
    setSpecialRequestDate: (v: string) => void;
    specialRequestContent: string;
    setSpecialRequestContent: (v: string) => void;
    specialRequestManualTitle: string;
    setSpecialRequestManualTitle: (v: string) => void;
    inlineActionGateKey?: InlineActionGateKey | null;
    setInlineActionGateKey?: (key: InlineActionGateKey | null) => void;
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
    executionData = null,
    specialRequestManualTitle,
    setSpecialRequestManualTitle,
    specialRequestDate,
    setSpecialRequestDate,
    specialRequestContent,
    setSpecialRequestContent,
    runSpecialFollowupSubmit,
    activeDebtorIsDeceased = false,
    activeDebtorIsLegalEntity = false,
    hideHiddenFollowupRequests = false,
    hiddenFollowupRequestOptions,
    appealPerspective = 'creditor_agent',
}) => {
    const { decisions, storageExecutionId: exId } = useFollowupTabDecisionsLoader(
        executionId,
        executionData,
    );
    const [showHiddenPersonalRequests, setShowHiddenPersonalRequests] = React.useState(false);
    React.useEffect(() => {
        prefetchRequestsTabInnerSurfaces();
    }, []);
    React.useEffect(() => {
        if (activeDebtorIsLegalEntity) setShowHiddenPersonalRequests(false);
    }, [activeDebtorIsLegalEntity]);

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
                            onPointerEnter={() => prefetchHiddenFollowupRequestOptions()}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[9px] font-bold transition-all ${EXEC_MODAL_TOUCH_TARGET} ${
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
                    <PreloadableOverlayGate
                        lazy={LazyHiddenFollowupRequestOptions}
                        lazyProps={{
                            executionId: exId,
                            breakDecisions: decisions,
                            ...hiddenFollowupRequestOptions,
                        }}
                        fallback={REQUESTS_INNER_PAINT_SLOT}
                    />
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-[9px] text-slate-400">موضوع الطلب *</label>
                            <input
                                type="text"
                                value={specialRequestManualTitle}
                                onChange={(e) => setSpecialRequestManualTitle(e.target.value)}
                                className="w-full min-h-[44px] rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white focus:border-emerald-500/50 focus:outline-none touch-manipulation"
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
                                className="w-full min-h-[44px] bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-emerald-500/50 [&::-webkit-calendar-picker-indicator]:invert touch-manipulation"
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

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void runSpecialFollowupSubmit();
                                }}
                                disabled={
                                    !specialRequestDate.trim() ||
                                    !specialRequestContent.trim() ||
                                    !specialRequestManualTitle.trim()
                                }
                                className="w-full min-h-[44px] py-3 bg-emerald-700/80 text-white hover:bg-emerald-700 rounded-xl font-bold text-[11px] border border-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
                            >
                                <Send size={14} />
                                تأكيد إرسال الطلب
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <PreloadableOverlayGate
                lazy={LazyRequestsTabDecisionLog}
                lazyProps={{
                    executionId: exId,
                    decisions,
                    appealPerspective,
                }}
                fallback={REQUESTS_INNER_PAINT_SLOT}
            />
        </div>
    );
};
