import React from 'react';
import {
    STATUS_TONE_CLASS,
    type CommunicationDisplayContext,
} from './communicationDecisionModel';

function DetailBlock({
    title,
    body,
    compact,
}: {
    title: string;
    body: string;
    compact?: boolean;
}) {
    if (!body.trim()) return null;
    return (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-right">
            <p className="text-[9px] font-bold text-slate-500">{title}</p>
            <p
                className={`mt-0.5 whitespace-pre-wrap leading-relaxed text-slate-100 ${
                    compact ? 'text-[11px]' : 'text-[12px]'
                }`}
            >
                {body}
            </p>
        </div>
    );
}

export function CommunicationContextPanel({
    ctx,
    compact = false,
    showMeta = true,
    detailLevel = 'summary',
}: {
    ctx: CommunicationDisplayContext;
    compact?: boolean;
    /** إخفاء شارة الحالة وتاريخ الكتاب عند عرضها في ترويسة البطاقة */
    showMeta?: boolean;
    /** summary = بطاقة انتظار؛ archive = سجل مكتمل */
    detailLevel?: 'summary' | 'archive';
}) {
    const detailsTitle =
        ctx.outcomeTitle === 'تفاصيل الطلب' ? 'تفاصيل المخاطبة' : ctx.outcomeTitle;
    const showArchive = detailLevel === 'archive';

    return (
        <div className={`space-y-1.5 ${compact ? '' : 'pt-0.5'}`}>
            {showMeta ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE_CLASS[ctx.statusTone]}`}
                    >
                        {ctx.statusLabel}
                    </span>
                    {ctx.letterDate ? (
                        <span className="text-[10px] text-slate-500">
                            تاريخ الكتاب: {ctx.letterDate}
                        </span>
                    ) : null}
                </div>
            ) : null}

            {showArchive ? (
                <>
                    <DetailBlock title="مضمون الكتاب" body={ctx.letterBody} compact={compact} />
                    {ctx.responseBody ? (
                        <>
                            {ctx.responseReference ? (
                                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-right">
                                    <p className="text-[9px] font-bold text-slate-500">
                                        مرجع الإجابة
                                    </p>
                                    <p className="mt-0.5 text-[11px] font-semibold text-slate-200">
                                        {ctx.responseReference}
                                    </p>
                                </div>
                            ) : null}
                            <DetailBlock
                                title="مضمون الإجابة"
                                body={ctx.responseBody}
                                compact={compact}
                            />
                        </>
                    ) : null}
                    {ctx.eventTrail.length > 0 ? (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-right">
                            <p className="text-[9px] font-bold text-slate-500">مسار الكتاب</p>
                            <ul className="mt-1.5 space-y-1.5">
                                {ctx.eventTrail.map((ev, idx) => (
                                    <li
                                        key={`${ev.date}:${ev.label}:${idx}`}
                                        className="rounded-md border border-white/[0.04] bg-black/20 px-2 py-1.5"
                                    >
                                        <div className="flex flex-row-reverse items-center justify-between gap-2">
                                            <span className="text-[10px] font-bold text-slate-200">
                                                {ev.label}
                                            </span>
                                            {ev.date ? (
                                                <span className="shrink-0 text-[9px] text-slate-500">
                                                    {ev.date}
                                                </span>
                                            ) : null}
                                        </div>
                                        {ev.detail ? (
                                            <p className="mt-0.5 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-400">
                                                {ev.detail}
                                            </p>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </>
            ) : (
                <>
                    {ctx.referenceLabel && ctx.referenceTitle !== 'تاريخ كتاب التأكيد' ? (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-right">
                            <p className="text-[9px] font-bold text-slate-500">
                                {ctx.referenceTitle || 'مرجع الإجابة'}
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold text-slate-200">
                                {ctx.referenceLabel}
                            </p>
                        </div>
                    ) : null}
                    <DetailBlock title={detailsTitle} body={ctx.outcomeBody} compact={compact} />
                </>
            )}
        </div>
    );
}
