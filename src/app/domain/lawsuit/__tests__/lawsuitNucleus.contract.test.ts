import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('lawsuit nucleus architecture', () => {
    it('وحدات المجال الإنتاجية لا تستورد برميل LawyerShared', () => {
        const dir = join(root, 'src/app/domain/lawsuit');
        const files = readdirSync(dir).filter((name) => name.endsWith('.ts') && !name.startsWith('__'));
        const offenders: string[] = [];
        for (const name of files) {
            const src = readFileSync(join(dir, name), 'utf8');
            if (src.includes("from '@/app/components/lawyer/LawyerShared'")) {
                offenders.push(`${name}:LawyerShared`);
            }
            if (src.includes("from '@/app/components/lawyer/LawyerNewCase")) {
                offenders.push(`${name}:LawyerNewCase`);
            }
            const smartModalImports = [...src.matchAll(/from '@\/app\/components\/lawyer\/smart-modal[^']*'/g)].map(
                (m) => m[0],
            );
            const disallowedSmartModal = smartModalImports.filter(
                (imp) => !imp.includes('partyRoleClassification'),
            );
            if (disallowedSmartModal.length > 0) {
                offenders.push(`${name}:smart-modal`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('حالة الملفات لا تخلط hydrated التنفيذ ولا تعرّض واجهة ميتة', () => {
        const hook = read('src/app/hooks/useLawsuitFilesState.ts');
        expect(hook).not.toContain('storageHydrated: lawsuitStorageHydrated');
        expect(hook).not.toContain('replaceLawsuitFiles');
        expect(hook).not.toContain('persistActiveRecord');
        expect(hook).toContain('lawsuitStorageHydrated');
        expect(hook).toContain('persistLawsuitActiveBundle');
        expect(hook).toContain('runLawsuitFilesHydrateCycle');
        expect(hook).not.toContain('saveLawsuitFilesRaw');
        expect(hook).not.toContain('persistLawsuitActiveSegment(');
    });

    it('المخزن والـ Host لا يكتبان المرآة الخام مباشرة', () => {
        const chrome = read('src/app/components/lawyer/ArchivePortal/LawsuitArchiveChrome.tsx');
        const host = read('src/app/components/lawyer/dashboard/LawsuitsWorkspaceHost.tsx');
        const grid = read(
            'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid.tsx',
        );
        expect(chrome).not.toContain('saveLawsuitFilesRaw');
        expect(host).not.toContain('saveLawsuitFilesRaw');
        expect(host).toContain('lawsuitArchivePool');
        expect(host).not.toContain('lawsuitFileFactory');
        expect(grid).not.toContain('saveLawsuitFilesRaw');
        expect(grid).toContain('isLawsuitDecryptBlocked');
        expect(host).not.toContain('persistLawsuitActiveSegment');
    });

    it('كتابة النشط الموحّدة تمر من البوابة لا من المقطع مباشرة في المستودع', () => {
        const repo = read('src/app/domain/lawsuit/lawsuitFilesRepository.ts');
        const mut = read('src/app/domain/lawsuit/lawsuitFilesSegmentMutations.ts');
        expect(repo).toContain('persistLawsuitActiveBundle');
        expect(repo).not.toContain('persistLawsuitActiveSegment(');
        expect(mut).toContain('persistLawsuitActiveBundle');
        expect(mut).not.toContain('persistLawsuitActiveSegment(');
    });
});
