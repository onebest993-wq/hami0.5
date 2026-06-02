/**
 * Audit Log Publisher — خدمة مركزية لنشر أحداث "ما حدث" إلى NotificationStore.
 *
 * فلسفة المنتج:
 *  - يسجّل كل **إجراء ذي قيمة** (تغيير حالة، إنشاء، إنجاز، تسجيل دفعة، ...)
 *  - لا يسجّل **التنقّلات** (فتح شاشة، ضغطة بدون أثر، تكبير، ...)
 *  - "ذكاء": Dedupe ضمن نافذة زمنية (نفس الحدث خلال 30 ثانية لا يُكرَّر)
 *
 * الـ Stores تستدعي publish*() عند الأحداث المهمة.
 * NotificationPanel يقرأها كـ Audit Log زمني.
 *
 * هذا الـ publisher لا يحلّ محل SecretaryAlerts (تلك للأفعال المستقبلية القادمة).
 */

import { useNotificationStore } from '@/app/stores/notificationStore';
import type {
    NotificationCategory,
    NotificationDirection,
    NotificationModel,
    NotificationType,
} from '@/app/infrastructure/NotificationRepository';

// ============================================================
// Dedupe + Throttling (الذكاء)
// ============================================================

/**
 * نافذة الـ dedupe (ms). إذا تكرّر نفس الحدث (نفس dedupeKey) خلال هذه الفترة،
 * لا يُنشَر إشعار جديد — يمنع الإغراق عند:
 *   - sync متعدد لنفس البيانات
 *   - HMR في dev mode
 *   - أحداث realtime متتابعة من supabase
 *   - حلقات set/persist في zustand
 */
const DEDUPE_WINDOW_MS = 30_000;

/** آخر زمن نشر لكل dedupeKey (in-memory cache). */
const dedupeCache = new Map<string, number>();

function shouldDedupe(dedupeKey: string | undefined, now: number): boolean {
    if (!dedupeKey) return false;
    const lastTs = dedupeCache.get(dedupeKey);
    if (lastTs && now - lastTs < DEDUPE_WINDOW_MS) return true;
    dedupeCache.set(dedupeKey, now);
    // التنظيف الكسول: لو كبر cache > 200 مدخل، احذف القديمة
    if (dedupeCache.size > 200) {
        const cutoff = now - DEDUPE_WINDOW_MS * 4;
        for (const [k, ts] of dedupeCache) {
            if (ts < cutoff) dedupeCache.delete(k);
        }
    }
    return false;
}

/** للاختبار: تنظيف الـ cache بين الـ runs. */
export function _resetAuditLogDedupe(): void {
    dedupeCache.clear();
}

// ============================================================
// Generic publisher
// ============================================================
interface PublishParams {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    /**
     * اتجاه الحدث (وارد/صادر). إن لم يُعطَ، يُشتق من الفئة:
     *  - civil/criminal/execution/task/document → outgoing (فعل المحامي)
     *  - forum/system/ai → incoming (وصل من خارج)
     */
    direction?: NotificationDirection;
    actionPayload?: Record<string, unknown>;
    /**
     * مفتاح للـ dedupe. لو وُجد إشعار آخر بنفس الـ key خلال 30s، يُتجاهَل.
     * مثال: `civil:case-create:case-123` — نمنع إنشاء نفس القضية من النشر مرّتين.
     */
    dedupeKey?: string;
}

function defaultDirectionForCategory(c: NotificationCategory): NotificationDirection {
    switch (c) {
        case 'civil':
        case 'criminal':
        case 'execution':
        case 'task':
        case 'document':
            return 'outgoing';
        case 'forum':
        case 'system':
        case 'ai':
            return 'incoming';
        default:
            return 'incoming';
    }
}

function makeId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function publish(params: PublishParams): NotificationModel | null {
    const now = Date.now();
    if (shouldDedupe(params.dedupeKey, now)) return null;

    const direction = params.direction ?? defaultDirectionForCategory(params.category);
    const notif: NotificationModel = {
        id: makeId(params.category),
        title: params.title,
        message: params.message,
        type: params.type,
        category: params.category,
        direction,
        isRead: false,
        actionPayload: params.actionPayload,
        createdAt: new Date(now).toISOString(),
    };
    try {
        useNotificationStore.getState().addNotification(notif);
    } catch {
        // لا نريد أن نُعطّل الـ flow الأصلي لو فشل النشر
    }
    return notif;
}

