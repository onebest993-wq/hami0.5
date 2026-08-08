import { describe, expect, it } from 'vitest';
import {
    buildFieldTaskAlerts,
    isInjectedFieldTaskAlert,
    stripCalendarDuplicatesForFieldTasks,
} from '../fieldTaskAlerts';
import { classifySecretaryAlertsByHorizon } from '../alertTimeClassification';
import { buildDossierRegistry } from '../alertDossierRegistry';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { SecretaryAlert } from '../SecretaryOrchestrator';

function pendingTask(partial: Partial<LegalTask> & Pick<LegalTask, 'id' | 'title'>): LegalTask {
    return {
        id: partial.id,
        rawText: partial.rawText ?? partial.title,
        title: partial.title,
        location: partial.location ?? null,
        parsedDate: partial.parsedDate ?? null,
        reminderAt: partial.reminderAt ?? null,
        isFatalDeadline: partial.isFatalDeadline ?? false,
        linkedCaseId: partial.linkedCaseId ?? null,
        status: 'pending',
        completedAt: partial.completedAt ?? null,
        pinnedToFieldCurtain: partial.pinnedToFieldCurtain ?? false,
        subTasks: partial.subTasks ?? [],
        documentRequirements: partial.documentRequirements ?? [],
        expenses: partial.expenses ?? [],
    };
}

describe('fieldTaskAlerts', () => {
    const registry = buildDossierRegistry({
        lawsuitFiles: [],
        executionFiles: [],
        urgentCases: [],
        criminalCases: [],
    });
    const now = new Date('2026-05-24T10:00:00');

    it('يحقن مهمة معلّقة بتاريخ اليوم في العاجل', () => {
        const today = new Date(now);
        const alerts = buildFieldTaskAlerts(
            [
                pendingTask({
                    id: 't1',
                    title: 'تبليغ في المحكمة',
                    parsedDate: today,
                    location: 'محكمة الكرخ',
                }),
            ],
            now,
            registry,
        );
        expect(alerts).toHaveLength(1);
        expect(isInjectedFieldTaskAlert(alerts[0]!)).toBe(true);
        expect(alerts[0]?.suggestedAction).toContain('إنجاز المهمة الميدانية');

        const classified = classifySecretaryAlertsByHorizon(alerts, now);
        expect(classified.urgentAlerts.some((a) => a.id === 'field-task:t1')).toBe(true);
    });

    it('يحقن مهمة مؤجلة بتاريخ reminderAt', () => {
        const in3 = new Date(now);
        in3.setDate(in3.getDate() + 3);
        const alerts = buildFieldTaskAlerts(
            [pendingTask({ id: 'sn', title: 'مؤجلة', reminderAt: in3 })],
            now,
            registry,
        );
        expect(alerts.some((a) => a.id === 'field-task:sn')).toBe(true);
    });

    it('يصنّف مهمة ميدانية متأخرة غير منجزة ضمن العاجل', () => {
        const past = new Date(now);
        past.setDate(past.getDate() - 1);
        const alerts = buildFieldTaskAlerts(
            [pendingTask({ id: 'od', title: 'متأخرة', parsedDate: past })],
            now,
            registry,
        );
        expect(alerts.some((a) => a.id === 'field-task:od')).toBe(true);
        const classified = classifySecretaryAlertsByHorizon(alerts, now);
        expect(classified.urgentAlerts.some((a) => a.id === 'field-task:od')).toBe(true);
        expect(classified.upcomingAlerts.some((a) => a.id === 'field-task:od')).toBe(false);
    });

    it('يوزّع 3 أيام في قادم ويستبعد ما بعد 4 أيام', () => {
        const in3 = new Date(now);
        in3.setDate(in3.getDate() + 3);
        const in5 = new Date(now);
        in5.setDate(in5.getDate() + 5);

        const alerts = buildFieldTaskAlerts(
            [
                pendingTask({ id: 'n', title: 'قريبة', parsedDate: in3 }),
                pendingTask({ id: 'u', title: 'بعيدة', parsedDate: in5 }),
            ],
            now,
            registry,
        );
        const classified = classifySecretaryAlertsByHorizon(alerts, now);
        expect(classified.upcomingAlerts.some((a) => a.id === 'field-task:n')).toBe(true);
        expect(classified.upcomingAlerts.some((a) => a.id === 'field-task:u')).toBe(false);
    });

    it('يزيل تكرار تقويم المهمة عند الحقن', () => {
        const injected: SecretaryAlert = {
            id: 'field-task:ft-1',
            type: 'DEADLINE',
            title: 'مهمة',
            summary: 's',
            aiDeepDive: 'd',
            target: 'schedule',
            priority: 3,
            entityId: 'ft-1',
            fieldTaskInjected: true,
            calendarSource: { module: 'field_day_task', entityId: 'ft-1' },
        };
        const calendarDup: SecretaryAlert = {
            id: 'calendar:bridge-1',
            type: 'DEADLINE',
            title: 'مهمة',
            summary: 's',
            aiDeepDive: 'd',
            target: 'schedule',
            priority: 3,
            calendarSource: { module: 'task', entityId: 'ft-1' },
        };
        const out = stripCalendarDuplicatesForFieldTasks([injected, calendarDup]);
        expect(out).toHaveLength(1);
        expect(out[0]?.id).toBe('field-task:ft-1');
    });
});
