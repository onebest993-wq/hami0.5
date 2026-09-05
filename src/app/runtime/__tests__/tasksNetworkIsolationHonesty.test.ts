/**
 * قسم المهام: العزل شبكي لا تشفيري.
 *
 * المسار اليومي بلا إنترنت وبلا WIFE — طلب العون خلف `canReachCollaborationNetwork`
 * (قطع الاتصال). التشفير عند الراحة يبقى. مزامنة الإضابير منفصلة.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
    isEncryptOrFailStorageKey,
    isSensitiveStorageKey,
    isWarmEncryptAlwaysKey,
    shouldEncryptValue,
} from '@/app/services/secureStorageKeys';
import { isProtectedStorageKey, isTaskHelpRequestsKey } from '@/app/services/dossierPersistence/protectedStorageKeys';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

function walkTs(dir: string, visit: (rel: string, src: string) => void): void {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            if (name === '__tests__') continue;
            walkTs(full, visit);
            continue;
        }
        if (!/\.(ts|tsx)$/.test(name)) continue;
        visit(full.slice(root.length + 1).replace(/\\/g, '/'), readFileSync(full, 'utf8'));
    }
}

describe('tasks network isolation (encryption kept)', () => {
    it('مفاتيح القسم حسّاسة وتُشفَّر — لا استثناء plaintext', () => {
        for (const key of ['hami_quantum_legal_tasks_v1', 'hami_task_help_requests_v1'] as const) {
            expect(isSensitiveStorageKey(key)).toBe(true);
            expect(isWarmEncryptAlwaysKey(key)).toBe(true);
            expect(isEncryptOrFailStorageKey(key)).toBe(true);
            expect(shouldEncryptValue(key, '{"tasks":[]}')).toBe(true);
        }
        expect(isProtectedStorageKey('hami_quantum_legal_tasks_v1')).toBe(true);
        expect(isTaskHelpRequestsKey('hami_task_help_requests_v1')).toBe(true);
        expect(isProtectedStorageKey('hami_task_help_requests_v1')).toBe(true);
    });

    it('الحفظ اليومي بلا fetch ولا WIFE ولا kv-proxy', () => {
        const storage = read('src/app/utils/quantumTasksStorage.ts');
        expect(storage).toContain('writeSecureAndClearLegacySync');
        expect(storage).toContain('publishQuantumTasksMetrics');
        expect(storage).not.toMatch(/\bpeekSecureOrLegacySync\b/);
        expect(storage).not.toMatch(/\bgetItemSync\b/);
        expect(storage).not.toMatch(/\bfetch\s*\(/);
        expect(storage).not.toContain('fetchSecure');
        expect(storage).not.toContain('lawyerCloudKv');
        expect(storage).not.toContain('/api/');
        expect(storage).not.toContain('CryptoService');
        const provider = read('src/app/context/QuantumTasksProvider.tsx');
        expect(provider).not.toContain('fetchSecure');
        expect(provider).not.toContain('lawyerCloudKv');
        expect(provider).not.toContain('/api/task-help');
        const local = read('src/app/services/taskHelp/taskHelpLocalStore.ts');
        expect(local).toContain('hami_task_help_requests_v1');
        expect(local).not.toContain('fetchSecure');
        expect(local).not.toContain('/api/');
    });

    it('طلب العون والزملاء خلف canReachCollaborationNetwork لا مزامنة الإضابير', () => {
        const help = read('src/app/services/taskHelp/taskHelpApiService.ts');
        expect(help).toContain('canReachTaskHelpNetwork');
        expect(help).toContain('canReachCollaborationNetwork');
        expect(help).not.toContain('isLawyerWorkCloudLive');
        expect(help).toMatch(/if \(canReachTaskHelpNetwork\(\)\)/);
        expect(help).toContain('/api/task-help/');
        const actions = read('src/app/services/taskHelp/quantumTaskHelpActions.ts');
        expect(actions).toContain('canReachCollaborationNetwork');
        expect(actions).toContain('ForumApiService.createPost');
        expect(actions).toMatch(/PUBLIC_FORUM' && canReachCollaborationNetwork\(\)/);
        expect(actions).not.toContain('isLawyerWorkCloudLive');
        const modal = read(
            'src/app/components/lawyer/dashboard/tasksManager/RequestHelpModal.tsx',
        );
        expect(modal).toContain('canReachCollaborationNetwork');
        expect(modal).not.toContain('isLawyerWorkCloudLive');
        expect(modal).toContain('CaseShareApiService.listNetworkColleagues');
        const checkpoint = read('src/app/services/cloud/workCloudCheckpoint.ts');
        expect(checkpoint).not.toContain('hami_quantum_legal_tasks');
        expect(checkpoint).not.toContain('quantumTasks');
    });

    it('المسار الحي للتقويم لا يزامن عناوين المهام', () => {
        const orch = read('src/app/services/calendar/dossierSync/orchestrator.ts');
        expect(orch).toContain('void params.fieldTasks');
        expect(orch).not.toMatch(/syncFieldTasksToCalendar\s*\(/);
        expect(orch).toContain("task: ['quantum field tasks parsedDate / reminderAt']");
        const patch = read('src/app/services/calendar/bridgePersistence/shared.ts');
        expect(patch).toContain('persistQuantumTasksSync');
        expect(patch).toContain('QUANTUM_TASKS_CHANGED_EVENT');
        expect(patch).not.toMatch(/persistenceRepository\.save\(QUANTUM_TASKS_STORAGE_KEY/);
    });

    it('مكونات المهام اليومية لا تستورد ForumApiService مباشرة', () => {
        const forumImporters: string[] = [];
        walkTs(join(root, 'src/app/components/lawyer/dashboard/tasksManager'), (rel, src) => {
            if (src.includes('ForumApiService') || src.includes("'/api/forum")) {
                forumImporters.push(rel);
            }
        });
        walkTs(join(root, 'src/app/components/lawyer/dashboard/fieldTasks'), (rel, src) => {
            if (src.includes('ForumApiService') || src.includes("'/api/forum")) {
                forumImporters.push(rel);
            }
        });
        expect(forumImporters).toEqual([]);
        expect(read('src/app/utils/quantumTasksStorage.ts')).not.toContain('ForumApiService');
    });
});
