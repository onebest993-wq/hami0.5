import React, { memo } from 'react';
import { CalendarDays } from '@/app/components/ui/icons/CalendarDays';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { Hash } from '@/app/components/ui/icons/Hash';
import { PenLine } from '@/app/components/ui/icons/PenLine';
import { Plus } from '@/app/components/ui/icons/Plus';
import { X } from '@/app/components/ui/icons/X';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { normalizeJudgeDecisionTemplate } from '../smartFile/judgeDecisionTemplates';
import type { SessionHubTheme } from './sessionHubGlassTheme';

export interface SessionRecordFormProps {
    T: SessionHubTheme;
    visualVariant: 'civil' | 'personal';
    date: string;
    onDateChange: (value: string) => void;
    sessionNumber: string;
    nextHearingDate: string;
    setNextHearingDate: (value: string) => void;
    proceedings: string;
    setProceedings: (value: string) => void;
    judgeDecisions: string;
    setJudgeDecisions: (value: string) => void;
    customTemplates: string[];
    templateDraft: string;
    setTemplateDraft: (value: string) => void;
    onAddCustomTemplate: () => void;
    onRemoveCustomTemplate: (text: string) => void;
    onInsertJudgeLine: (line: string) => void;
}

export const SessionRecordForm = memo(function SessionRecordForm({
    T,
    date,
    onDateChange,
    sessionNumber,
    nextHearingDate,
    setNextHearingDate,
    proceedings,
    setProceedings,
    judgeDecisions,
    setJudgeDecisions,
    customTemplates,
    templateDraft,
    setTemplateDraft,
    onAddCustomTemplate,
    onRemoveCustomTemplate,
    onInsertJudgeLine,
}: SessionRecordFormProps) {
    return (
        <div className={T.body}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:items-start">
                <div className="min-w-0 flex flex-col">
                    <label className={T.label}>
                        <CalendarDays size={12} className="inline ml-1 text-[#E6C673]/70" aria-hidden />
                        تاريخ المرافعة
                    </label>
                    <input
                        type="date"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordDate}
                        value={date.slice(0, 10)}
                        onChange={(e) => onDateChange(e.target.value)}
                        className={T.field}
                    />
                </div>
                <div className="min-w-0 flex flex-col">
                    <label className={T.label}>
                        <Hash size={12} className="inline ml-1 text-[#E6C673]/70" aria-hidden />
                        رقم الجلسة
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        readOnly
                        aria-readonly="true"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordNumber}
                        value={sessionNumber}
                        className={`${T.field} text-white/70`}
                        placeholder="1"
                    />
                    <p className="mt-1.5 text-[10px] text-white/35 leading-snug">
                        يُحسب من تواريخ المرافعات — تاريخ واحد = جلسة واحدة
                    </p>
                </div>
                <div className="min-w-0 flex flex-col">
                    <label className={T.label}>
                        <CalendarDays size={12} className="inline ml-1 text-emerald-400/70" aria-hidden />
                        تاريخ المرافعة القادمة
                    </label>
                    <input
                        type="date"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordNextDate}
                        value={nextHearingDate.slice(0, 10)}
                        onChange={(e) => setNextHearingDate(e.target.value)}
                        className={T.field}
                    />
                </div>
            </div>

            <div className={T.section}>
                <label className={T.label}>
                    <PenLine size={12} className="inline ml-1 text-[#E6C673]/70" aria-hidden />
                    مجريات الدعوى
                </label>
                <textarea
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordProceedings}
                    value={proceedings}
                    onChange={(e) => setProceedings(e.target.value)}
                    rows={4}
                    placeholder="اكتب مجريات الجلسة والإجراءات التي تمت..."
                    className={`${T.field} min-h-[96px] sm:min-h-[120px] resize-none leading-relaxed`}
                />
            </div>

            <div className={T.section}>
                <label className={`${T.label} ${T.accentText}`}>
                    <Gavel size={12} className="inline ml-1 text-[#E6C673]" aria-hidden />
                    قرارات القاضي والطلبات
                </label>

                <div className="space-y-2.5 mb-2.5">
                    <p className="text-[10px] font-bold text-white/45">
                        قوالبك اليدوية — اضغط للإدراج في النص
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={templateDraft}
                            onChange={(e) => setTemplateDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onAddCustomTemplate();
                                }
                            }}
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordJudgeTemplateInput}
                            placeholder="مثال: تأجيل الدعوى لجلسة أخرى"
                            className={`${T.field} flex-1 py-2 text-[11px]`}
                        />
                        <button
                            type="button"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordJudgeTemplateAdd}
                            onClick={onAddCustomTemplate}
                            disabled={!normalizeJudgeDecisionTemplate(templateDraft)}
                            className="inline-flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/25 text-[#E6C673] text-[10px] font-bold hover:bg-[#E6C673]/20 transition-colors disabled:opacity-40 shrink-0 touch-manipulation"
                        >
                            <Plus size={12} aria-hidden />
                            إضافة قالب
                        </button>
                    </div>
                    {customTemplates.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {customTemplates.map((snippet) => (
                                <span
                                    key={snippet}
                                    className="inline-flex items-center max-w-full rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordJudgeTemplateChip(snippet)}
                                        onClick={() => onInsertJudgeLine(snippet)}
                                        className="px-2 py-1 text-white/55 hover:text-white/80 hover:bg-[#E6C673]/[0.06] transition-colors text-[9px] font-semibold truncate text-right"
                                        title={snippet}
                                    >
                                        {snippet}
                                    </button>
                                    <button
                                        type="button"
                                        data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordJudgeTemplateRemove(snippet)}
                                        onClick={() => onRemoveCustomTemplate(snippet)}
                                        className="px-1.5 py-1 text-white/25 hover:text-rose-300 hover:bg-rose-500/10 border-r border-white/[0.06] transition-colors shrink-0"
                                        aria-label={`حذف القالب ${snippet}`}
                                    >
                                        <X size={10} aria-hidden />
                                    </button>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] text-white/30">
                            لم تُضف قوالب بعد — احفظ عباراتك المتكررة لتسريع كتابة المحضر
                        </p>
                    )}
                </div>

                <label className={T.label}>
                    <PenLine size={12} className="inline ml-1 text-[#E6C673]/70" aria-hidden />
                    اكتب قرارات القاضي يدوياً
                </label>
                <textarea
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.sessionRecordJudgeDecisions}
                    value={judgeDecisions}
                    onChange={(e) => setJudgeDecisions(e.target.value)}
                    rows={4}
                    placeholder="اكتب قرارات وإجراءات القاضي في الجلسة بحرية..."
                    className={`${T.field} min-h-[96px] sm:min-h-[120px] resize-none leading-relaxed`}
                />
            </div>
        </div>
    );
});
