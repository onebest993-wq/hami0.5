/**
 * اختبارات buildExecutionAlerts.
 *
 * يتحقّق من:
 *  x1) مهمة pending بـ dueDate قريبة → TASK alert
 *  x2) executive_detention_until خلال يومين → DEADLINE
 *  x3) eviction_vacate_deadline خلال أسبوع → DEADLINE
 *  x4) eviction_first_notice_date + 7 يوم = نهاية المهلة الطوعية
 *  x5) publication_notice_by_debtor + 15 يوم
 *  x6) employee_summons_assignments_by_debtor.deadlineDate
 *  x7) stay_of_execution.next_hearing_date → HEARING
 *  x8) ركود > 300 يوم → URGENT
 *  x9) lastPaymentDate > 60 يوم + رصيد متبقّي → stale-payment TASK
 *  x10) إضبارة منتهية (finished) لا تُنتج أي تنبيه
 */
import { describe, expect, it, vi } from 'vitest';
import { buildExecutionAlerts } from '../executionAlerts';
import type { DossierRegistry } from '../alertDossierRegistry';

// نُمرّر registry وهمي يقبل كل execution id
function fakeRegistry(): DossierRegistry {
    return {
        resolve: vi.fn((module: string, id: string) => ({
            module,
            entityId: id,
            caseNumber: `EXE-${id}`,
            clientName: 'موكل اختباري',
            courtName: 'محكمة بغداد',
            actionType: 'إجراء تنفيذ',
            clientPhone: '',
        })),
    } as unknown as DossierRegistry;
}

function ymdInDays(daysFromNow: number, base = new Date()): string {
    const d = new Date(base.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('buildExecutionAlerts', () => {
    it('x1) caseTasksPending بـ dueDate خلال 3 أيام → TASK alert', () => {
        const now = new Date();
        const file = {
            id: 'e1',
            dossier_lifecycle_status: 'active',
            caseTasksPending: [
                {
                    id: 't1',
                    title: 'متابعة الحجز',
                    body: 'حضور المحضر لضبط الحجز',
                    dueDate: ymdInDays(3),
                },
            ],
        };
        const alerts = buildExecutionAlerts([file], now, fakeRegistry());
        const hit = alerts.find((a) => a.id === 'execution:e1:task:t1');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('TASK');
        expect(hit?.target).toBe('execution');
        expect(hit?.dueAt).toBeTruthy();
        expect(hit?.priority).toBeLessThanOrEqual(3);
    });

    it('x2) executive_detention_until خلال يومين → DEADLINE', () => {
        const now = new Date();
        const file = {
            id: 'e2',
            dossier_lifecycle_status: 'active',
            executive_detention_until: ymdInDays(2),
        };
        const alerts = buildExecutionAlerts([file], now, fakeRegistry());
        const hit = alerts.find((a) => a.id === 'execution:e2:detention');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('DEADLINE');
        expect(hit?.priority).toBeLessThanOrEqual(2);
    });

    it('x2b) executive_detention مع reminder_sent=true يُتجاهل', () => {
        const now = new Date();
        const file = {
            id: 'e2b',
            dossier_lifecycle_status: 'active',
            executive_detention_until: ymdInDays(2),
            executive_detention_reminder_sent: true,
        };
        const alerts = buildExecutionAlerts([file], now, fakeRegistry());
        expect(alerts.find((a) => a.id === 'execution:e2b:detention')).toBeUndefined();
    });

    it('x3) eviction_vacate_deadline خلال أسبوع → DEADLINE', () => {
        const now = new Date();
        const file = {
            id: 'e3',
            dossier_lifecycle_status: 'active',
            eviction_vacate_deadline: ymdInDays(7),
        };
        const alerts = buildExecutionAlerts([file], now, fakeRegistry());
        const hit = alerts.find((a) => a.id === 'execution:e3:eviction');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('DEADLINE');
    });

    it('x4) eviction_first_notice_date + 7 يوم → DEADLINE نهاية المهلة الطوعية', () => {
        const now = new Date();
        // أول تبليغ قبل 5 أيام → نهاية المهلة بعد يومين
        const file = {
            id: 'e4',
            dossier_lifecycle_status: 'active',
            eviction_first_notice_date: ymdInDays(-5),
        };
        const alerts = buildExecutionAlerts([file], now, fakeRegistry());
        const hit = alerts.find((a) => a.id === 'execution:e4:voluntary-end');
        expect(hit).toBeDefined();
    });

    it('x5) publication_notice_by_debtor + 15 يوم → DEADLINE', () => {
        const now = new Date();
        const file = {
            id: 'e5',
            dossier_lifecycle_status: 'active',
            publication_notice_by_debtor: {
                'debtor-A': {
                    publicationDateYmd: ymdInDays(-12), // نهاية الـ 15 يوم بعد 3 أيام
                },
            },
        };
        const alerts = buildExecutionAlerts([file], now, fakeRegistry());
        const hit = alerts.find((a) => a.id === 'execution:e5:publication:debtor-A');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('DEADLINE');
    });

    it('x6) employee_summons_assignments_by_debtor.deadlineDate قريب → DEADLINE', () => {
        const now = new Date();
        const file = {
            id: 'e6',
            dossier_lifecycle_status: 'active',
            employee_summons_assignments_by_debtor: {
                'debtor-X': {
                    deadlineDate: ymdInDays(2),
                    phase: 'pending',
                },
            },
        };
        const alerts = buildExecutionAlerts([file], now, fakeRegistry());
        const hit = alerts.find((a) => a.id === 'execution:e6:emp-summons:debtor-X');
        expect(hit).toBeDefined();
    });

    it('x7) stay_of_execution.next_hearing_date → HEARING', () => {
        const now = new Date();
        const file = {
            id: 'e7',
            dossier_lifecycle_status: 'active',
            stay_of_execution: {
                active: true,
                next_hearing_date: ymdInDays(5),
            },
        };
        const alerts = buildExecutionAlerts([file], now, fakeRegistry());
        const hit = alerts.find((a) => a.id === 'execution:e7:stay-hearing');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('HEARING');
    });

    it('x8) dossier_last_action_date منذ > 300 يوم → URGENT (ركود/المادة 112)', () => {
        const now = new Date();
        const file = {
            id: 'e8',
            dossier_lifecycle_status: 'active',
            dossier_last_action_date: ymdInDays(-320),
        };
        const alerts = buildExecutionAlerts([file], now, fakeRegistry());
        const hit = alerts.find((a) => a.id === 'execution:e8:dormancy');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('URGENT');
    });

    it('x9) lastPaymentDate > 60 يوم + رصيد متبقّي → stale-payment', () => {
        const now = new Date();
        const file = {
            id: 'e9',
            dossier_lifecycle_status: 'active',
            total_remaining_balance: 5_000_000,
            lastPaymentDate: ymdInDays(-75),
        };
        const alerts = buildExecutionAlerts([file], now, fakeRegistry());
        const hit = alerts.find((a) => a.id === 'execution:e9:stale-payment');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('TASK');
    });

    it('x10) lifecycle=finished لا يُنتج أي تنبيه', () => {
        const now = new Date();
        const file = {
            id: 'e10',
            dossier_lifecycle_status: 'finished',
            executive_detention_until: ymdInDays(2),
            caseTasksPending: [{ id: 't', title: 'x', dueDate: ymdInDays(2) }],
            dossier_last_action_date: ymdInDays(-400),
        };
        const alerts = buildExecutionAlerts([file], now, fakeRegistry());
        expect(alerts.length).toBe(0);
    });
});
