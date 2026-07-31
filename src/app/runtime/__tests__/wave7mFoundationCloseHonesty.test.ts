import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave7m foundation close honesty', () => {
    it('personalStatusValidation لا يسحب lucide عبر constants', () => {
        const validation = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/personal-status/personalStatusValidation.ts'),
            'utf8',
        );
        const wordLists = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerNewCase/wordLists.ts'),
            'utf8',
        );
        const constants = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerNewCase/constants.ts'),
            'utf8',
        );
        expect(validation).toContain("from '@/app/components/lawyer/LawyerNewCase/wordLists'");
        expect(validation).not.toContain('LawyerNewCase/constants');
        expect(wordLists).not.toContain('lucide-react');
        expect(constants).not.toContain('lucide-react');
        expect(constants).toContain('homeStemIcons');
    });

    it('TransactionsHubInstantShell لا يسحب lucide إلى LD عبر LazyFallback', () => {
        const shell = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/TransactionsThreading/TransactionsHubInstantShell.tsx',
            ),
            'utf8',
        );
        expect(shell).not.toContain('lucide-react');
        expect(shell).toContain('HomeSearchIcon');
        expect(shell).toContain('homeStemIcons');
    });

    it('InstantShells/BootChrome الباردة لا تستورد lucide-react', () => {
        const files = [
            'src/app/components/lawyer/TransactionsThreading/TransactionsHubInstantShell.tsx',
            'src/app/components/lawyer/RoyalLawyerProfile/ProfileInstantShell.tsx',
            'src/app/components/lawyer/CommunityScreen/components/ForumInstantShell.tsx',
            'src/app/components/lawyer/FinancialOperationsCenter/FocInstantShell.tsx',
            'src/app/components/lawyer/dashboard/LawsuitsCivilArchiveInstantShell.tsx',
            'src/app/components/lawyer/SmartRepository/RepositoryInstantShell.tsx',
            'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksInstantSheetShell.tsx',
            'src/app/components/lawyer/dashboard/SmartFileModalBootChrome.tsx',
            'src/app/components/lawyer/dashboard/ExecutionCreationBootShell.tsx',
            'src/app/components/lawyer/CommunityScreen/components/ForumBootShell.tsx',
            'src/app/components/lawyer/criminal-system/CriminalDashboardBootChrome.tsx',
        ];
        for (const rel of files) {
            const text = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(text, rel).not.toContain('lucide-react');
            expect(text, rel).toContain('homeStemIcons');
        }
    });
});
