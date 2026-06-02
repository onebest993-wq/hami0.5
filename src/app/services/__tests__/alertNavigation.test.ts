import { describe, expect, it } from 'vitest';
import { resolveAlertNavigation } from '../alertNavigation';
import type { SecretaryAlert } from '../SecretaryOrchestrator';
import type { LegalTask } from '@/app/types/TaskEngine';

function alert(partial: Partial<SecretaryAlert> & Pick<SecretaryAlert, 'target'>): SecretaryAlert {
    return {
        id: 'test',
        type: 'TASK',
        title: 't',
        summary: 's',
        aiDeepDive: 'd',
        priority: 2,
        ...partial,
    };
}

describe('resolveAlertNavigation', () => {
    it('يفتح التقويم', () => {
        expect(resolveAlertNavigation(alert({ target: 'schedule' }))).toEqual({
            kind: 'tab',
            tab: 'schedule',
        });
    });

    it('يفتح إضبارة دعوى', () => {
        expect(resolveAlertNavigation(alert({ target: 'lawsuit', entityId: '10' }))).toEqual({
            kind: 'open_lawsuit',
            entityId: '10',
        });
    });

    it('يعيد noop بدون entityId', () => {
        expect(resolveAlertNavigation(alert({ target: 'lawsuit' }))).toEqual({ kind: 'noop' });
    });

    it('يفتح معاملة إدارية Threading', () => {
        expect(resolveAlertNavigation(alert({ target: 'threading', entityId: 'tx-9' }))).toEqual({
            kind: 'threading_tx',
            entityId: 'tx-9',
        });
    });

    it('يفتح قضية جزائية', () => {
        expect(resolveAlertNavigation(alert({ target: 'criminal', entityId: 'cr-1' }))).toEqual({
            kind: 'open_criminal',
            entityId: 'cr-1',
        });
    });

    it('يفتح دعوى من مصدر تقويم لمهمة ميدان مربوطة', () => {
        expect(
            resolveAlertNavigation(
                alert({
                    target: 'schedule',
                    entityId: 'task-1',
                    calendarSource: {
                        module: 'task',
                        entityId: 'task-1',
                        dossierModule: 'lawsuit',
                        dossierId: 'file-55',
                    },
                }),
            ),
        ).toEqual({ kind: 'open_lawsuit', entityId: 'file-55' });
    });

    it('يفتح ستارة الميدان لمهمة غير مربوطة', () => {
        const fieldTasks: LegalTask[] = [
            {
                id: 'task-orphan',
                title: 'زيارة',
                status: 'pending',
                rawText: '',
                subTasks: [],
                pinnedToFieldCurtain: false,
                isFatalDeadline: false,
                createdAt: new Date(),
            },
        ];
        expect(
            resolveAlertNavigation(
                alert({
                    target: 'schedule',
                    entityId: 'task-orphan',
                    calendarSource: { module: 'task', entityId: 'task-orphan' },
                }),
                { fieldTasks },
            ),
        ).toEqual({ kind: 'open_field_tasks' });
    });

    it('يفتح ملاحظة مربوطة بإضبارة', () => {
        expect(
            resolveAlertNavigation(
                alert({
                    target: 'notepad',
                    entityId: 'note-9',
                    calendarSource: {
                        module: 'note',
                        entityId: 'note-9',
                        dossierModule: 'lawsuit',
                        dossierId: 'file-2',
                    },
                }),
            ),
        ).toEqual({ kind: 'open_lawsuit', entityId: 'file-2' });
    });
});
