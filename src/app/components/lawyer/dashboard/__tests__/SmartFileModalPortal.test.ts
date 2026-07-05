import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/utils/lawsuitFilesStorage', () => ({
    loadLawsuitFilesRaw: vi.fn(),
}));

import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { resolveFreshSmartFileModalFile } from '../SmartFileModalPortal';

describe('resolveFreshSmartFileModalFile', () => {
    beforeEach(() => {
        vi.mocked(loadLawsuitFilesRaw).mockReset();
    });

    it('prefers the latest stored file with the same id before opening the modal', () => {
        const staleFile = { id: 42, title: 'old', activeStageIndex: 0 };
        const freshFile = { id: 42, title: 'new', activeStageIndex: 2 };
        vi.mocked(loadLawsuitFilesRaw).mockReturnValue([freshFile]);

        expect(resolveFreshSmartFileModalFile(staleFile)).toEqual(freshFile);
    });

    it('falls back to the incoming file when no stored match exists', () => {
        const incomingFile = { id: 77, title: 'incoming', activeStageIndex: 1 };
        vi.mocked(loadLawsuitFilesRaw).mockReturnValue([{ id: 12, title: 'other' }]);

        expect(resolveFreshSmartFileModalFile(incomingFile)).toBe(incomingFile);
    });
});
