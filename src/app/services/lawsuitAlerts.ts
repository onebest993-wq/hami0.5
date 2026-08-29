/**
 * تنبيهات قسم الدعاوى المدنية — Direct producer.
 *
 * يُولّد تنبيهات لـ:
 *  - الإضبارات المعطّلة (status === 'paused'): تنبيه بناءً على stayReviewDate
 *  - مهل الطعن في المراحل: CaseStage.legalTimers.* + CaseStage.appealDeadline
 *  - تواريخ نظر مستقبلية: FileData.nextDate
 *  - tasks بـ dueDate غير مرتبطة بـ calendar
 *  - الإضبارات الراكدة (لا نشاط منذ > 90 يوم) — بناءً على آخر history/notes
 */

import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { composeRichAlert } from '@/app/services/alertRichContext';
import type { DossierRegistry } from '@/app/services/alertDossierRegistry';
import { parseYmdToTs, dayDiff } from '@/app/services/executionAlerts.helpers';

const DAY_MS = 24 * 60 * 60 * 1000;
const DORMANCY_DAYS = 90;

function priorityByDaysToDue(days: number): number {
    if (days <= 1) return 1;
    if (days <= 3) return 2;
    if (days <= 7) return 3;
    return 4;
}

function safeStr(v: unknown): string {
    return typeof v === 'string' ? v.trim() : '';
}

function asArray(v: unknown): unknown[] {
    return Array.isArray(v) ? v : [];
}

