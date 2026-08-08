import type { LawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import type { ExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import type { CriminalSparkContext } from '@/app/spark/context/criminalSparkContext';
import type { UrgentSparkContext } from '@/app/spark/context/urgentSparkContext';
import type { CalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import type { ExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';
import { analyzeExecutionCreationAlimony } from '@/app/spark/procedural/alimonyCreationSparkBridge';
import { runSparkCoherenceForExecutionCreation } from '@/app/spark/coherence/runSparkCoherenceForExecutionCreation';
import { runSparkCoherenceForExecutionOpen } from '@/app/spark/coherence/runSparkCoherenceForExecutionOpen';
import { runSparkCoherenceForLawsuit } from '@/app/spark/coherence/runSparkCoherenceForLawsuit';
import { runSparkCoherenceForCriminal } from '@/app/spark/coherence/runSparkCoherenceForCriminal';
import { runSparkCoherenceForUrgent } from '@/app/spark/coherence/runSparkCoherenceForUrgent';
import { runSparkCoherenceForCalendar } from '@/app/spark/coherence/runSparkCoherenceForCalendar';
import { coherenceReportToShellLines } from '@/app/spark/coherence/bridge/coherenceToSparkNudges';
import { verdictOutcomeLabel } from '@/app/components/lawyer/criminal-system/verdictCardsEngine';
import type { SparkTextAuditFieldType } from '@/app/spark/audit/types';

export type SparkShellReviewPayload = {
    text: string;
    fieldType: SparkTextAuditFieldType;
    caseNo?: string;
    court?: string;
};

const MIN_REVIEW_TEXT_LEN = 24;

function isReviewable(text: string): boolean {
    return text.trim().length >= MIN_REVIEW_TEXT_LEN;
}

export function buildLawsuitShellReviewPayload(ctx: LawsuitSparkContext): SparkShellReviewPayload | null {
    const stage = ctx.displayStage;
    const lines: string[] = [
        `حالة الإضبارة: ${ctx.status}`,
        `المرحلة: ${String(stage.stageName ?? stage.name ?? '').trim()}`,
        `الصفة: ${ctx.representedParty ?? 'غير محددة'}`,
    ];

    const events = ctx.timeline
        .filter((event) => !event.isDeleted)
        .slice(-16);

    for (const event of events) {
        const title = String(event.title ?? event.type ?? '').trim();
        const notes = String(event.notes ?? event.description ?? '').trim();
        const date = String(event.date ?? '').trim();
        const time = String(event.time ?? '').trim();
        const when = [date, time].filter(Boolean).join(' ');
        lines.push(`- [${when || 'بدون تاريخ'}] ${title}${notes ? `: ${notes}` : ''}`);
    }

    const coherenceReport = runSparkCoherenceForLawsuit(ctx);
    lines.push('', ...coherenceReportToShellLines(coherenceReport));

    const text = lines.join('\n').slice(0, 12_000);
    if (!isReviewable(text)) return null;

    const caseNo = ctx.dossierKey.replace(/^lawsuit:/, '');
    const court = String(stage.courtName ?? stage.court ?? '').trim();

    return {
        text,
        fieldType: 'note',
        caseNo: caseNo || undefined,
        court: court || undefined,
    };
}

export function buildExecutionShellReviewPayload(ctx: ExecutionSparkContext): SparkShellReviewPayload | null {
    const file = ctx.executionData;
    const s = ctx.signals;
    const lines: string[] = [
        `رقم الإضبارة: ${String(file.fileNumber ?? '').trim()}`,
        `نوع المطالبة: ${s.claimTypeLabel}`,
        `حالة التبليغ: ${s.globalStatus}`,
        `حالة دورة الحياة: ${ctx.lifecycleStatus}`,
        `الرصيد المتبقي: ${ctx.financialSignals?.effectiveRemainingIqd ?? s.remainingDebt}`,
        `ملاحظات: ${String(file.notes ?? '').trim()}`,
    ];

    if (s.primaryNoticeState) {
        lines.push(`إشارة التبليغ الحالية: ${s.primaryNoticeState}`);
    }

    if (ctx.financialSignals?.pendingSettlement) {
        const ps = ctx.financialSignals.pendingSettlement;
        lines.push(`تسوية معلّقة: ${ps.amount} د.ع — موعد ${ps.dueDate}`);
    }
    if (ctx.financialSignals?.settlementBreachTriggeredAt) {
        lines.push(`إخلال تسوية: ${ctx.financialSignals.settlementBreachTriggeredAt}`);
    }

    const coercive =
        ctx.runtimeOverlay?.activeCoerciveActions ??
        (Array.isArray(file.activeCoerciveActions) ? file.activeCoerciveActions : []);
    if (coercive.length) {
        lines.push(`إجراءات جبريّة فعّالة: ${coercive.join(' · ')}`);
    }

    for (const event of (file.timelineEvents ?? []).slice(-16)) {
        if (event.trashedAt) continue;
        const title = String(event.title ?? event.type ?? '').trim();
        const notes = String(event.description ?? event.details ?? '').trim();
        const date = String(event.date ?? '').trim();
        const deadline = String(event.deadlineDate ?? '').trim();
        lines.push(
            `- [${date || 'بدون تاريخ'}] ${title}${notes ? `: ${notes}` : ''}${deadline ? ` (مهلة: ${deadline})` : ''}`,
        );
    }

    const coherenceReport = runSparkCoherenceForExecutionOpen(ctx);
    lines.push('', ...coherenceReportToShellLines(coherenceReport));

    const text = lines.join('\n').slice(0, 12_000);
    if (!isReviewable(text)) return null;

    return {
        text,
        fieldType: 'note',
        caseNo: String(file.fileNumber ?? '').trim() || undefined,
        court: String((file as { court?: string }).court ?? '').trim() || undefined,
    };
}

export function buildCriminalShellReviewPayload(ctx: CriminalSparkContext): SparkShellReviewPayload | null {
    const lines = [
        `إضبارة جزائية: ${ctx.caseId}`,
        `أرشيف: ${ctx.isArchived ? 'نعم' : 'لا'}`,
        `مهلة المادة 3: ${ctx.shouldShowArticle3DeadlineBanner ? 'نعم' : 'لا'}`,
        `أيام المادة 3: ${ctx.article3ElapsedDays ?? '—'}`,
        `تمييز إلزامي: ${ctx.shouldShowMandatoryCassationBanner ? 'نعم' : 'لا'}`,
    ];

    for (const card of ctx.verdictCards.slice(-6)) {
        const outcome = verdictOutcomeLabel(card.outcome);
        const presence = card.presenceType ?? 'غير محدد';
        const draft = String(card.decisionDraft ?? '').trim().slice(0, 240);
        lines.push(
            `- حكم ${outcome} (${presence}) بتاريخ ${card.issuedAt || '—'}${draft ? `: ${draft}` : ''}`,
        );
        if (card.absentiaPublicationDate) {
            lines.push(`  نشر غيابي: ${card.absentiaPublicationDate}`);
        }
        if (card.absentiaObjectionDeadline) {
            lines.push(`  مهلة اعتراض: ${card.absentiaObjectionDeadline}`);
        }
    }

    const coherenceReport = runSparkCoherenceForCriminal(ctx);
    lines.push('', ...coherenceReportToShellLines(coherenceReport));

    const text = lines.join('\n').slice(0, 12_000);
    if (!isReviewable(text)) return null;

    return {
        text,
        fieldType: 'note',
        caseNo: ctx.caseId,
    };
}

export function buildUrgentShellReviewPayload(ctx: UrgentSparkContext): SparkShellReviewPayload | null {
    const lines = [
        `طلب مستعجل: ${ctx.caseLabel}`,
        `الحالة: ${ctx.fileStatus}`,
        `نهائي: ${ctx.isFinalized ? 'نعم' : 'لا'}`,
        `الخطوة النشطة: ${ctx.activeLifecycleStep ?? '—'}`,
        `قرار القاضي: ${String(ctx.judgeDecision?.decision ?? 'غير مسجل')}`,
        `تاريخ القرار: ${String(ctx.judgeDecision?.decisionDate ?? '—')}`,
        `تنفيذ — تاريخ: ${String(ctx.executionData?.executionDate ?? '—')}`,
        `تنفيذ — تبليغ: ${String(ctx.executionData?.notificationDate ?? '—')}`,
        `تظلم — تاريخ: ${String(ctx.grievanceData?.filingDate ?? '—')}`,
        `تظلم — نتيجة: ${String(ctx.grievanceData?.outcome ?? '—')}`,
        `تبليغ التظلم: ${ctx.grievanceDecisionNotificationConfirmed ? 'مؤكد' : 'غير مؤكد'}`,
        `تمييز — تاريخ: ${String(ctx.cassationData?.filingDate ?? '—')}`,
    ];

    const coherenceReport = runSparkCoherenceForUrgent(ctx);
    lines.push('', ...coherenceReportToShellLines(coherenceReport));

    const text = lines.join('\n').slice(0, 12_000);
    if (!isReviewable(text)) return null;

    return {
        text,
        fieldType: 'note',
        caseNo: ctx.caseLabel,
    };
}

export function buildCalendarShellReviewPayload(ctx: CalendarSparkContext): SparkShellReviewPayload | null {
    const deadlineEvents = ctx.allEvents
        .filter((event) => !event.isCompleted && (event.type === 'deadline' || event.source === 'deadline'))
        .slice(0, 8);

    if (!ctx.upcoming.length && !ctx.conflictDays.length && !deadlineEvents.length) return null;

    const lines = ['مواعيد قريبة في التقويم:'];
    for (const event of ctx.upcoming.slice(0, 8)) {
        const when = [event.date, event.time].filter(Boolean).join(' ');
        const court = event.court ?? event.location ?? 'بدون محكمة/مكان';
        const caseNo = event.caseNo?.trim() ? `رقم ${event.caseNo}` : 'بلا ربط برقم قضية';
        lines.push(`- [${when}] ${event.title} — ${court} — ${caseNo}`);
    }

    if (deadlineEvents.length > 0) {
        lines.push('', 'مهل قانونية في التقويم:');
        for (const event of deadlineEvents) {
            lines.push(`- ${event.date}: ${event.title}`);
        }
    }

    if (ctx.conflictDays.length > 0) {
        lines.push('', 'تضاربات/إثقال مكتشف:');
        for (const day of ctx.conflictDays.slice(0, 5)) {
            const summary =
                day.conflict.travelWarning ??
                day.conflict.warningMessage ??
                `تعارض في ${day.dateYmd}`;
            lines.push(`- ${day.dateYmd}: ${summary}`);
        }
    }

    const coherenceReport = runSparkCoherenceForCalendar(ctx);
    lines.push('', ...coherenceReportToShellLines(coherenceReport));

    const text = lines.join('\n').slice(0, 12_000);
    if (!isReviewable(text)) return null;

    return {
        text,
        fieldType: 'note',
    };
}

export function buildExecutionCreationShellReviewPayload(
    ctx: ExecutionCreationSparkContext,
): SparkShellReviewPayload | null {
    const effectiveTypes =
        ctx.activeClaimTypes.length > 0
            ? ctx.activeClaimTypes
            : ctx.claimType
              ? [ctx.claimType]
              : [];

    const lines: string[] = [
        `مسودة إنشاء تنفيذ`,
        `مديرية: ${String(ctx.directorate ?? '').trim() || '—'}`,
        `رقم الإضبارة: ${String(ctx.fileNumber ?? '').trim() || '—'}`,
        `نوع السند: ${String(ctx.docType ?? '').trim() || '—'}`,
        `التصنيف: ${String(ctx.classification ?? '').trim() || '—'}`,
        `المطالبات: ${effectiveTypes.join(' + ') || ctx.claimType || '—'}`,
        `المبلغ الإجمالي: ${String(ctx.totalAmount ?? '').trim() || '—'}`,
        `سند محجوب: ${ctx.isDocumentBlocked ? 'نعم' : 'لا'}`,
    ];

    if (ctx.debtors[0]) {
        lines.push(
            `المدين: ${ctx.debtors[0].name || '—'} — عنوان: ${ctx.debtors[0].address || 'ناقص'}`,
        );
    }

    const alimonyAnalysis = analyzeExecutionCreationAlimony(ctx);
    const coherenceReport = runSparkCoherenceForExecutionCreation(ctx);
    lines.push('', ...coherenceReportToShellLines(coherenceReport));

    if (ctx.alimony && alimonyAnalysis) {
        lines.push('', '--- تحليل النفقة السياقي ---');
        lines.push(`تماسك السياق: ${alimonyAnalysis.coherenceScore}%`);
        lines.push(`اكتمال البيانات: ${alimonyAnalysis.completeness}%`);
        lines.push(alimonyAnalysis.synthesis);
        lines.push(alimonyAnalysis.timelineNarrative);
        for (const f of alimonyAnalysis.findings.slice(0, 6)) {
            lines.push(`• [${f.severity}] ${f.observation}`);
        }
        for (const inf of alimonyAnalysis.inferences.slice(0, 4)) {
            lines.push(`→ ${inf.conclusion}`);
        }
        if (ctx.alimony.calculated) {
            const c = ctx.alimony.calculated;
            lines.push(
                `محرك الحاسبة: متراكم ${c.totalAccumulated} د.ع — شهري ${c.monthlyOngoing} د.ع`,
            );
        }
    }

    const text = lines.join('\n').slice(0, 12_000);
    if (!isReviewable(text)) return null;

    return {
        text,
        fieldType: 'note',
        caseNo: String(ctx.fileNumber ?? '').trim() || undefined,
        court: String(ctx.directorate ?? '').trim() || undefined,
    };
}
