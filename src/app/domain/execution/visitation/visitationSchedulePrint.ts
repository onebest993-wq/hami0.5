import type { VisitationScheduleConfig, VisitationSession } from '@/app/types/visitationSchedule';
import { formatVisitationSessionDateAr } from './visitationScheduleDateUtils';
import { getDecisionModeLabel, getVisitationFieldLabels } from './visitationScheduleLabels';

function escapeVisitationPrintHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export type VisitationBreachMemoInput = {
    session: VisitationSession;
    config: VisitationScheduleConfig;
    absentPartyLabel: string;
    creditorName: string;
    debtorName: string;
    childNames: string[];
    fileNumber?: string;
};

export function buildVisitationBreachMemoHtml(input: VisitationBreachMemoInput): string {
    const modeLabel = escapeVisitationPrintHtml(getDecisionModeLabel(input.config.decisionMode));
    const sessionDate = escapeVisitationPrintHtml(formatVisitationSessionDateAr(input.session));
    const labels = getVisitationFieldLabels(input.config.decisionMode);
    const locationLabel = escapeVisitationPrintHtml(labels.location);
    const location = escapeVisitationPrintHtml(input.config.location);
    const children = escapeVisitationPrintHtml(
        input.childNames.length > 0 ? input.childNames.join('، ') : '…………………………',
    );
    const creditorName = escapeVisitationPrintHtml(input.creditorName || '…………');
    const debtorName = escapeVisitationPrintHtml(input.debtorName || '…………');
    const absentPartyLabel = escapeVisitationPrintHtml(input.absentPartyLabel);
    const fileNumber = escapeVisitationPrintHtml(input.fileNumber || '…………');
    const startTime = escapeVisitationPrintHtml(input.config.startTime);
    const endTime = escapeVisitationPrintHtml(input.config.endTime);
    const returnTime = escapeVisitationPrintHtml(input.config.returnTime);
    const sleepoverNights = escapeVisitationPrintHtml(String(input.config.sleepoverNights ?? ''));
    const timeLine =
        input.config.decisionMode === 'viewing_pickup_sleepover'
            ? `وقت الاستلام: ${startTime} — ليالي المبيت: ${sleepoverNights} — وقت الإرجاع: ${returnTime}`
            : `${escapeVisitationPrintHtml(labels.startTime)}: ${startTime} — ${escapeVisitationPrintHtml(labels.endTime ?? 'وقت الإرجاع')}: ${endTime}`;

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>محضر نكول عن ${modeLabel}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 32px; line-height: 1.9; color: #111; }
  h1 { text-align: center; font-size: 20px; margin-bottom: 24px; }
  .meta { margin: 16px 0; }
  .box { border: 1px solid #333; padding: 16px; margin-top: 24px; min-height: 120px; }
  .sign { margin-top: 48px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<h1>محضر نكول عن (${modeLabel})</h1>
<div class="meta"><strong>رقم الإضبارة:</strong> ${fileNumber}</div>
<div class="meta"><strong>تاريخ الموعد:</strong> ${sessionDate}</div>
<div class="meta"><strong>${locationLabel}:</strong> ${location}</div>
<div class="meta"><strong>الأوقات:</strong> ${timeLine}</div>
<div class="meta"><strong>أسماء الأولاد:</strong> ${children}</div>
<div class="meta"><strong>الدائن:</strong> ${creditorName}</div>
<div class="meta"><strong>المدين:</strong> ${debtorName}</div>
<div class="box">
<p>بتاريخ الموعد المذكور أعلاه، حضر المنفذ العدل/ممثل مديرية التنفيذ إلى ${location} لتنفيذ قرار ${modeLabel}،
وقد تبيّن <strong>نكول / غياب ${absentPartyLabel}</strong> عن الحضور دون عذر مقبول وفق أحكام التنفيذ.</p>
<p>وعليه تم تنظيم هذا المحضر للاستفادة منه في الإجراءات القانونية اللاحقة.</p>
</div>
<div class="sign">
<span>توقيع المنفذ العدل: _______________</span>
<span>التاريخ: _______________</span>
</div>
</body>
</html>`;
}

export function openVisitationBreachMemoPrint(input: VisitationBreachMemoInput): void {
    if (typeof window === 'undefined') return;
    const html = buildVisitationBreachMemoHtml(input);
    const w = window.open('', '_blank', 'noopener,noreferrer,width=820,height=960');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.setTimeout(() => {
        try {
            w.print();
        } catch {
            /* ignore */
        }
    }, 400);
}
