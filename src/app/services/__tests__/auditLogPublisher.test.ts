/**
 * اختبارات AuditLog publisher — يتحقّق من:
 *  a1) كل event يدفع NotificationModel صحيحاً (category + type + actionPayload)
 *  a2) NotificationStore يستقبل الإشعار ويزيد unreadCount
 *  a3) deriveNotificationCategory يعمل بشكل صحيح للأنواع الجديدة
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { AuditLog, _resetAuditLogDedupe } from '../auditLogPublisher';
import { useNotificationStore } from '@/app/stores/notificationStore';
import {
    deriveNotificationCategory,
    deriveNotificationDirection,
} from '@/app/infrastructure/NotificationRepository';

describe('AuditLog publisher', () => {
    beforeEach(() => {
        useNotificationStore.setState({ notifications: [], unreadCount: 0, isLoading: false });
        _resetAuditLogDedupe();
    });

    it('a1) civil.caseCreated يدفع إشعاراً بـ category=civil', () => {
        AuditLog.civil.caseCreated({ caseId: 'case-1', caseNo: '50/ب/2026', clientName: 'محمد' });
        const list = useNotificationStore.getState().notifications;
        expect(list).toHaveLength(1);
        expect(list[0].type).toBe('audit_log_civil');
        expect(list[0].category).toBe('civil');
        expect(list[0].actionPayload).toEqual({ caseId: 'case-1' });
        expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it('a2) execution.fileCreated يدفع إشعاراً بـ category=execution', () => {
        AuditLog.execution.fileCreated({ executionId: 'exe-1', caseNo: 'EXE/100' });
        const n = useNotificationStore.getState().notifications[0];
        expect(n.type).toBe('audit_log_execution');
        expect(n.category).toBe('execution');
        expect(n.actionPayload).toEqual({ executionId: 'exe-1' });
    });

    it('a3) criminal.caseCreated يدفع إشعاراً بـ category=criminal', () => {
        AuditLog.criminal.caseCreated({ caseId: 'crim-1', caseNo: '2026/جنح/120' });
        const n = useNotificationStore.getState().notifications[0];
        expect(n.type).toBe('audit_log_criminal');
        expect(n.category).toBe('criminal');
    });

    it('a4) forum.replyReceived يدفع إشعاراً بـ type=forum_reply', () => {
        AuditLog.forum.replyReceived({
            questionId: 'q-1',
            questionTitle: 'استشارة عقارية',
            author: 'فلان',
        });
        const n = useNotificationStore.getState().notifications[0];
        expect(n.type).toBe('forum_reply');
        expect(n.category).toBe('forum');
    });

    it('a5) deriveNotificationCategory يعمل صحيحاً للأنواع الجديدة', () => {
        const base = {
            id: 'x',
            title: '',
            message: '',
            isRead: false,
            createdAt: new Date().toISOString(),
        };
        expect(deriveNotificationCategory({ ...base, type: 'audit_log_civil' })).toBe('civil');
        expect(deriveNotificationCategory({ ...base, type: 'audit_log_criminal' })).toBe(
            'criminal',
        );
        expect(deriveNotificationCategory({ ...base, type: 'audit_log_execution' })).toBe(
            'execution',
        );
        expect(deriveNotificationCategory({ ...base, type: 'audit_log_task' })).toBe('task');
        expect(deriveNotificationCategory({ ...base, type: 'forum_mention' })).toBe('forum');
        expect(deriveNotificationCategory({ ...base, type: 'system_alert' })).toBe('system');
    });

    it('a6) deriveNotificationCategory يستنتج fallback من actionPayload للـ deadline القديم', () => {
        const base = {
            id: 'x',
            title: '',
            message: '',
            isRead: false,
            createdAt: new Date().toISOString(),
            type: 'deadline' as const,
        };
        expect(deriveNotificationCategory({ ...base, actionPayload: { caseId: 'c1' } })).toBe(
            'civil',
        );
        expect(deriveNotificationCategory({ ...base, actionPayload: { executionId: 'e1' } })).toBe(
            'execution',
        );
        expect(deriveNotificationCategory({ ...base, actionPayload: { criminalId: 'cr1' } })).toBe(
            'criminal',
        );
        expect(deriveNotificationCategory({ ...base })).toBe('task');
    });

    it('a7) النشر المتعدد يحفظ الترتيب الزمني (الأحدث أولاً)', () => {
        AuditLog.civil.caseCreated({ caseId: '1', caseNo: 'A' });
        AuditLog.civil.caseCreated({ caseId: '2', caseNo: 'B' });
        AuditLog.civil.caseCreated({ caseId: '3', caseNo: 'C' });
        const list = useNotificationStore.getState().notifications;
        expect(list).toHaveLength(3);
        expect(list[0].actionPayload).toEqual({ caseId: '3' });
        expect(list[2].actionPayload).toEqual({ caseId: '1' });
    });

    // ============================================================
    // Smart dedupe (نافذة 30s)
    // ============================================================
    it('d1) Dedupe: نفس الـ caseId يُنشر مرّة فقط خلال النافذة', () => {
        const r1 = AuditLog.civil.caseCreated({ caseId: 'X', caseNo: '1' });
        const r2 = AuditLog.civil.caseCreated({ caseId: 'X', caseNo: '1' });
        const r3 = AuditLog.civil.caseCreated({ caseId: 'X', caseNo: '1' });
        expect(r1).not.toBeNull();
        expect(r2).toBeNull();
        expect(r3).toBeNull();
        expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });

    it('d2) Dedupe: caseIds مختلفة → كل واحد يُنشر', () => {
        AuditLog.civil.caseCreated({ caseId: 'A', caseNo: 'A1' });
        AuditLog.civil.caseCreated({ caseId: 'B', caseNo: 'B1' });
        AuditLog.civil.caseCreated({ caseId: 'C', caseNo: 'C1' });
        expect(useNotificationStore.getState().notifications).toHaveLength(3);
    });

    it('d3) Dedupe: payment بنفس المبلغ يُمنع، مبلغ مختلف يمر', () => {
        AuditLog.execution.paymentReceived({ executionId: 'e1', amount: 500_000, caseNo: 'X' });
        AuditLog.execution.paymentReceived({ executionId: 'e1', amount: 500_000, caseNo: 'X' });
        AuditLog.execution.paymentReceived({ executionId: 'e1', amount: 700_000, caseNo: 'X' });
        expect(useNotificationStore.getState().notifications).toHaveLength(2);
    });

    it('d4) Dedupe: حجوزات بأنواع مختلفة → كل نوع يُنشر', () => {
        AuditLog.execution.seizureAdded({ executionId: 'e1', caseNo: 'X', kind: 'mal' });
        AuditLog.execution.seizureAdded({ executionId: 'e1', caseNo: 'X', kind: 'aqar' });
        AuditLog.execution.seizureAdded({ executionId: 'e1', caseNo: 'X', kind: 'aqar' }); // dup
        expect(useNotificationStore.getState().notifications).toHaveLength(2);
    });

    it('d5) Dedupe: status change بنفس toStatus لا يُكرَّر', () => {
        AuditLog.civil.statusChanged({
            caseId: 'c1',
            caseNo: 'X',
            fromStatus: 'active',
            toStatus: 'paused',
        });
        AuditLog.civil.statusChanged({
            caseId: 'c1',
            caseNo: 'X',
            fromStatus: 'active',
            toStatus: 'paused',
        });
        expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });

    // ============================================================
    // Coverage smoke tests — كل قسم يُنشر بشكل صحيح
    // ============================================================
    it('c1) coverage: كل أنواع civil events تعمل', () => {
        AuditLog.civil.caseCreated({ caseId: 'c1', caseNo: 'X' });
        AuditLog.civil.stageAdded({ caseId: 'c1', caseNo: 'X', stageName: 'البداءة' });
        AuditLog.civil.stageAdvanced({ caseId: 'c1', caseNo: 'X', fromStage: 'A', toStage: 'B' });
        AuditLog.civil.decisionRecorded({ caseId: 'c1', caseNo: 'X', decision: 'حكم نهائي' });
        AuditLog.civil.hearingPostponed({ caseId: 'c1', caseNo: 'X', nextDate: '2026-06-01' });
        AuditLog.civil.hearingAdded({ caseId: 'c1', caseNo: 'X', date: '2026-07-01', title: 'مرافعة' });
        AuditLog.civil.taskAdded({ caseId: 'c1', caseNo: 'X', title: 'إعداد لائحة', dueDate: '2026-06-15' });
        AuditLog.civil.taskCompleted({ caseId: 'c1', caseNo: 'X', title: 'إعداد لائحة' });
        AuditLog.civil.appealFiled({ caseId: 'c1', caseNo: 'X', appealType: 'استئناف' });
        AuditLog.civil.statusChanged({
            caseId: 'c1',
            caseNo: 'X',
            fromStatus: 'active',
            toStatus: 'paused',
        });
        const list = useNotificationStore.getState().notifications;
        expect(list.length).toBe(10);
        expect(list.every((n) => n.category === 'civil')).toBe(true);
    });

    it('c2) coverage: كل أنواع execution events تعمل', () => {
        AuditLog.execution.fileCreated({ executionId: 'e1', caseNo: 'X' });
        AuditLog.execution.seizureAdded({ executionId: 'e1', caseNo: 'X', kind: 'mal' });
        AuditLog.execution.paymentReceived({ executionId: 'e1', amount: 100_000, caseNo: 'X' });
        AuditLog.execution.notificationSent({ executionId: 'e1', caseNo: 'X', kind: 'debtor' });
        AuditLog.execution.detentionOrdered({
            executionId: 'e1',
            caseNo: 'X',
            untilDate: '2026-06-01',
        });
        AuditLog.execution.auctionScheduled({
            executionId: 'e1',
            caseNo: 'X',
            auctionDate: '2026-06-15',
        });
        AuditLog.execution.closed({ executionId: 'e1', caseNo: 'X' });
        const list = useNotificationStore.getState().notifications;
        expect(list.length).toBe(7);
        expect(list.every((n) => n.category === 'execution')).toBe(true);
    });

    it('c3) coverage: threading events تُسجَّل بفئة task', () => {
        AuditLog.threading.created({ txId: 't1', title: 'تسجيل عقار', clientName: 'X' });
        AuditLog.threading.statusChanged({ txId: 't1', title: 'تسجيل', toStatus: 'Paused' });
        AuditLog.threading.expenseAdded({ txId: 't1', amount: 50_000 });
        AuditLog.threading.advancePaid({ txId: 't1', amount: 200_000 });
        AuditLog.threading.taskCompleted({ txId: 't1', taskId: 'tk1', title: 'مهمة' });
        const list = useNotificationStore.getState().notifications;
        expect(list.length).toBe(5);
        expect(list.every((n) => n.category === 'task')).toBe(true);
    });

    // ============================================================
    // Direction tests (وارد/صادر) — مفهوم سجل البريد
    // ============================================================
    it('dir1) أفعال المحامي تُصنَّف صادر (outgoing)', () => {
        AuditLog.civil.caseCreated({ caseId: 'c1', caseNo: 'X' });
        AuditLog.criminal.caseCreated({ caseId: 'cr1', caseNo: 'Y' });
        AuditLog.execution.fileCreated({ executionId: 'e1', caseNo: 'Z' });
        AuditLog.threading.created({ txId: 't1', title: 'تسجيل عقار' });
        const list = useNotificationStore.getState().notifications;
        expect(list.length).toBe(4);
        expect(list.every((n) => deriveNotificationDirection(n) === 'outgoing')).toBe(true);
    });

    it('dir2) أحداث المنتدى تُصنَّف وارد (incoming)', () => {
        AuditLog.forum.replyReceived({ questionId: 'q1', questionTitle: 'سؤال' });
        AuditLog.forum.mentioned({ questionId: 'q2', questionTitle: 'سؤال آخر' });
        AuditLog.forum.solved({ questionId: 'q3', questionTitle: 'تم حل' });
        const list = useNotificationStore.getState().notifications;
        expect(list.length).toBe(3);
        expect(list.every((n) => deriveNotificationDirection(n) === 'incoming')).toBe(true);
    });

    it('dir3) inbox events تُصنَّف وارد', () => {
        AuditLog.inbox.clientRequest({ requestId: 'r1', clientName: 'موكل', subject: 'استشارة' });
        AuditLog.inbox.documentReceived({ docId: 'd1', name: 'سند طابو', fromClient: 'موكل' });
        AuditLog.inbox.courtNotice({ caseNo: 'X', date: '2026-06-01', subject: 'جلسة' });
        AuditLog.inbox.colleagueMessage({ from: 'زميل', subject: 'تعاون' });
        AuditLog.inbox.aiInsight({ insight: 'انتبه لانقضاء المدة' });
        const list = useNotificationStore.getState().notifications;
        expect(list.length).toBe(5);
        expect(list.every((n) => deriveNotificationDirection(n) === 'incoming')).toBe(true);
    });

    it('dir4) system.settingChanged صادر (المحامي غيّر إعداداً بنفسه)', () => {
        AuditLog.system.settingChanged({ setting: 'وضع الخصوصية', from: 'off', to: 'on' });
        const n = useNotificationStore.getState().notifications[0];
        expect(deriveNotificationDirection(n)).toBe('outgoing');
    });

    it('dir5) system.announce وارد (إعلان نظام)', () => {
        AuditLog.system.announce({ title: 'تحديث', message: 'إصدار جديد' });
        const n = useNotificationStore.getState().notifications[0];
        expect(deriveNotificationDirection(n)).toBe('incoming');
    });
});
