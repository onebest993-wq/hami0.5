import { describe, expect, it, beforeEach } from 'vitest';
import {
    isBridgedCalendarEvent,
    propagateBridgedCalendarUpdate,
    propagateBridgedCalendarRemoval,
} from '../calendarBridgePersistence';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import { persistLawsuitActiveBundle } from '@/app/domain/lawsuit/lawsuitDurabilityGate';
import { emptyLawsuitLifecycleIndex } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import { readLawsuitActiveSegment } from '@/app/domain/lawsuit/lawsuitSegmentPersist';
import { LAWSUIT_FILES_ACTIVE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import SecureStoreService from '@/app/services/SecureStoreService';

function seedLawsuitFile(overrides: Record<string, unknown> = {}): FileData {
    return {
        id: 42,
        type: 'lawsuit',
        status: 'active',
        caseNo: '1/2026',
        court: 'بداءة',
        parties: [],
        history: [],
        notes: [],
        images: [],
        date: '2026-01-01',
        ...overrides,
    } as FileData;
}

describe('calendarBridgePersistence', () => {
    beforeEach(() => {
        try {
            SecureStoreService.deleteItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        } catch {
            /* ignore */
        }
    });

    it('isBridgedCalendarEvent detects module-linked events', () => {
        const manual: CalendarEvent = {
            id: '1',
            userId: 'u',
            title: 'x',
            date: '2026-03-01',
            type: 'custom',
            createdAt: '',
            updatedAt: '',
            sourceModule: 'manual',
            sourceEntityId: 'a',
            sourceEventId: 'b',
        };
        const lawsuit: CalendarEvent = {
            ...manual,
            sourceModule: 'lawsuit',
        };
        expect(isBridgedCalendarEvent(manual)).toBe(false);
        expect(isBridgedCalendarEvent(lawsuit)).toBe(true);
    });

    it('propagateBridgedCalendarUpdate patches lawsuit task due date in storage', async () => {
        const file = seedLawsuitFile({
            stages: [
                {
                    id: 's1',
                    name: 'أولى',
                    status: 'active',
                    tasks: [{ id: 't1', title: 'مهمة قديمة', dueDate: '2026-01-01', isCompleted: false }],
                },
            ],
        });
        expect(
            persistLawsuitActiveBundle({
                active: [file],
                index: emptyLawsuitLifecycleIndex(),
            }).ok,
        ).toBe(true);

        const event: CalendarEvent = {
            id: 'hami_bridge_lawsuit_42_task_t1',
            userId: 'dev-user-uuid-1',
            title: 'مهمة: مهمة محدثة',
            date: '2026-05-20',
            type: 'deadline',
            createdAt: '',
            updatedAt: '',
            sourceModule: 'lawsuit',
            sourceEntityId: '42',
            sourceEventId: 'task_t1',
        };

        const ok = await propagateBridgedCalendarUpdate(event);
        expect(ok).toBe(true);

        const files = readLawsuitActiveSegment();
        const task = files[0]?.stages?.[0]?.tasks?.[0];
        expect(task?.dueDate).toBe('2026-05-20');
        expect(task?.title).toBe('مهمة محدثة');
    });

    it('propagate لا يكتب كيس الخطوات القديم عند مصدر transaction', async () => {
        const event: CalendarEvent = {
            id: 'hami_bridge_transaction_tx1_step1',
            userId: 'u',
            title: 'خطوة قديمة',
            date: '2026-05-20',
            type: 'consultation',
            createdAt: '',
            updatedAt: '',
            sourceModule: 'transaction',
            sourceEntityId: 'tx1',
            sourceEventId: 'step1',
        };
        expect(await propagateBridgedCalendarUpdate(event)).toBe(false);
        expect(await propagateBridgedCalendarRemoval(event)).toBe(false);
    });
});
