import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src/app/components/lawyer/personal-status');

function read(name: string): string {
    return fs.readFileSync(path.join(root, name), 'utf8');
}

describe('personal-status structural closure', () => {
    it('PersonalStatusDossierBody has no @ts-nocheck and uses derived flags helper', () => {
        const body = read('PersonalStatusDossierBody.tsx');
        expect(body).not.toContain('@ts-nocheck');
        expect(body).toContain('derivePersonalStatusDossierFlags');
        expect(body).toContain('buildPersonalStatusSessionHubProps');
    });

    it('PersonalStatusSmartFileChrome hides edit/trash when viewing archived', () => {
        const chrome = read('PersonalStatusSmartFileChrome.tsx');
        expect(chrome).toContain('isViewingArchived');
        expect(chrome).toContain('أرشيف');
    });

    it('dead PersonalStatusLawReferenceHub removed — law ref via ActionDock portal', () => {
        expect(fs.existsSync(path.join(root, 'PersonalStatusLawReferenceHub.tsx'))).toBe(false);
        const dock = read('PersonalStatusActionDock.tsx');
        expect(dock).toContain('PersonalStatusLawReferencePortal');
    });

    it('FAB prefetches personal jurisdiction chunk on intent', () => {
        const fab = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/lawyer/dashboard/LawsuitsAddCaseFabWithPicker.tsx'),
            'utf8',
        );
        expect(fab).toContain("id === 'personal'");
        expect(fab).toContain('PersonalStatusNewCaseForm');
    });

    it('lawsuit mutation guard blocks archived saves in smart-file persist', () => {
        const persist = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/lawyer/smart-modal/hooks/useSmartFilePersist.ts'),
            'utf8',
        );
        expect(persist).toContain('rejectLawsuitFileMutation');
        const guard = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitFileMutationGuard.ts'),
            'utf8',
        );
        expect(guard).toContain('isLawsuitFileArchived');
    });
});
