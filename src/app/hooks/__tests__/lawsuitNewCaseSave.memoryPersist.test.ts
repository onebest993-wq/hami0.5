import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import SecureStoreService from '@/app/services/SecureStoreService';
import { LAWSUIT_FILES_ACTIVE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    LAWSUIT_PENDING_CREATES_KEY,
    clearLawsuitPendingCreatesForTests,
} from '@/app/domain/lawsuit/lawsuitPendingCreateStore';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: vi.fn(),
    reconcileBodyScrollLock: vi.fn(),
}));

vi.mock('@/app/hooks/lawsuitPersistDeferred', () => ({
    saveCaseDeferred: vi.fn(),
    syncLawsuitFileToCalendarDeferred: vi.fn(),
}));

vi.mock('@/app/domain/lawsuit/lawsuitPersistFlush', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/domain/lawsuit/lawsuitPersistFlush')>();
    return {
        ...actual,
        flushLawsuitWorkspacePersist: vi.fn(async () => true),
        awaitLawsuitWorkspaceCommit: vi.fn(async () => ({ ok: true })),
    };
});

describe('performLawsuitNewCaseSave — no hang, sync create', () => {
    beforeEach(() => {
        SecureStoreService.dropMemoryMirrorsForTests?.();
        try {
            SecureStoreService.deleteItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        } catch {
            /* ignore */
        }
        try {
            clearLawsuitPendingCreatesForTests();
        } catch {
            /* ignore */
        }
    });

    it('completes under 500ms without awaiting crypto warm', async () => {
        const { SmartToast } = await import('@/app/components/ui/SmartToast');
        const { performLawsuitNewCaseSave } = await import('@/app/hooks/lawsuitNewCaseSave');

        const payload = {
            mainCategory: 'lawsuit',
            selectedType: 'personal',
            parties1: [{ id: 1, name: 'مدعي', status: 'المدعي', isClient: true }],
            parties2: [{ id: 2, name: 'مدعى عليه', status: 'المدعى عليه', isClient: false }],
            thirdParties: [],
            applicableLaw: 'law_188_1959',
            details: {
                court: 'محكمة الأحوال الشخصية',
                type: 'طلاق',
                stage: 'بداءة',
                number: '1/ب/2026',
                applicableLaw: 'law_188_1959',
            },
        };

        let filesState: FileData[] = [];
        const started = Date.now();
        const ok = await performLawsuitNewCaseSave({
            data: payload,
            files: filesState,
            subFileBase: null,
            incidentalSpawnContext: null,
            consolidationSpawnContext: null,
            userId: null,
            setFiles: (action) => {
                filesState = typeof action === 'function' ? action(filesState) : action;
            },
            setLawsuitSegments: vi.fn(),
            setActiveFile: vi.fn(),
            setIsNewCaseModalOpen: vi.fn(),
            setSubFileBase: vi.fn(),
            setIncidentalSpawnContext: vi.fn(),
            persistConsolidatedFiles: vi.fn(),
            resetSpawnContexts: vi.fn(),
        });
        const elapsed = Date.now() - started;

        expect(ok).toBe(true);
        expect(elapsed).toBeLessThan(500);
        expect(vi.mocked(SmartToast.error).mock.calls).toEqual([]);
        expect(filesState.length).toBeGreaterThanOrEqual(1);
        const pending = SecureStoreService.getItemSync(LAWSUIT_PENDING_CREATES_KEY);
        const mem = SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        expect(localStorage.getItem(LAWSUIT_PENDING_CREATES_KEY)).toBeNull();
        expect(Boolean(pending) || Boolean(mem)).toBe(true);
    });
});