// ============================================================
// Civil (lawsuit) events
// ============================================================
export const AuditLog = {
    civil: {
        caseCreated(p: { caseId: string | number; caseNo: string; clientName?: string }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'تم إنشاء دعوى مدنية',
                message: `${p.caseNo}${p.clientName ? ` — ${p.clientName}` : ''}`,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `civil:case-create:${p.caseId}`,
            });
        },
        stageAdded(p: { caseId: string | number; caseNo: string; stageName: string }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'تمت إضافة مرحلة للدعوى',
                message: `${p.caseNo}: ${p.stageName}`,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `civil:stage-add:${p.caseId}:${p.stageName}`,
            });
        },
        stageAdvanced(p: {
            caseId: string | number;
            caseNo: string;
            fromStage: string;
            toStage: string;
        }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'تقدمت الدعوى لمرحلة جديدة',
                message: `${p.caseNo} • من ${p.fromStage} إلى ${p.toStage}`,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `civil:stage-advance:${p.caseId}:${p.toStage}`,
            });
        },
        decisionRecorded(p: { caseId: string | number; caseNo: string; decision: string }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'تم تسجيل قرار في الدعوى',
                message: `${p.caseNo}: ${p.decision}`,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `civil:decision:${p.caseId}:${p.decision.slice(0, 30)}`,
            });
        },
        hearingPostponed(p: { caseId: string | number; caseNo: string; nextDate: string }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'تم تأجيل جلسة',
                message: `${p.caseNo} → ${p.nextDate}`,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `civil:postpone:${p.caseId}:${p.nextDate}`,
            });
        },
        hearingAdded(p: { caseId: string | number; caseNo: string; date: string; title?: string }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: p.title ? `تمت إضافة: ${p.title}` : 'تمت إضافة موعد للدعوى',
                message: `${p.caseNo} • ${p.date}`,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `civil:hearing-add:${p.caseId}:${p.date}`,
            });
        },
        taskAdded(p: { caseId: string | number; caseNo: string; title: string; dueDate?: string }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'مهمة جديدة في الدعوى',
                message: `${p.caseNo} • ${p.title}${p.dueDate ? ` (${p.dueDate})` : ''}`,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `civil:task-add:${p.caseId}:${p.title}:${p.dueDate ?? ''}`,
            });
        },
        taskCompleted(p: { caseId: string | number; caseNo: string; title: string }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'إنجاز مهمة في الدعوى',
                message: `${p.caseNo} • ${p.title}`,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `civil:task-done:${p.caseId}:${p.title}`,
            });
        },
        appealFiled(p: {
            caseId: string | number;
            caseNo: string;
            appealType: 'استئناف' | 'تمييز' | 'إعادة محاكمة' | 'اعتراض غيابي' | string;
        }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: `تم تقديم ${p.appealType}`,
                message: p.caseNo,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `civil:appeal:${p.caseId}:${p.appealType}`,
            });
        },
        statusChanged(p: {
            caseId: string | number;
            caseNo: string;
            fromStatus: string;
            toStatus: string;
        }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'تم تغيير حالة الدعوى',
                message: `${p.caseNo} • ${p.fromStatus} → ${p.toStatus}`,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `civil:status:${p.caseId}:${p.toStatus}`,
            });
        },
        archived(p: { caseId: string | number; caseNo: string }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'تم أرشفة الدعوى',
                message: p.caseNo,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `civil:archive:${p.caseId}`,
            });
        },
    },

    // ============================================================
    // Criminal events
    // ============================================================
    criminal: {
        caseCreated(p: { caseId: string; caseNo?: string; clientName?: string }) {
            return publish({
                type: 'audit_log_criminal',
                category: 'criminal',
                title: 'تم إنشاء قضية جزائية',
                message: `${p.caseNo ?? p.caseId}${p.clientName ? ` — ${p.clientName}` : ''}`,
                actionPayload: { criminalId: p.caseId },
                dedupeKey: `criminal:create:${p.caseId}`,
            });
        },
        sessionAdded(p: { caseId: string; sessionDate: string }) {
            return publish({
                type: 'audit_log_criminal',
                category: 'criminal',
                title: 'تمت إضافة جلسة جزائية',
                message: `جلسة ${p.sessionDate}`,
                actionPayload: { criminalId: p.caseId },
                dedupeKey: `criminal:session-add:${p.caseId}:${p.sessionDate}`,
            });
        },
        statementAdded(p: { caseId: string; person: string; kind: string }) {
            return publish({
                type: 'audit_log_criminal',
                category: 'criminal',
                title: `تم تدوين ${p.kind}`,
                message: p.person,
                actionPayload: { criminalId: p.caseId },
                dedupeKey: `criminal:statement:${p.caseId}:${p.person}:${p.kind}`,
            });
        },
        verdictIssued(p: { caseId: string; verdict: string }) {
            return publish({
                type: 'audit_log_criminal',
                category: 'criminal',
                title: 'صدر حكم جزائي',
                message: p.verdict,
                actionPayload: { criminalId: p.caseId },
                dedupeKey: `criminal:verdict:${p.caseId}`,
            });
        },
        appealFiled(p: { caseId: string; kind: 'تمييز' | 'استئناف' | string }) {
            return publish({
                type: 'audit_log_criminal',
                category: 'criminal',
                title: `تم تقديم ${p.kind}`,
                message: `قضية ${p.caseId}`,
                actionPayload: { criminalId: p.caseId },
                dedupeKey: `criminal:appeal:${p.caseId}:${p.kind}`,
            });
        },
        detentionDecision(p: { caseId: string; decision: 'توقيف' | 'إخلاء' | string }) {
            return publish({
                type: 'audit_log_criminal',
                category: 'criminal',
                title: `قرار ${p.decision}`,
                message: `قضية ${p.caseId}`,
                actionPayload: { criminalId: p.caseId },
                dedupeKey: `criminal:detention:${p.caseId}:${p.decision}`,
            });
        },
    },

    // ============================================================
    // Execution events
    // ============================================================
    execution: {
        fileCreated(p: { executionId: string | number; caseNo: string; clientName?: string }) {
            return publish({
                type: 'audit_log_execution',
                category: 'execution',
                title: 'تم إنشاء إضبارة تنفيذ',
                message: `${p.caseNo}${p.clientName ? ` — ${p.clientName}` : ''}`,
                actionPayload: { executionId: p.executionId },
                dedupeKey: `execution:create:${p.executionId}`,
            });
        },
        seizureAdded(p: {
            executionId: string | number;
            caseNo: string;
            kind: 'mal' | 'aqar' | 'manqul' | 'ladaal-ghair' | string;
        }) {
            const kindLabel =
                p.kind === 'mal'
                    ? 'حجز مال'
                    : p.kind === 'aqar'
                      ? 'حجز عقار'
                      : p.kind === 'manqul'
                        ? 'حجز منقول'
                        : p.kind === 'ladaal-ghair'
                          ? 'حجز لدى الغير'
                          : 'حجز';
            return publish({
                type: 'audit_log_execution',
                category: 'execution',
                title: `تم تسجيل ${kindLabel}`,
                message: p.caseNo,
                actionPayload: { executionId: p.executionId },
                dedupeKey: `execution:seizure:${p.executionId}:${p.kind}`,
            });
        },
        paymentReceived(p: {
            executionId: string | number;
            amount: number;
            caseNo: string;
            method?: string;
        }) {
            return publish({
                type: 'audit_log_execution',
                category: 'execution',
                title: 'تم استلام دفعة',
                message: `${p.caseNo} • ${p.amount.toLocaleString()} د.ع${p.method ? ` (${p.method})` : ''}`,
                actionPayload: { executionId: p.executionId },
                dedupeKey: `execution:payment:${p.executionId}:${p.amount}`,
            });
        },
        notificationSent(p: {
            executionId: string | number;
            caseNo: string;
            kind: 'debtor' | 'guarantor' | 'publication' | string;
        }) {
            const label =
                p.kind === 'debtor'
                    ? 'المدين'
                    : p.kind === 'guarantor'
                      ? 'الكفيل'
                      : p.kind === 'publication'
                        ? 'تبليغ بالنشر'
                        : 'تبليغ';
            return publish({
                type: 'audit_log_execution',
                category: 'execution',
                title: `تم إرسال تبليغ ${label}`,
                message: p.caseNo,
                actionPayload: { executionId: p.executionId },
                dedupeKey: `execution:notify:${p.executionId}:${p.kind}`,
            });
        },
        detentionOrdered(p: {
            executionId: string | number;
            caseNo: string;
            untilDate: string;
        }) {
            return publish({
                type: 'audit_log_execution',
                category: 'execution',
                title: 'صدر قرار حبس تنفيذي',
                message: `${p.caseNo} • حتى ${p.untilDate}`,
                actionPayload: { executionId: p.executionId },
                dedupeKey: `execution:detention:${p.executionId}:${p.untilDate}`,
            });
        },
        auctionScheduled(p: {
            executionId: string | number;
            caseNo: string;
            auctionDate: string;
        }) {
            return publish({
                type: 'audit_log_execution',
                category: 'execution',
                title: 'تم تحديد موعد مزاد',
                message: `${p.caseNo} • ${p.auctionDate}`,
                actionPayload: { executionId: p.executionId },
                dedupeKey: `execution:auction:${p.executionId}:${p.auctionDate}`,
            });
        },
        closed(p: { executionId: string | number; caseNo: string }) {
            return publish({
                type: 'audit_log_execution',
                category: 'execution',
                title: 'تم إغلاق إضبارة التنفيذ',
                message: p.caseNo,
                actionPayload: { executionId: p.executionId },
                dedupeKey: `execution:close:${p.executionId}`,
            });
        },
    },

    // ============================================================
    // Task events
    // ============================================================
    task: {
        created(p: { taskId: string; title: string; linkedCaseId?: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'تمت إضافة مهمة',
                message: p.title,
                actionPayload: { taskId: p.taskId, caseId: p.linkedCaseId },
                dedupeKey: `task:create:${p.taskId}`,
            });
        },
        completed(p: { taskId: string; title: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'تم إنجاز مهمة',
                message: p.title,
                actionPayload: { taskId: p.taskId },
                dedupeKey: `task:complete:${p.taskId}`,
            });
        },
        delegated(p: { taskId: string; title: string; assignee?: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'تمّ إسناد مهمة',
                message: `${p.title}${p.assignee ? ` → ${p.assignee}` : ''}`,
                actionPayload: { taskId: p.taskId },
                dedupeKey: `task:delegate:${p.taskId}:${p.assignee ?? ''}`,
            });
        },
    },

    // ============================================================
    // Transactions Threading (المعاملات الإدارية)
    // ============================================================
    threading: {
        created(p: { txId: string; title: string; clientName?: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'تم إنشاء معاملة',
                message: `${p.title}${p.clientName ? ` — ${p.clientName}` : ''}`,
                actionPayload: { transactionId: p.txId },
                dedupeKey: `threading:create:${p.txId}`,
            });
        },
        statusChanged(p: { txId: string; title: string; toStatus: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'تم تحديث حالة معاملة',
                message: `${p.title} → ${p.toStatus}`,
                actionPayload: { transactionId: p.txId },
                dedupeKey: `threading:status:${p.txId}:${p.toStatus}`,
            });
        },
        expenseAdded(p: { txId: string; amount: number; description?: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'تم تسجيل مصروف',
                message: `${p.amount.toLocaleString()} د.ع${p.description ? ` • ${p.description}` : ''}`,
                actionPayload: { transactionId: p.txId },
                dedupeKey: `threading:expense:${p.txId}:${p.amount}:${p.description ?? ''}`,
            });
        },
        advancePaid(p: { txId: string; amount: number }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'تم استلام سُلفة',
                message: `${p.amount.toLocaleString()} د.ع`,
                actionPayload: { transactionId: p.txId },
                dedupeKey: `threading:advance:${p.txId}:${p.amount}`,
            });
        },
        taskCompleted(p: { txId: string; taskId: string; title: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'إنجاز خطوة في معاملة',
                message: p.title,
                actionPayload: { transactionId: p.txId, taskId: p.taskId },
                dedupeKey: `threading:task-complete:${p.taskId}`,
            });
        },
    },

    // ============================================================
    // Dossier open events — فتح إضبارة (إجراء ذو قيمة: المحامي رجع لقضية معينة)
    // ============================================================
    dossier: {
        opened(p: {
            module: 'civil' | 'personal' | 'criminal' | 'execution' | 'threading';
            entityId: string | number;
            caseNo?: string;
            clientName?: string;
        }) {
            const moduleLabels: Record<typeof p.module, string> = {
                civil: 'مدنية',
                personal: 'أحوال شخصية',
                criminal: 'جزائية',
                execution: 'تنفيذ',
                threading: 'معاملة',
            };
            // الفئة تتبع نوع الإضبارة
            const categoryMap: Record<typeof p.module, NotificationCategory> = {
                civil: 'civil',
                personal: 'civil',
                criminal: 'criminal',
                execution: 'execution',
                threading: 'task',
            };
            const typeMap: Record<typeof p.module, NotificationType> = {
                civil: 'audit_log_civil',
                personal: 'audit_log_civil',
                criminal: 'audit_log_criminal',
                execution: 'audit_log_execution',
                threading: 'audit_log_task',
            };
            return publish({
                type: typeMap[p.module],
                category: categoryMap[p.module],
                title: `فتح إضبارة ${moduleLabels[p.module]}`,
                message: `${p.caseNo ?? p.entityId}${p.clientName ? ` — ${p.clientName}` : ''}`,
                actionPayload: { entityId: p.entityId, module: p.module },
                // dedupe قوي: فتح نفس الإضبارة خلال 30s لا يُسجَّل مكرراً
                dedupeKey: `dossier:open:${p.module}:${p.entityId}`,
            });
        },
    },

    // ============================================================
    // Personal status events — الأحوال الشخصية (نفس بنية المدني)
    // ============================================================
    personal: {
        caseCreated(p: { caseId: string | number; caseNo: string; clientName?: string }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'تم إنشاء قضية أحوال شخصية',
                message: `${p.caseNo}${p.clientName ? ` — ${p.clientName}` : ''}`,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `personal:case-create:${p.caseId}`,
            });
        },
        statusChanged(p: {
            caseId: string | number;
            caseNo: string;
            fromStatus: string;
            toStatus: string;
        }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'تم تغيير حالة قضية أحوال شخصية',
                message: `${p.caseNo} • ${p.fromStatus} → ${p.toStatus}`,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `personal:status:${p.caseId}:${p.toStatus}`,
            });
        },
        archived(p: { caseId: string | number; caseNo: string }) {
            return publish({
                type: 'audit_log_civil',
                category: 'civil',
                title: 'تم أرشفة قضية أحوال شخصية',
                message: p.caseNo,
                actionPayload: { caseId: p.caseId },
                dedupeKey: `personal:archive:${p.caseId}`,
            });
        },
    },

    // ============================================================
    // Notepad / Notes events — المفكرة الكاملة
    // ============================================================
    note: {
        created(p: { noteId: string | number; title?: string; preview?: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'تمت إضافة ملاحظة',
                message: p.title || p.preview || `ملاحظة #${p.noteId}`,
                actionPayload: { noteId: p.noteId },
                dedupeKey: `note:create:${p.noteId}`,
            });
        },
        updated(p: { noteId: string | number; title?: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'تم تعديل ملاحظة',
                message: p.title || `ملاحظة #${p.noteId}`,
                actionPayload: { noteId: p.noteId },
                dedupeKey: `note:update:${p.noteId}`,
            });
        },
        deleted(p: { noteId: string | number; title?: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'تم حذف ملاحظة',
                message: p.title || `ملاحظة #${p.noteId}`,
                actionPayload: { noteId: p.noteId },
                dedupeKey: `note:delete:${p.noteId}`,
            });
        },
        pinned(p: { noteId: string | number; title?: string; pinned: boolean }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: p.pinned ? 'تثبيت ملاحظة' : 'إلغاء تثبيت ملاحظة',
                message: p.title || `ملاحظة #${p.noteId}`,
                actionPayload: { noteId: p.noteId },
                dedupeKey: `note:pin:${p.noteId}:${p.pinned ? 1 : 0}`,
            });
        },
    },

    // ============================================================
    // Field task events — مهام اليوم الميدانية
    // ============================================================
    fieldTask: {
        created(p: { taskId: string; title: string; date?: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'مهمة ميدانية جديدة',
                message: `${p.title}${p.date ? ` • ${p.date}` : ''}`,
                actionPayload: { taskId: p.taskId },
                dedupeKey: `fieldtask:create:${p.taskId}`,
            });
        },
        completed(p: { taskId: string; title: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'إنجاز مهمة ميدانية',
                message: p.title,
                actionPayload: { taskId: p.taskId },
                dedupeKey: `fieldtask:complete:${p.taskId}`,
            });
        },
        deleted(p: { taskId: string; title: string }) {
            return publish({
                type: 'audit_log_task',
                category: 'task',
                title: 'حذف مهمة ميدانية',
                message: p.title,
                actionPayload: { taskId: p.taskId },
                dedupeKey: `fieldtask:delete:${p.taskId}`,
            });
        },
    },

    // ============================================================
    // Forum events
    // ============================================================
    forum: {
        // ── واردة ──
        replyReceived(p: { questionId: string; questionTitle: string; author?: string }) {
            return publish({
                type: 'forum_reply',
                category: 'forum',
                title: 'رد جديد على سؤالك',
                message: `${p.questionTitle}${p.author ? ` — ${p.author}` : ''}`,
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:reply:${p.questionId}:${p.author ?? ''}`,
            });
        },
        mentioned(p: { questionId: string; questionTitle: string; mentionedBy?: string }) {
            return publish({
                type: 'forum_mention',
                category: 'forum',
                title: 'ذُكرت في سؤال',
                message: `${p.questionTitle}${p.mentionedBy ? ` — ${p.mentionedBy}` : ''}`,
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:mention:${p.questionId}:${p.mentionedBy ?? ''}`,
            });
        },
        solved(p: { questionId: string; questionTitle: string }) {
            return publish({
                type: 'forum_solved',
                category: 'forum',
                title: 'تم تحديد إجابة لسؤالك',
                message: p.questionTitle,
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:solved:${p.questionId}`,
            });
        },
        // ── صادرة (أفعال المحامي) ──
        questionPosted(p: { questionId: string; title: string }) {
            return publish({
                type: 'forum_reply',
                category: 'forum',
                title: 'نشرت سؤالاً في المنتدى',
                message: p.title,
                direction: 'outgoing',
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:question-post:${p.questionId}`,
            });
        },
        replyPosted(p: { questionId: string; questionTitle: string }) {
            return publish({
                type: 'forum_reply',
                category: 'forum',
                title: 'رددت على سؤال',
                message: p.questionTitle,
                direction: 'outgoing',
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:reply-post:${p.questionId}`,
            });
        },
        questionDeleted(p: { questionId: string; title?: string }) {
            return publish({
                type: 'forum_reply',
                category: 'forum',
                title: 'حذفت سؤالاً',
                message: p.title || `سؤال #${p.questionId}`,
                direction: 'outgoing',
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:question-delete:${p.questionId}`,
            });
        },
        markedAsSolved(p: { questionId: string; questionTitle: string }) {
            return publish({
                type: 'forum_solved',
                category: 'forum',
                title: 'حددت أفضل إجابة',
                message: p.questionTitle,
                direction: 'outgoing',
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:mark-solved:${p.questionId}`,
            });
        },
    },

    // ============================================================
    // Document Vault events
    // ============================================================
    document: {
        added(p: { docId: string; name: string; linkedCaseId?: string }) {
            return publish({
                type: 'new_document',
                category: 'document',
                title: 'تمت إضافة مستند',
                message: p.name,
                actionPayload: { docId: p.docId, caseId: p.linkedCaseId },
                dedupeKey: `doc:add:${p.docId}`,
            });
        },
        scanned(p: { docId: string; name: string }) {
            return publish({
                type: 'new_document',
                category: 'document',
                title: 'تم مسح مستند ضوئياً',
                message: p.name,
                actionPayload: { docId: p.docId },
                dedupeKey: `doc:scan:${p.docId}`,
            });
        },
        linked(p: { docId: string; name: string; linkedCaseId: string }) {
            return publish({
                type: 'new_document',
                category: 'document',
                title: 'ربط مستند بقضية',
                message: `${p.name} → قضية ${p.linkedCaseId}`,
                actionPayload: { docId: p.docId, caseId: p.linkedCaseId },
                dedupeKey: `doc:link:${p.docId}:${p.linkedCaseId}`,
            });
        },
    },

    // ============================================================
    // System events
    // ============================================================
    system: {
        announce(p: { title: string; message: string; dedupeKey?: string }) {
            return publish({
                type: 'system_alert',
                category: 'system',
                title: p.title,
                message: p.message,
                direction: 'incoming',
                dedupeKey: p.dedupeKey,
            });
        },
        securityEvent(p: { title: string; message: string; dedupeKey?: string }) {
            return publish({
                type: 'system_alert',
                category: 'system',
                title: p.title,
                message: p.message,
                direction: 'incoming',
                dedupeKey: p.dedupeKey,
            });
        },
        settingChanged(p: { setting: string; from?: string; to?: string }) {
            return publish({
                type: 'system_alert',
                category: 'system',
                title: 'تم تغيير إعداد',
                message: `${p.setting}${p.from && p.to ? `: ${p.from} → ${p.to}` : ''}`,
                direction: 'outgoing', // المحامي غيّر الإعداد بنفسه
                dedupeKey: `system:setting:${p.setting}`,
            });
        },
    },

    // ============================================================
    // Inbox events (وارد من خارج المحامي — موكلون، نظام، محكمة، ...)
    // ============================================================
    inbox: {
        /** طلب جديد من موكل (استشارة، توكيل، استفسار، ...) */
        clientRequest(p: { requestId: string; clientName: string; subject?: string }) {
            return publish({
                type: 'system_alert',
                category: 'system',
                title: 'طلب جديد من موكل',
                message: `${p.clientName}${p.subject ? ` — ${p.subject}` : ''}`,
                direction: 'incoming',
                actionPayload: { requestId: p.requestId, source: 'client' },
                dedupeKey: `inbox:client-request:${p.requestId}`,
            });
        },
        /** مستند وصل من موكل (صورة، PDF، ...) */
        documentReceived(p: { docId: string; name: string; fromClient: string }) {
            return publish({
                type: 'new_document',
                category: 'document',
                title: 'وصل مستند من موكل',
                message: `${p.name} — ${p.fromClient}`,
                direction: 'incoming',
                actionPayload: { docId: p.docId, source: 'client' },
                dedupeKey: `inbox:doc:${p.docId}`,
            });
        },
        /** إخطار جلسة من المحكمة (نتيجة sync تقويم خارجي مثلاً) */
        courtNotice(p: { caseNo: string; date: string; subject: string }) {
            return publish({
                type: 'deadline',
                category: 'civil',
                title: 'إخطار قضائي',
                message: `${p.caseNo} • ${p.subject} (${p.date})`,
                direction: 'incoming',
                dedupeKey: `inbox:court:${p.caseNo}:${p.date}`,
            });
        },
        /** رسالة من زميل/مساعد (تخصيص قضية، توكيل، تعليق، ...) */
        colleagueMessage(p: { from: string; subject: string; dedupeKey?: string }) {
            return publish({
                type: 'system_alert',
                category: 'system',
                title: `رسالة من ${p.from}`,
                message: p.subject,
                direction: 'incoming',
                dedupeKey: p.dedupeKey ?? `inbox:colleague:${p.from}:${p.subject.slice(0, 30)}`,
            });
        },
        /** ذكاء اصطناعي يكتشف خطراً/فرصة في القضايا */
        aiInsight(p: { insight: string; caseId?: string | number }) {
            return publish({
                type: 'ai_insight',
                category: 'ai',
                title: 'استبصار ذكي',
                message: p.insight,
                direction: 'incoming',
                actionPayload: { caseId: p.caseId },
                dedupeKey: `inbox:ai:${p.insight.slice(0, 40)}`,
            });
        },
    },
};

export type AuditLogService = typeof AuditLog;
