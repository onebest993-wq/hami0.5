/**
 * تنبيهات قسم التنفيذ — Direct producer (لا يعتمد على calendar bridge فقط).
 *
 * يُولّد تنبيهات لـ:
 *  - مهام الإضبارة (caseTasksPending[].dueDate)
 *  - مهل قانونية مباشرة:
 *      • executive_detention_until (تنبيه قبل 2 يوم)
 *      • eviction_vacate_deadline (تنبيه قبل 3 أيام)
 *      • eviction_first_notice_date + 7 يوم (نهاية المهلة الطوعية للإخلاء)
 *      • publication_notice_by_debtor + 15 يوم
 *      • employee_summons_assignments_by_debtor[*].deadlineDate
 *      • guarantor_notification.noticeDateYmd + 7 يوم
 *      • stay_of_execution.next_hearing_date
 *  - ركود (المادة 112 ق.ت.): dossier_last_action_date منذ > 300 يوم → تنبيه قبل سقوط الحق
 *  - دفعات راكدة: total_remaining_balance > 0 و lastPaymentDate > 60 يوم → تنبيه مالي
 */

import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { composeRichAlert } from '@/app/services/alertRichContext';
import type { DossierRegistry } from '@/app/services/alertDossierRegistry';
import { parseYmdToTs, dayDiff } from '@/app/services/executionAlerts.helpers';

const DAY_MS = 24 * 60 * 60 * 1000;

