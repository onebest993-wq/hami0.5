import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveTaskHelpRecords } from '../taskHelpLocalStore';
import { TaskHelpRepository } from '../taskHelpRepository';
import {
    buildSampleSensitiveTask,
    runPrivateDirectLockScenario,
    runPublicHelpLifecycleScenario,
} from '../taskHelpScenarios';
import { sanitizeTaskForPublic } from '@/app/services/tasks/taskSanitizer';
import { TaskHelpApiService } from '../taskHelpApiService';
import { SecureFetchError } from '@/app/services/SecureAPIClient';

describe('task help scenarios (offline)', () => {
    beforeEach(async () => {
        await saveTaskHelpRecords([]);
    });

    it('public lifecycle: sanitize → first-wins lock → notes ACL → owner review', async () => {
        const task = buildSampleSensitiveTask();
        const result = await runPublicHelpLifecycleScenario({
            owner: { id: 'owner-1', name: 'المالك' },
            helperA: { id: 'helper-a', name: 'زميل أ' },
            helperB: { id: 'helper-b', name: 'زميل ب' },
            stranger: { id: 'stranger-1', name: 'غريب' },
            task,
        });

        expect(result.publicTitle?.startsWith('[طلب مساعدة عامة]')).toBe(true);
        expect(result.publicTitle).not.toMatch(/123456789012/);
        expect(result.secondAcceptCode).toBe('ALREADY_ACCEPTED');
        expect(result.strangerNoteOk).toBe(false);
        expect(result.notesCount).toBe(2);
        expect(result.request.collaborationStatus).toBe('COMPLETED');
        expect(result.request.assigneeId).toBe('helper-a');
        expect(result.request.isSanitised).toBe(true);
    });

    it('private direct: only targeted colleague can accept', async () => {
        const result = await runPrivateDirectLockScenario({
            owner: { id: 'owner-1', name: 'مالك' },
            target: { id: 'target-1', name: 'المستهدف' },
            other: { id: 'other-1', name: 'آخر' },
            taskId: 'task-private-1',
        });
        expect(result.otherCode).toBe('FORBIDDEN');
        expect(result.acceptedByTarget).toBe(true);
        expect(result.finalStatus).toBe('ACCEPTED');
    });

    it('visibility: stranger cannot read private request details', async () => {
        const created = await TaskHelpRepository.create({
            sourceTaskId: 't-vis',
            requesterId: 'owner-1',
            shareScope: 'PRIVATE_DIRECT',
            title: 'سري',
            isSanitised: false,
            targetColleagueId: 'target-1',
        });
        const forStranger = await TaskHelpRepository.getById(created.id, 'stranger-9');
        const forTarget = await TaskHelpRepository.getById(created.id, 'target-1');
        expect(forStranger).toBeNull();
        expect(forTarget?.id).toBe(created.id);
    });

    it('shared notes are capped to avoid unbounded growth', async () => {
        const created = await TaskHelpRepository.create({
            sourceTaskId: 't-notes',
            requesterId: 'owner-1',
            shareScope: 'PRIVATE_DIRECT',
            title: 'ملاحظات',
            isSanitised: false,
            targetColleagueId: 'helper-1',
        });
        await TaskHelpRepository.accept(created.id, 'helper-1');
        for (let i = 0; i < 60; i += 1) {
            await TaskHelpRepository.addNote(created.id, 'helper-1', `ملاحظة ${i}`);
        }
        const latest = await TaskHelpRepository.getById(created.id, 'owner-1');
        expect(latest?.sharedNotes.length).toBe(50);
        expect(latest?.sharedNotes[0]?.text).toBe('ملاحظة 10');
        expect(latest?.sharedNotes.at(-1)?.text).toBe('ملاحظة 59');
    });

    it('invalid complete transitions are rejected', async () => {
        const created = await TaskHelpRepository.create({
            sourceTaskId: 't-state',
            requesterId: 'owner-1',
            shareScope: 'PUBLIC_FORUM',
            title: '[طلب مساعدة عامة] اختبار',
            isSanitised: true,
        });
        const tooEarly = await TaskHelpRepository.complete(created.id, 'helper-1', 'helper_done');
        expect(tooEarly.ok).toBe(false);

        await TaskHelpRepository.accept(created.id, 'helper-1');
        const ownerCannotMarkDone = await TaskHelpRepository.complete(
            created.id,
            'owner-1',
            'helper_done',
        );
        expect(ownerCannotMarkDone.ok).toBe(false);
        if (!ownerCannotMarkDone.ok) expect(ownerCannotMarkDone.code).toBe('FORBIDDEN');
    });
});

describe('sanitizeTaskForPublic regression', () => {
    it('never leaks linkedCaseId / voice / long case numbers into public payload', () => {
        const out = sanitizeTaskForPublic(buildSampleSensitiveTask());
        const blob = JSON.stringify(out);
        expect(blob).not.toContain('case-secret-99');
        expect(blob).not.toContain('hami-voice-ref');
        expect(blob).not.toContain('123456789012');
        expect(blob).not.toContain('أحمد');
        expect(out.location).toBe('محكمة الكرخ');
        expect(out.instructions).toContain('تقديم لائحة');
    });
});

describe('TaskHelpApiService accept does not bypass server lock', () => {
    it('rethrows 409 ALREADY_ACCEPTED without local accept fallback', async () => {
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        const fetchSecure = vi
            .spyOn(SecureAPIClient, 'fetchSecure')
            .mockRejectedValue(
                new SecureFetchError(
                    'HTTP 409',
                    409,
                    JSON.stringify({ ok: false, code: 'ALREADY_ACCEPTED' }),
                    '/api/task-help/accept',
                ),
            );

        await expect(TaskHelpApiService.accept('req-1', 'helper-2', 'ب')).rejects.toMatchObject({
            code: 'ALREADY_ACCEPTED',
            status: 409,
        });

        fetchSecure.mockRestore();
    });
});
