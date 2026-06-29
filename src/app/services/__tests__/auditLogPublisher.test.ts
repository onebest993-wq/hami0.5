/**
 * اختبارات AuditLog publisher
 * — سجل النشاطات (audit_log_*) معطّل ولا يُنشئ إشعارات.
 * — المنتدى/النظام ما زال يُنشر.
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

    it('a1) civil.caseCreated لا يُنشئ إشعاراً (سجل النشاطات معطّل)', () => {
        const result = AuditLog.civil.caseCreated({
            caseId: 'case-1',
            caseNo: '50/ب/2026',
            clientName: 'محمد',
        });
        expect(result).toBeNull();
        expect(useNotificationStore.getState().notifications).toHaveLength(0);
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

    it('a4b) forum.questionPosted لا يُنشئ إشعاراً (إجراء ذاتي)', () => {
        const result = AuditLog.forum.questionPosted({
            questionId: 'q-self',
            title: 'سؤال تجريبي',
        });
        expect(result).toBeNull();
        expect(useNotificationStore.getState().notifications).toHaveLength(0);
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

    it('dir5) system.announce وارد (إعلان نظام)', () => {
        AuditLog.system.announce({ title: 'تحديث', message: 'إصدار جديد' });
        const n = useNotificationStore.getState().notifications[0];
        expect(deriveNotificationDirection(n)).toBe('incoming');
    });

    it('inbox.courtNotice وارد بفئة system', () => {
        AuditLog.inbox.courtNotice({
            caseNo: '50/2026',
            date: '2026-06-01',
            subject: 'جلسة',
        });
        const n = useNotificationStore.getState().notifications[0];
        expect(n.type).toBe('system_alert');
        expect(n.category).toBe('system');
        expect(deriveNotificationDirection(n)).toBe('incoming');
    });

    it('dossier.opened لا يُنشئ إشعاراً', () => {
        const r = AuditLog.dossier.opened({
            module: 'criminal',
            entityId: '677f0686-1750-49fb-884a-ac1fd82b703b',
            clientName: 'أحمد',
        });
        expect(r).toBeNull();
        expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });
});