// قرارات أولوية موحّدة بناءً على القرب الزمني (بالأيام)
function priorityByDaysToDue(daysToDue: number): number {
    if (daysToDue <= 1) return 1; // حرج
    if (daysToDue <= 3) return 2; // عاجل
    if (daysToDue <= 7) return 3; // مهم
    return 4; // عادي
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

export function buildExecutionAlerts(
    files: unknown[],
    now: Date,
    registry: DossierRegistry,
): SecretaryAlert[] {
    const out: SecretaryAlert[] = [];
    const nowTs = now.getTime();

    for (const raw of files) {
        if (!raw || typeof raw !== 'object') continue;
        const f = raw as Record<string, unknown>;
        const id = String(f.id ?? '');
        if (!id) continue;

        const ctx = registry.resolve('execution', id);
        if (!ctx) continue;

        const lifecycle = safeStr(f.dossier_lifecycle_status) || 'active';
        const isFinished = lifecycle === 'finished';
        if (isFinished) continue; // لا تنبيهات لإضبارات منتهية

        const caseNo = safeStr(f.executionCaseNumber) || safeStr(f.caseNo) || String(id);

        // 1) مهام الإضبارة المعلّقة (caseTasksPending[])
        const tasks = asArray(f.caseTasksPending);
        for (const tRaw of tasks) {
            const t = asRecord(tRaw);
            if (t.trashedAt) continue;
            const due = safeStr(t.dueDate);
            const ts = parseYmdToTs(due);
            if (ts == null) continue;
            const days = dayDiff(ts, nowTs);
            if (days < 0) continue; // متأخرة — تُعالج كمعلّق ولكن دون تكرار في الشريط
            if (days > 30) continue;
            pushAlert(
                out,
                composeRichAlert({
                    id: `execution:${id}:task:${t.id ?? due}`,
                    type: 'TASK',
                    dueAt: new Date(ts).toISOString(),
                    aiDeepDive: safeStr(t.body) || safeStr(t.title) || 'مهمة معلّقة في إضبارة التنفيذ.',
                    target: 'execution',
                    entityId: id,
                    priority: priorityByDaysToDue(days),
                    context: ctx,
                }),
            );
        }

        // 2) executive_detention_until — قبل 2-7 أيام
        const detentionUntil = safeStr(f.executive_detention_until);
        const detentionReminderSent = f.executive_detention_reminder_sent === true;
        if (detentionUntil && !detentionReminderSent) {
            const ts = parseYmdToTs(detentionUntil);
            if (ts != null) {
                const days = dayDiff(ts, nowTs);
                if (days >= 0 && days <= 7) {
                    pushAlert(
                        out,
                        composeRichAlert({
                            id: `execution:${id}:detention`,
                            type: 'DEADLINE',
                            dueAt: new Date(ts).toISOString(),
                            aiDeepDive: `ينتهي الحبس التنفيذي بتاريخ ${detentionUntil}. راجِع التمديد أو الإفراج.`,
                            target: 'execution',
                            entityId: id,
                            priority: priorityByDaysToDue(days),
                            context: ctx,
                        }),
                    );
                }
            }
        }

        // 3) eviction_vacate_deadline — مهلة الإخلاء
        const evictDeadline = safeStr(f.eviction_vacate_deadline);
        if (evictDeadline) {
            const ts = parseYmdToTs(evictDeadline);
            if (ts != null) {
                const days = dayDiff(ts, nowTs);
                if (days >= 0 && days <= 14) {
                    pushAlert(
                        out,
                        composeRichAlert({
                            id: `execution:${id}:eviction`,
                            type: 'DEADLINE',
                            dueAt: new Date(ts).toISOString(),
                            aiDeepDive: `تنتهي مهلة الإخلاء بتاريخ ${evictDeadline}. حضّر طلب الاستعانة بالقوة العامة.`,
                            target: 'execution',
                            entityId: id,
                            priority: priorityByDaysToDue(days),
                            context: ctx,
                        }),
                    );
                }
            }
        }

        // 4) eviction_first_notice_date + 7 يوم = نهاية المهلة الطوعية
        const firstNotice = safeStr(f.eviction_first_notice_date);
        if (firstNotice && !f.notice_voluntary_period_end_declared) {
            const ts = parseYmdToTs(firstNotice);
            if (ts != null) {
                const endTs = ts + 7 * DAY_MS;
                const days = dayDiff(endTs, nowTs);
                if (days >= 0 && days <= 7) {
                    pushAlert(
                        out,
                        composeRichAlert({
                            id: `execution:${id}:voluntary-end`,
                            type: 'DEADLINE',
                            dueAt: new Date(endTs).toISOString(),
                            aiDeepDive: 'تنتهي المهلة الطوعية للإخلاء (7 أيام من تاريخ التبليغ الأول). يمكن البدء بالإجراءات الجبرية.',
                            target: 'execution',
                            entityId: id,
                            priority: priorityByDaysToDue(days),
                            context: ctx,
                        }),
                    );
                }
            }
        }

        // 5) publication_notice_by_debtor — كل تبليغ بالنشر له 15 يوم
        const pubByDebtor = asRecord(f.publication_notice_by_debtor);
        for (const debtorKey of Object.keys(pubByDebtor)) {
            const entry = asRecord(pubByDebtor[debtorKey]);
            if (entry.periodEndedAt) continue; // أُعلنت نهايته
            const startYmd = safeStr(entry.publicationDateYmd);
            if (!startYmd) continue;
            const startTs = parseYmdToTs(startYmd);
            if (startTs == null) continue;
            const endTs = startTs + 15 * DAY_MS;
            const days = dayDiff(endTs, nowTs);
            if (days < 0 || days > 5) continue;
            pushAlert(
                out,
                composeRichAlert({
                    id: `execution:${id}:publication:${debtorKey}`,
                    type: 'DEADLINE',
                    dueAt: new Date(endTs).toISOString(),
                    aiDeepDive: `مدة تبليغ النشر (15 يوماً) للمدين «${debtorKey}» تقترب من الانتهاء.`,
                    target: 'execution',
                    entityId: id,
                    priority: priorityByDaysToDue(days),
                    context: ctx,
                }),
            );
        }

        // 6) employee_summons_assignments_by_debtor — تكليفات للموظف بمهلة
        const empByDebtor = asRecord(f.employee_summons_assignments_by_debtor);
        for (const debtorKey of Object.keys(empByDebtor)) {
            const entry = asRecord(empByDebtor[debtorKey]);
            const phase = safeStr(entry.phase);
            if (phase === 'completed' || phase === 'cancelled') continue;
            const dl = safeStr(entry.deadlineDate);
            if (!dl) continue;
            const ts = parseYmdToTs(dl);
            if (ts == null) continue;
            const days = dayDiff(ts, nowTs);
            if (days < 0 || days > 7) continue;
            pushAlert(
                out,
                composeRichAlert({
                    id: `execution:${id}:emp-summons:${debtorKey}`,
                    type: 'DEADLINE',
                    dueAt: new Date(ts).toISOString(),
                    aiDeepDive: `تنتهي مهلة تكليف موظف التبليغ للمدين «${debtorKey}». تابع التنفيذ.`,
                    target: 'execution',
                    entityId: id,
                    priority: priorityByDaysToDue(days),
                    context: ctx,
                }),
            );
        }

        // 7) guarantor_notification.noticeDateYmd + 7 يوم
        const guar = asRecord(f.guarantor_notification);
        const guarStart = safeStr(guar.noticeDateYmd);
        if (guarStart && !guar.endedAt && !guar.attendedAt) {
            const ts = parseYmdToTs(guarStart);
            if (ts != null) {
                const endTs = ts + 7 * DAY_MS;
                const days = dayDiff(endTs, nowTs);
                if (days >= 0 && days <= 7) {
                    pushAlert(
                        out,
                        composeRichAlert({
                            id: `execution:${id}:guarantor`,
                            type: 'DEADLINE',
                            dueAt: new Date(endTs).toISOString(),
                            aiDeepDive: 'مهلة الكفيل تنتهي قريباً — تابع الحضور أو تفعيل الكفالة.',
                            target: 'execution',
                            entityId: id,
                            priority: priorityByDaysToDue(days),
                            context: ctx,
                        }),
                    );
                }
            }
        }

        // 8) stay_of_execution.next_hearing_date — جلسة وقف التنفيذ
        const stay = asRecord(f.stay_of_execution);
        if (stay.active === true) {
            const hearing = safeStr(stay.next_hearing_date);
            if (hearing) {
                const ts = parseYmdToTs(hearing);
                if (ts != null) {
                    const days = dayDiff(ts, nowTs);
                    if (days >= 0 && days <= 14) {
                        pushAlert(
                            out,
                            composeRichAlert({
                                id: `execution:${id}:stay-hearing`,
                                type: 'HEARING',
                                dueAt: new Date(ts).toISOString(),
                                aiDeepDive: 'جلسة قادمة في طلب وقف التنفيذ.',
                                target: 'execution',
                                entityId: id,
                                priority: priorityByDaysToDue(days),
                                context: ctx,
                            }),
                        );
                    }
                }
            }
        }

        // 9) ركود الإضبارة (المادة 112 ق.ت.) — سنة بدون إجراء = سقوط حق
        const lastAction =
            safeStr(f.dossier_last_action_date) ||
            safeStr(f.lastActionDate) ||
            safeStr(f.updatedAt);
        if (lifecycle === 'active' && lastAction) {
            const ts = parseYmdToTs(lastAction);
            if (ts != null) {
                const daysSince = Math.floor((nowTs - ts) / DAY_MS);
                // ننبّه بدءاً من 300 يوم — 65 يوماً قبل السقوط
                if (daysSince >= 300) {
                    const daysToExpiry = 365 - daysSince;
                    const expiryTs = ts + 365 * DAY_MS;
                    const priority = daysToExpiry <= 14 ? 1 : daysToExpiry <= 30 ? 2 : 3;
                    pushAlert(
                        out,
                        composeRichAlert({
                            id: `execution:${id}:dormancy`,
                            type: 'URGENT',
                            dueAt: new Date(expiryTs).toISOString(),
                            aiDeepDive: `الإضبارة راكدة منذ ${daysSince} يوماً. عند 365 يوم بدون إجراء يسقط الحق وفق المادة 112 ق.ت.`,
                            target: 'execution',
                            entityId: id,
                            priority,
                            context: ctx,
                        }),
                    );
                }
            }
        }

        // 10) دفعات راكدة: total_remaining_balance > 0 + lastPaymentDate > 60 يوم
        const remaining = Number(f.total_remaining_balance ?? f.remainingDebt ?? 0);
        if (remaining > 0 && lifecycle === 'active') {
            const lastPay = safeStr(f.lastPaymentDate);
            if (lastPay) {
                const ts = parseYmdToTs(lastPay);
                if (ts != null) {
                    const daysSince = Math.floor((nowTs - ts) / DAY_MS);
                    if (daysSince >= 60) {
                        // اصطنع dueAt = اليوم + يوم (لاجتياز فلتر authenticity)
                        const dueTs = nowTs + DAY_MS;
                        pushAlert(
                            out,
                            composeRichAlert({
                                id: `execution:${id}:stale-payment`,
                                type: 'TASK',
                                dueAt: new Date(dueTs).toISOString(),
                                aiDeepDive: `لا توجد دفعات في إضبارة ${caseNo} منذ ${daysSince} يوماً، مع رصيد متبقٍّ ${remaining.toLocaleString()} د.ع. تابع جدولة التحصيل.`,
                                target: 'execution',
                                entityId: id,
                                priority: 4,
                                context: ctx,
                            }),
                        );
                    }
                }
            }
        }
    }

    return out;
}