function asRecord(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function pushAlert(out: SecretaryAlert[], a: SecretaryAlert | null): void {
    if (a) out.push(a);
}

/** اشتقاق آخر تاريخ نشاط من history/notes (لمعرفة الركود). */
function lastLawsuitActivityTs(f: FileData): number | null {
    let max: number | null = null;
    const consider = (v: unknown) => {
        const t = parseYmdToTs(v);
        if (t != null && (max === null || t > max)) max = t;
    };

    consider(f.date);
    consider((f as unknown as Record<string, unknown>).nextDate);
    consider((f as unknown as Record<string, unknown>).firstHearingDate);
    consider((f as unknown as Record<string, unknown>).stayReviewDate);
    for (const h of asArray(f.history)) consider(asRecord(h).date);
    for (const n of asArray(f.notes)) {
        const rec = asRecord(n);
        consider(rec.date);
        consider(rec.apptDate);
    }
    return max;
}

/** بناء تنبيهات لمرحلة واحدة (CaseStage). */
function buildStageAlerts(
    stage: Record<string, unknown>,
    stageIndex: number,
    f: FileData,
    now: number,
    ctx: ReturnType<DossierRegistry['resolve']>,
): SecretaryAlert[] {
    if (!ctx) return [];
    const out: SecretaryAlert[] = [];
    const stageStatus = safeStr(stage.status);
    if (stageStatus === 'locked' || stageStatus === 'completed' || stage.isVoided === true) {
        return out;
    }

    const stageName = safeStr(stage.stageName) || safeStr(stage.name);
    const fileId = String(f.id);

    const recordDeadline = (
        label: string,
        kind: 'appeal' | 'cassation' | 'review' | 'finalAppeal' | 'defaultObjection',
        ymd: string,
    ) => {
        const ts = parseYmdToTs(ymd);
        if (ts == null) return;
        const days = dayDiff(ts, now);
        if (days < 0 || days > 30) return;
        pushAlert(
            out,
            composeRichAlert({
                id: `lawsuit:${fileId}:stage-${stageIndex}:${kind}`,
                type: 'DEADLINE',
                dueAt: new Date(ts).toISOString(),
                aiDeepDive: `${label}${stageName ? ` — ${stageName}` : ''}. لا تفوّت الموعد.`,
                target: 'lawsuit',
                entityId: fileId,
                priority: priorityByDaysToDue(days),
                context: ctx,
            }),
        );
    };

    // legalTimers (المصدر الأغنى)
    const timers = asRecord(stage.legalTimers);
    recordDeadline('مهلة الاستئناف', 'appeal', safeStr(timers.appealDeadline));
    recordDeadline('مهلة التمييز', 'cassation', safeStr(timers.cassationDeadline));
    recordDeadline('مهلة إعادة المحاكمة', 'review', safeStr(timers.reviewDeadline));
    recordDeadline('مهلة الطعن النهائي', 'finalAppeal', safeStr(timers.finalAppealDeadline));
    recordDeadline('مهلة الاعتراض على القرار الغيابي', 'defaultObjection', safeStr(timers.defaultObjectionDeadline));

    // appealDeadline على المرحلة (مكرّر للحماية إن لم تكن legalTimers موجودة)
    if (!timers.appealDeadline) {
        const direct = safeStr(stage.appealDeadline);
        if (direct) recordDeadline('مهلة الاستئناف', 'appeal', direct);
    }

    return out;
}

export function buildLawsuitAlerts(
    files: FileData[],
    now: Date,
    registry: DossierRegistry,
): SecretaryAlert[] {
    const out: SecretaryAlert[] = [];
    const nowTs = now.getTime();

    for (const f of files) {
        if (!f) continue;
        if (f.type !== 'lawsuit') continue;
        if (f.status === 'deleted') continue;

        const fileId = String(f.id);
        const ctx = registry.resolve('lawsuit', fileId);
        if (!ctx) continue;

        // 1) إضبارة معطّلة بـ stayReviewDate قادم
        if (f.status === 'paused') {
            const reviewStr = safeStr((f as unknown as Record<string, unknown>).stayReviewDate);
            if (reviewStr) {
                const ts = parseYmdToTs(reviewStr);
                if (ts != null) {
                    const days = dayDiff(ts, nowTs);
                    if (days >= 0 && days <= 14) {
                        pushAlert(
                            out,
                            composeRichAlert({
                                id: `lawsuit:${fileId}:stay-review`,
                                type: 'URGENT',
                                dueAt: new Date(ts).toISOString(),
                                aiDeepDive: `موعد مراجعة وقف الإضبارة قريب${f.stayReason ? `: ${f.stayReason}` : '.'}`,
                                target: 'lawsuit',
                                entityId: fileId,
                                priority: priorityByDaysToDue(days),
                                context: ctx,
                            }),
                        );
                    }
                }
            }
        }

        // 2) nextDate / firstHearingDate — تاريخ نظر مستقبلي قريب (في حال لم يُسجّل في calendar)
        const fileRec = f as unknown as Record<string, unknown>;
        const nextDateStr = safeStr(fileRec.nextDate) || safeStr(fileRec.firstHearingDate);
        if (nextDateStr) {
            const ts = parseYmdToTs(nextDateStr);
            if (ts != null) {
                const days = dayDiff(ts, nowTs);
                if (days >= 0 && days <= 14) {
                    pushAlert(
                        out,
                        composeRichAlert({
                            id: `lawsuit:${fileId}:next-date`,
                            type: 'HEARING',
                            dueAt: new Date(ts).toISOString(),
                            aiDeepDive: 'موعد قادم على ملف الدعوى.',
                            target: 'lawsuit',
                            entityId: fileId,
                            priority: priorityByDaysToDue(days),
                            context: ctx,
                        }),
                    );
                }
            }
        }

        // 3) tasks بـ dueDate
        for (const taskRaw of asArray(f.tasks)) {
            const t = asRecord(taskRaw);
            if (t.completed === true) continue;
            const due = safeStr(t.dueDate);
            const ts = parseYmdToTs(due);
            if (ts == null) continue;
            const days = dayDiff(ts, nowTs);
            if (days < 0 || days > 30) continue;
            pushAlert(
                out,
                composeRichAlert({
                    id: `lawsuit:${fileId}:task:${t.id ?? due}`,
                    type: 'TASK',
                    dueAt: new Date(ts).toISOString(),
                    aiDeepDive: safeStr(t.description) || safeStr(t.title) || 'مهمة على ملف الدعوى.',
                    target: 'lawsuit',
                    entityId: fileId,
                    priority: priorityByDaysToDue(days),
                    context: ctx,
                }),
            );
        }

        // 4) stages — مهل الطعن
        const stages = asArray((f as unknown as Record<string, unknown>).stages);
        stages.forEach((stRaw, idx) => {
            const st = asRecord(stRaw);
            const stageAlerts = buildStageAlerts(st, idx, f, nowTs, ctx);
            for (const a of stageAlerts) out.push(a);
        });

        // 5) الركود (> 90 يوم بلا نشاط) للإضبارات النشطة
        if (f.status === 'active') {
            const last = lastLawsuitActivityTs(f);
            if (last != null) {
                const daysSince = Math.floor((nowTs - last) / DAY_MS);
                if (daysSince >= DORMANCY_DAYS) {
                    const dueTs = nowTs + DAY_MS;
                    pushAlert(
                        out,
                        composeRichAlert({
                            id: `lawsuit:${fileId}:dormancy`,
                            type: 'TASK',
                            dueAt: new Date(dueTs).toISOString(),
                            aiDeepDive: `الإضبارة بدون نشاط منذ ${daysSince} يوماً. تحقق من المرحلة الحالية أو حدّد جلسة جديدة.`,
                            target: 'lawsuit',
                            entityId: fileId,
                            priority: 4,
                            context: ctx,
                        }),
                    );
                }
            }
        }
    }

    return out;
}
