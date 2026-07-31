import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('phase-12 LD sync-edge cut', () => {
    it('MainView يحمّل HomeTab بشكل lazy', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(src).toContain('LazyLawyerDashboardHomeTab');
        expect(src).not.toMatch(/import \{ LawyerDashboardHomeTab \} from/);
    });

    it('lawsuitFilesStorage لا يستورد dossierPersistenceService الثقيل', () => {
        const src = readFileSync(join(root, 'src/app/utils/lawsuitFilesStorage.ts'), 'utf8');
        expect(src).toContain('dossierCollectionSyncLite');
        expect(src).not.toContain('dossierPersistenceService');
    });

    it('alertTimeClassification لا يستورد fieldTaskAlerts', () => {
        const src = readFileSync(join(root, 'src/app/services/alertTimeClassification.ts'), 'utf8');
        expect(src).not.toContain("from '@/app/services/fieldTaskAlerts'");
        expect(src).toContain('FIELD_TASK_ALERT_ID_PREFIX');
    });

    it('InstantShells لا تسحب lucide-react', () => {
        for (const rel of [
            'src/app/components/lawyer/dashboard/ArchiveHubInstantShell.tsx',
            'src/app/components/lawyer/dashboard/LawyerNewCaseSelectionInstantShell.tsx',
            'src/app/components/lawyer/dashboard/schedule/ScheduleInstantShell.tsx',
        ]) {
            const src = readFileSync(join(root, rel), 'utf8');
            expect(src, rel).not.toContain("from 'lucide-react'");
            expect(src, rel).toContain('homeStemIcons');
        }
    });
});
