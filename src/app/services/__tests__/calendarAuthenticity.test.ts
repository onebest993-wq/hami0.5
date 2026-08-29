import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';
import {
    fieldTaskHasExplicitUserDate,
    isAuthenticSecretaryAlert,
    isEphemeralLawsuitTaskId,
    isSyntheticBridgeSourceEventId,
    isUserAuthoredBridgedCalendarEvent,
} from '../calendarAuthenticity';
import type { LegalTask } from '@/app/types/TaskEngine';

function task(partial: Partial<LegalTask>): LegalTask {
    return {
        id: 't1',
        title: 'مهمة',
        status: 'pending',
        rawText: '',
        subTasks: [],
        pinnedToFieldCurtain: false,
        isFatalDeadline: false,
        createdAt: new Date(),
        ...partial,
    };
}

describe('calendarAuthenticity', () => {
    it('يكشف المعرّفات الآلية', () => {
        expect(isEphemeralLawsuitTaskId('task_fast_99')).toBe(true);
        expect(isEphemeralLawsuitTaskId('user-task-1')).toBe(false);
        expect(isSyntheticBridgeSourceEventId('legacy_abc')).toBe(true);
        expect(isSyntheticBridgeSourceEventId('appeal_s1')).toBe(true);
        expect(isSyntheticBridgeSourceEventId('task_user-1')).toBe(false);
    });

    it('مهمة ميدان بدون تاريخ صريح ليست حقيقية للتقويم', () => {
        expect(fieldTaskHasExplicitUserDate(task({ pinnedToFieldCurtain: true }))).toBe(false);
        expect(
            fieldTaskHasExplicitUserDate(
                task({ parsedDate: new Date('2028-06-01'), pinnedToFieldCurtain: true }),
            ),
        ).toBe(true);
    });

    it('الموعد اليدوي يبقى، المربوط الآلي يُستبعد', () => {
        const manual: CalendarEvent = {
            id: 'm1',
            userId: 'u',
            title: 'استشارة',
            date: '2028-01-01',
            type: 'consultation',
            sourceModule: 'manual',
            createdAt: '',
            updatedAt: '',
        };
        const synthetic: CalendarEvent = {
            ...manual,
            id: 'b1',
            sourceModule: 'lawsuit',
            sourceEntityId: 'f1',
            sourceEventId: 'task_task_fast_1',
        };
        expect(isUserAuthoredBridgedCalendarEvent(manual)).toBe(true);
        expect(isUserAuthoredBridgedCalendarEvent(synthetic)).toBe(false);
    });

    it('تنبيهات البطاقة: تقويم ومهام ميدان فقط', () => {
        expect(isAuthenticSecretaryAlert({ id: 'calendar:x', type: 'HEARING' } as never)).toBe(true);
        expect(isAuthenticSecretaryAlert({ id: 'request:1', type: 'TASK' } as never)).toBe(false);
        expect(isAuthenticSecretaryAlert({ id: 'file-tx:1', type: 'TASK' } as never)).toBe(false);
        expect(isAuthenticSecretaryAlert({ id: 'community:1', type: 'TASK' } as never)).toBe(false);
    });

    it('🛡️ يستبعد تنبيهات calendar:* القادمة من Sniffer (field_*)', () => {
        const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        // bridge id مع field_* داخله — sniffer artifact
        const fieldFromId = {
            id: 'calendar:BRIDGE_criminal_cr-1_field_arrestDate',
            type: 'HEARING',
            dueAt: tomorrow,
        } as never;
        expect(isAuthenticSecretaryAlert(fieldFromId)).toBe(false);

        // عبر calendarSource.eventId
        const fieldFromSource = {
            id: 'calendar:any-bridge-id',
            type: 'HEARING',
            dueAt: tomorrow,
            calendarSource: { eventId: 'field_arrestDate' },
        } as never;
        expect(isAuthenticSecretaryAlert(fieldFromSource)).toBe(false);

        // تقويم حقيقي من timeline event يمر
        const realEvent = {
            id: 'calendar:BRIDGE_criminal_cr-1_t-1',
            type: 'HEARING',
            dueAt: tomorrow,
            calendarSource: { eventId: 't-1' },
        } as never;
        expect(isAuthenticSecretaryAlert(realEvent)).toBe(true);
    });

    it('🛡️ يستبعد تنبيهات calendar:* التي موعدها اليوم أو في الماضي', () => {
        const today = new Date().toISOString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

        expect(
            isAuthenticSecretaryAlert({
                id: 'calendar:BRIDGE_lawsuit_1_appt-1',
                type: 'HEARING',
                dueAt: today,
            } as never),
        ).toBe(false);

        expect(
            isAuthenticSecretaryAlert({
                id: 'calendar:BRIDGE_lawsuit_1_appt-2',
                type: 'DEADLINE',
                dueAt: yesterday,
            } as never),
        ).toBe(false);

        expect(
            isAuthenticSecretaryAlert({
                id: 'calendar:BRIDGE_lawsuit_1_appt-3',
                type: 'HEARING',
                dueAt: tomorrow,
            } as never),
        ).toBe(true);
    });

    it('🛡️ المسموح فقط: calendar:* + field-task مع fieldTaskInjected', () => {
        const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        // calendar مستقبلي حقيقي
        expect(
            isAuthenticSecretaryAlert({
                id: 'calendar:BRIDGE_lawsuit_1_appt-1',
                type: 'HEARING',
                dueAt: tomorrow,
            } as never),
        ).toBe(true);
        // request:* بادئة غير مسموحة
        expect(
            isAuthenticSecretaryAlert({ id: 'request:rq-1', type: 'TASK' } as never),
        ).toBe(false);
        // field-task مع fieldTaskInjected
        expect(
            isAuthenticSecretaryAlert({
                id: 'field-task:ft-1',
                type: 'TASK',
                fieldTaskInjected: true,
            } as never),
        ).toBe(true);
        // field-task بدون fieldTaskInjected — مرفوض
        expect(
            isAuthenticSecretaryAlert({ id: 'field-task:ft-2', type: 'TASK' } as never),
        ).toBe(false);
    });

    it('🛡️ WHITELIST: direct producers (threading/urgent/criminal/lawsuit/execution) مرفوضة', () => {
        const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        expect(
            isAuthenticSecretaryAlert({
                id: 'threading:paused:tx-1',
                type: 'TASK',
                dueAt: tomorrow,
            } as never),
        ).toBe(false);
        expect(
            isAuthenticSecretaryAlert({
                id: 'urgent:urg-1',
                type: 'URGENT',
                dueAt: tomorrow,
            } as never),
        ).toBe(false);
        expect(
            isAuthenticSecretaryAlert({
                id: 'criminal:cr-1:trial:t-1',
                type: 'HEARING',
                dueAt: tomorrow,
            } as never),
        ).toBe(false);
        expect(
            isAuthenticSecretaryAlert({
                id: 'lawsuit:1:nextDate',
                type: 'HEARING',
                dueAt: tomorrow,
            } as never),
        ).toBe(false);
        expect(
            isAuthenticSecretaryAlert({
                id: 'execution:ex-1',
                type: 'EXECUTION',
                dueAt: tomorrow,
            } as never),
        ).toBe(false);
        expect(
            isAuthenticSecretaryAlert({
                id: 'financial:tx-1',
                type: 'TASK',
                dueAt: tomorrow,
            } as never),
        ).toBe(false);
    });
});
