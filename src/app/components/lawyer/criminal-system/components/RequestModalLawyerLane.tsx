import type { LawyerRequest } from '../criminalStore';
import { CUSTOM_LAWYER_MOTION_TYPE } from '../proceduralRequestTypes';
import { LAWYER_REQUEST_STATUS_OPTIONS } from '../lawyerRequestStatusMachine';

export type RequestModalLawyerLaneProps = {
    reqEntryLane: 'judicial' | 'lawyer' | '';
    reqCustomTypeName: string;
    reqStatus: LawyerRequest['status'];
    reqJudgeMargin: string;
    reqDecisionDate: string;
    reqDate: string;
    isRequestFinalStatus: boolean;
    reqDecisionBeforeRequest: boolean;
    onApplyLawyerTemplate: (template: string) => void;
    onCustomTypeNameChange: (value: string) => void;
    onStatusChange: (status: LawyerRequest['status']) => void;
    onJudgeMarginChange: (value: string) => void;
    onDecisionDateChange: (value: string) => void;
};

export const RequestModalLawyerLane = ({
    reqEntryLane,
    reqCustomTypeName,
    reqStatus,
    reqJudgeMargin,
    reqDecisionDate,
    reqDate,
    isRequestFinalStatus,
    reqDecisionBeforeRequest,
    onApplyLawyerTemplate,
    onCustomTypeNameChange,
    onStatusChange,
    onJudgeMarginChange,
    onDecisionDateChange,
}: RequestModalLawyerLaneProps) => {
    return (
            <div className="rounded-xl border border-violet-500/35 bg-violet-950/20 p-3 space-y-3">
                <div className="text-violet-100 text-xs font-black whitespace-normal break-words">⚖️ طلبات المحامي</div>
                {/*
                    لا توجد قائمة منسدلة لـ«اختيار نوع الطلب» — جميع طلبات المحامي إدخال يدوي.
                    حقل «اسم الطلب» يُفعّل تلقائياً قالب CUSTOM_LAWYER_MOTION_TYPE داخل المتجر.
                */}
                {/* 🛡️ طلبات المحامي لا تَحمل خاصية «قابل للتمييز» — التمييز للقرارات لا للطلبات. */}
                {/* Fragment (لا حاوية إضافية) — الـ `space-y-3` يأتي من الحاوية الأم (السماوية/البنفسجية). */}
                <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                    value={reqCustomTypeName}
                    onChange={(e) => onCustomTypeNameChange(e.target.value)}
                    onFocus={() => onApplyLawyerTemplate(CUSTOM_LAWYER_MOTION_TYPE)}
                    placeholder="اسم الطلب…"
                />
                {reqEntryLane === 'lawyer' ? (
                    <>
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                حالة الطلب
                            </label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={reqStatus}
                                onChange={(e) => onStatusChange(e.target.value as LawyerRequest['status'])}
                            >
                                {LAWYER_REQUEST_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {isRequestFinalStatus ? (
                            <>
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        قرار / هامش القاضي الختامي *
                                    </label>
                                    <textarea
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[90px] resize-none"
                                        value={reqJudgeMargin}
                                        onChange={(e) => onJudgeMarginChange(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        تاريخ قرار القاضي *
                                    </label>
                                    <input
                                        type="date"
                                        min={reqDate.trim() || undefined}
                                        className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 ${
                                            reqDecisionBeforeRequest ? 'border-red-500/60' : 'border-slate-700'
                                        }`}
                                        value={reqDecisionDate}
                                        onChange={(e) => onDecisionDateChange(e.target.value)}
                                    />
                                    {reqDecisionBeforeRequest ? (
                                        <p className="mt-1 text-[11px] font-bold text-red-300 whitespace-normal break-words">
                                            لا يمكن أن يكون تاريخ القرار سابقاً لتاريخ تقديم الطلب ({reqDate.trim() || '—'}).
                                        </p>
                                    ) : null}
                                </div>
                                {reqStatus === 'rejected' ? (
                                    <p className="text-[11px] font-bold text-violet-100/80 whitespace-normal break-words">
                                        عند الحاجة يمكن تسجيل «طعن تمييزي» يدوياً من كارت القرار في السجل الزمني.
                                    </p>
                                ) : null}
                            </>
                        ) : null}
                    </>
                ) : null}
            </div>
    );
};
