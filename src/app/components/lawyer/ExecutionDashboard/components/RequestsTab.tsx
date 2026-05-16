import React from 'react';
import { Send, ChevronDown } from 'lucide-react';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import {
    DECISIONS_RELOAD_EVENT,
    readExecutorDecisionsArray,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';

const ADMIN_GROUP = [
    'طلب تصحيح خطأ مادي',
    'طلب توحيد الأضابير',
    'طلب نقل الإضبارة',
    'طلب تجديد الإضبارة',
    'طلب انتداب خبير/خبراء',
    'الاعتراض على تقرير الخبراء',
    'تحديد موعد المزايدة العلنية',
    'الإحالة القطعية',
] as const;

const ALL_OPTIONS = [...ADMIN_GROUP] as const;

export interface RequestsTabProps {
    executionId: string | undefined;
    specialRequestTemplatePick: string;
    setSpecialRequestTemplatePick: (v: string) => void;
    specialRequestDate: string;
    setSpecialRequestDate: (v: string) => void;
    specialRequestContent: string;
    setSpecialRequestContent: (v: string) => void;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    runSpecialFollowupSubmit: () => void;
}

export const RequestsTab: React.FC<RequestsTabProps> = ({
    executionId,
    specialRequestTemplatePick,
    setSpecialRequestTemplatePick,
    specialRequestDate,
    setSpecialRequestDate,
    specialRequestContent,
    setSpecialRequestContent,
    inlineActionGateKey,
    setInlineActionGateKey,
    runSpecialFollowupSubmit,
}) => {
    const exId = String(executionId || '').trim();
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

    const isAdminTemplateDecision = React.useCallback((d: any): boolean => {
        if (String(d?.requestKind || '') !== 'special_followup') return false;
        const raw = String(d?.payloadJson || '').trim();
        if (raw) {
            try {
                const v = JSON.parse(raw) as any;
                if (String(v?.kind || '').trim() === 'admin_template') return true;
            } catch {}
        }
        const title = String(d?.title || '').trim();
        return Boolean(title) && ALL_OPTIONS.includes(title as any);
    }, []);

    const latestAdminDecision = React.useMemo(() => {
        const list = Array.isArray(decisions) ? decisions : [];
        const sorted = list
            .filter((d: any) => isAdminTemplateDecision(d))
            .sort((a: any, b: any) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
        return (sorted[0] as any) || null;
    }, [decisions, isAdminTemplateDecision]);

    const openAppeals = React.useCallback(
        (decisionId?: string) => {
            if (!exId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: exId,
                            tab: 'appeals',
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [exId]
    );

    const steps: ExecutionInlineStep[] = React.useMemo(() => {
        const row = latestAdminDecision;
        if (!row?.id) {
            return [
                {
                    id: 'admin:submit',
                    title: 'إرسال الطلب الإداري',
                    subtitle: 'اكتب الطلب ثم أرسله',
                    status: 'active',
                    tone: 'neutral',
                },
            ];
        }
        const decisionId = String(row.id || '').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const pending = String(row.executorOutcome ?? 'pending') === 'pending' || String(row.executorOutcome ?? '') === '';
        const approved = !rejected && !pending;
        return [
            {
                id: 'admin:submit',
                title: 'إرسال الطلب الإداري',
                subtitle: 'تم إرسال الطلب',
                status: 'done',
                tone: 'success',
            },
            {
                id: 'admin:executor',
                title: 'قرار المنفذ',
                subtitle: rejected ? 'تم رفض الطلب' : pending ? 'قيد البت' : approved ? 'تمت الموافقة' : '—',
                status: rejected || pending ? 'active' : 'done',
                tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
                content: rejected ? (
                    <ExecutionInlineExecutorDecisionActions
                        executionId={exId}
                        decisionId={decisionId}
                        requestKind="special_followup"
                        disabled
                        onOpenAppealCenter={() => openAppeals(decisionId)}
                    />
                ) : pending ? (
                    <ExecutionInlineExecutorDecisionActions
                        executionId={exId}
                        decisionId={decisionId}
                        requestKind="special_followup"
                    />
                ) : null,
            },
        ];
    }, [exId, latestAdminDecision, openAppeals]);

    return (
        <div className="space-y-4 p-3 text-right" dir="rtl">
            {/* القائمة المنسدلة */}
            <div className="relative">
                <div className="mb-1.5 px-1 flex items-center gap-1.5">
                    <ChevronDown size={12} className="text-emerald-400" />
                    <label className="text-[10px] font-bold text-slate-400">اختر نوع الطلب</label>
                </div>

                {specialRequestTemplatePick ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3.5 py-2.5">
                        <span className="flex-1 text-[11px] font-bold text-emerald-200">{specialRequestTemplatePick}</span>
                        <button
                            type="button"
                            onClick={() => {
                                setSpecialRequestTemplatePick('');
                                setSpecialRequestContent('');
                            }}
                            className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            تغيير
                        </button>
                    </div>
                ) : (
                    <select
                        value=""
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                                if (val === '__manual__') {
                                    setSpecialRequestTemplatePick('');
                                    setSpecialRequestContent('');
                                    return;
                                }
                                setSpecialRequestTemplatePick(val);
                                setSpecialRequestContent(val);
                            }
                        }}
                        className="w-full appearance-none bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    >
                        <option value="" disabled className="bg-[#0A0F1C] text-slate-500">
                            اكتب يدوياً أو اختر من القائمة...
                        </option>
                        <option value="__manual__" className="bg-[#0A0F1C] text-white">
                            كتابة طلب يدوي (نص حر)
                        </option>
                        <optgroup label="الطلبات الإدارية" className="bg-[#0A0F1C] text-emerald-300">
                            {ADMIN_GROUP.map((opt) => (
                                <option key={opt} value={opt} className="bg-[#0A0F1C] text-white">
                                    {opt}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                )}
            </div>

            {/* حقل إدخال يدوي */}
            <div>
                <div className="mb-1 flex items-center justify-between">
                    <label className="block text-[9px] text-slate-500">كتابة طلب يدوي (موضوع + تفاصيل)</label>
                    <button
                        type="button"
                        onClick={() => {
                            setSpecialRequestTemplatePick('');
                            setSpecialRequestContent('');
                        }}
                        className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        كتابة طلب يدوي
                    </button>
                </div>
                <input
                    type="text"
                    value={specialRequestTemplatePick}
                    onChange={(e) => {
                        setSpecialRequestTemplatePick(e.target.value);
                        if (e.target.value && !ALL_OPTIONS.includes(e.target.value as any)) {
                            setSpecialRequestContent(e.target.value);
                        }
                    }}
                    placeholder="اكتب يدوياً أو اختر من القائمة..."
                    className="w-full bg-black/20 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-emerald-500/50 placeholder:text-white/20"
                />
            </div>

            {/* النموذج — يظهر فقط عند اختيار طلب */}
            {specialRequestTemplatePick.trim() && (
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-950/10 p-4 space-y-3">
                    <div className="text-[10px] font-bold text-emerald-300/80 flex items-center gap-1.5">
                        <Send size={12} />
                        تفاصيل الطلب
                    </div>

                    {/* التاريخ */}
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

                    {/* مضمون الطلب */}
                    <div>
                        <label className="mb-1 block text-[9px] text-slate-400">مضمون الطلب / التفاصيل *</label>
                        <textarea
                            value={specialRequestContent}
                            onChange={(e) => setSpecialRequestContent(e.target.value)}
                            placeholder="أدخل مضمون الطلب وتفاصيله..."
                            rows={4}
                            className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-emerald-500/50 placeholder:text-white/20 resize-none"
                        />
                    </div>

                    {/* زر الإرسال */}
                    <div className="relative pt-2">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setInlineActionGateKey('requests_submit');
                            }}
                            disabled={!specialRequestContent.trim() || !specialRequestDate.trim()}
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
                </div>
            )}

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] font-bold text-slate-300 mb-2">متابعة الطلب (ستارة منسدلة)</p>
                <ExecutionInlineAccordion steps={steps} />
            </div>
        </div>
    );
};
