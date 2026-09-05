import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(...parts: string[]): string {
    return readFileSync(join(root, ...parts), 'utf8');
}

describe('tasks security close honesty', () => {
    it('التشفير عند الراحة: مهام وطلبات عون — تشفير أو فشل', () => {
        const keys = src('src/app/services/secureStorageKeys.ts');
        expect(keys).toContain("'hami_quantum_legal_tasks_v1'");
        expect(keys).toContain("'hami_task_help_requests_v1'");
        expect(keys).toContain('isEncryptOrFailStorageKey');
        expect(keys).toMatch(/key === 'hami_quantum_legal_tasks_v1'/);
        expect(keys).toMatch(/key === 'hami_task_help_requests_v1'/);
        const neverBlock = keys.slice(
            keys.indexOf('NEVER_ENCRYPT_KEYS'),
            keys.indexOf('export const ENCRYPTED_EXACT_KEYS'),
        );
        expect(neverBlock).not.toContain('hami_quantum_legal_tasks_v1');
        expect(neverBlock).not.toContain('hami_task_help_requests_v1');
        const persist = src('src/app/utils/quantumTasksStorage.ts');
        expect(persist).toContain('writeSecureAndClearLegacySync');
        expect(persist).not.toMatch(/localStorage\.setItem\(QUANTUM_TASKS_STORAGE_KEY/);
        const leftover = src('src/app/services/storage/readSecureOrDrainLegacySync.ts');
        expect(leftover).toContain('لا تُمحى مرآة leftover فوق فشل الكتابة');
    });

    it('حارس المسح يحمي الأجندة وطلبات العون الباردة', () => {
        const guard = src('src/app/services/dossierPersistence/protectedStorageKeys.ts');
        expect(guard).toContain('isTaskHelpRequestsKey');
        expect(guard).toContain("'hami_task_help_requests_v1'");
        const wipe = src('src/app/services/dossierPersistence/dossierWipeGuard.ts');
        expect(wipe).toContain("storageKey === QUANTUM_TASKS_STORAGE_KEY");
        const sanitizer = src('src/app/services/tasks/taskSanitizer.ts');
        expect(sanitizer).toContain('sanitizeTaskForPublic');
        const create = src('src/app/api/task-help/create/route.ts');
        expect(create).toContain('enforcePublicSanitization');
    });

    it('WIFE على مسار العون الخادمي فقط — لا على الحفظ المحلي', () => {
        const storage = src('src/app/utils/quantumTasksStorage.ts');
        expect(storage).not.toContain('requireWife');
        expect(storage).not.toContain('wifeValidator');
        const provider = src('src/app/context/QuantumTasksProvider.tsx');
        expect(provider).not.toContain('requireWife');
        const auth = src('src/app/api/task-help/_auth.ts');
        expect(auth).toContain('requireWifeCloudWrite');
        expect(existsSync(join(root, 'src/app/api/task-help/list/route.ts'))).toBe(true);
    });
});

describe('tasks cleanliness close honesty', () => {
    it('حوارات الأجندة مقسومة وحقول التعديل خارج الملف الأم', () => {
        const modals = src(
            'src/app/components/lawyer/dashboard/tasksManager/TasksManagerModals.tsx',
        );
        expect(modals).toContain('TasksManagerModalFields');
        expect(modals).not.toContain('function EditTaskFields');
        expect(modals).not.toContain('function ReminderSnoozeActions');
        const fields = src(
            'src/app/components/lawyer/dashboard/tasksManager/TasksManagerModalFields.tsx',
        );
        expect(fields).toContain('export function EditTaskFields');
        expect(fields).toContain('export function ReminderSnoozeActions');
        const modalsBytes = statSync(
            join(root, 'src/app/components/lawyer/dashboard/tasksManager/TasksManagerModals.tsx'),
        ).size;
        expect(modalsBytes).toBeLessThan(18_000);
    });

    it('لا قشرة فورية ميتة لستارة المهام', () => {
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksInstantSheetShell.tsx',
                ),
            ),
        ).toBe(false);
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksWarmSheetBridge.tsx',
                ),
            ),
        ).toBe(false);
        const deserialize = src('src/app/utils/quantumTasksStorageDeserialize.ts');
        expect(deserialize).not.toContain('SecureStore');
        expect(deserialize).not.toMatch(/from ['"][^'"]*nlpParser['"]/);
    });
});
