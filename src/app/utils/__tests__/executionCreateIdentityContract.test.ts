import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, beforeEach, vi } from 'vitest';

const saveExecutionFilesRaw = vi.fn();
const touchCacheEntry = vi.fn();
const seedFresh = vi.fn();
const generateId = vi.fn(() => 'generated-should-not-win');

vi.mock('@/app/utils/executionFilesStorage', () => ({
    saveExecutionFilesRaw: (...args: unknown[]) => saveExecutionFilesRaw(...args),
    resolveExecutionFilesStorageKey: () => 'executionFiles',
    bindExecutionFilesStorageOwner: () => 'executionFiles',
    loadExecutionFilesRaw: () => [],
}));

vi.mock('@/app/utils/storageCache', () => ({
    storageCache: {
        set: vi.fn(),
        touchCacheEntry: (...args: unknown[]) => touchCacheEntry(...args),
    },
}));

vi.mock('@/app/utils/executionStorageKeys', () => ({
    generateExecutionDossierId: () => generateId(),
    seedFreshExecutionDossierStorage: (...args: unknown[]) => seedFresh(...args),
}));

describe('execution create identity contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('reuses submit id instead of generating a second dossier id', async () => {
        const { generateExecutionDossierId, seedFreshExecutionDossierStorage } = await import(
            '@/app/utils/executionStorageKeys'
        );
        const submitId = 'submit-id-abc';
        const incoming = { id: submitId, fileNumber: '444', fileYear: '2026', type: 'execution' };
        const dossierId = String(incoming.id ?? '').trim() || generateExecutionDossierId();
        expect(dossierId).toBe(submitId);
        expect(generateId).not.toHaveBeenCalled();

        seedFreshExecutionDossierStorage({ ...incoming, id: dossierId });
        expect(seedFresh).toHaveBeenCalledWith(
            expect.objectContaining({ id: submitId }),
        );
    });

    it('live handleAddExecutionFile reuses submit id (source contract)', () => {
        const src = readFileSync(
            join(process.cwd(), 'src/app/hooks/useLawyerExecutionFiles.ts'),
            'utf8',
        );
        expect(src).toContain("String(newFile.id ?? '').trim()");
        expect(src).toContain('submitId || storageKeys.generateExecutionDossierId()');
        expect(src).toContain('executionFilesRef.current.filter');
        expect(src).not.toMatch(
            /const dossierId = storageKeys\.generateExecutionDossierId\(\);\s*\n\s*const fileWithId/,
        );
        expect(src).not.toMatch(/let nextList: ExecutionFile\[\] = \[\];\s*\n\s*setExecutionFiles/);
    });
});
