import { describe, expect, it, beforeEach } from 'vitest';
import { TaskHelpRepository } from '../taskHelpRepository';
import { saveTaskHelpRecords } from '../taskHelpLocalStore';

describe('TaskHelpRepository concurrency lock', () => {
    beforeEach(async () => {
        await saveTaskHelpRecords([]);
    });

    it('accepts first colleague and rejects second while PENDING→ACCEPTED', async () => {
        const created = await TaskHelpRepository.create({
            sourceTaskId: 'task-1',
            requesterId: 'owner-1',
            shareScope: 'PUBLIC_FORUM',
            title: '[طلب مساعدة عامة] جلسة',
            isSanitised: true,
        });
        expect(created.collaborationStatus).toBe('PENDING');

        const first = await TaskHelpRepository.accept(created.id, 'helper-1', 'زميل أ');
        expect(first.ok).toBe(true);
        if (first.ok) {
            expect(first.request.collaborationStatus).toBe('ACCEPTED');
            expect(first.request.assigneeId).toBe('helper-1');
        }

        const second = await TaskHelpRepository.accept(created.id, 'helper-2', 'زميل ب');
        expect(second.ok).toBe(false);
        if (!second.ok) expect(second.code).toBe('ALREADY_ACCEPTED');
    });

    it('moves ACCEPTED → AWAITING_OWNER_REVIEW → COMPLETED', async () => {
        const created = await TaskHelpRepository.create({
            sourceTaskId: 'task-2',
            requesterId: 'owner-1',
            shareScope: 'PRIVATE_DIRECT',
            title: 'طلب خاص',
            isSanitised: false,
            targetColleagueId: 'helper-1',
        });
        const accepted = await TaskHelpRepository.accept(created.id, 'helper-1');
        expect(accepted.ok).toBe(true);

        const done = await TaskHelpRepository.complete(created.id, 'helper-1', 'helper_done');
        expect(done.ok).toBe(true);
        if (done.ok) expect(done.request.collaborationStatus).toBe('AWAITING_OWNER_REVIEW');

        const confirmed = await TaskHelpRepository.complete(created.id, 'owner-1', 'owner_confirm');
        expect(confirmed.ok).toBe(true);
        if (confirmed.ok) expect(confirmed.request.collaborationStatus).toBe('COMPLETED');
    });
});
