import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave7m foundation close honesty', () => {
    it('personalStatusValidation يسحب كلمات الحظر من wordLists بلا gateway icons', () => {
        const validation = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/personal-status/personalStatusValidation.ts'),
            'utf8',
        );
        const constants = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerNewCase/constants.ts'),
            'utf8',
        );
        expect(validation).toContain("from '@/app/components/lawyer/LawyerNewCase/wordLists'");
        expect(validation).not.toContain('LawyerNewCase/constants');
        expect(validation).not.toContain('lucide-react');
        expect(constants).not.toContain('lucide-react');
        expect(constants).not.toContain('homeStemIcons');
    });

    it('InstantShells/BootChrome الباردة لا تستورد lucide-react', () => {
        const files = [
            'src/app/components/lawyer/dashboard/LawsuitsCivilArchiveInstantShell.tsx',
            'src/app/components/lawyer/dashboard/SmartFileModalBootChrome.tsx',
            'src/app/components/lawyer/dashboard/ExecutionCreationBootShell.tsx',
            'src/app/components/lawyer/criminal-system/CriminalDashboardBootChrome.tsx',
        ];
        for (const rel of files) {
            const text = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(text, rel).not.toContain('lucide-react');
            const usesColdIconSurface =
                text.includes('homeStemIcons') ||
                text.includes('lucideIcons') ||
                text.includes('components/ui/icons/') ||
                text.includes('ArchiveDossierToolbar') ||
                text.includes('DossierHeaderNavButtons');
            expect(usesColdIconSurface, rel).toBe(true);
        }
    });
});
