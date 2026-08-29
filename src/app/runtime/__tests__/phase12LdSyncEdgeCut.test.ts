import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('phase-12 LD sync-edge cut', () => {
    it('MainView يبقي غلاف HomeTab متزامناً؛ المحتوى كسول عبر الـ loader', () => {
        const src = readLawyerDashboardMainViewSurface();
        const wrap = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(src).toMatch(/import \{ LawyerDashboardHomeTab \} from/);
        expect(src).not.toContain('LazyLawyerDashboardHomeTab');
        expect(wrap).toContain('getHomeTabContentSync');
        expect(wrap).not.toContain('getCommandHubTilesSync');
        expect(wrap).toContain('loadHomeTabContent');
        expect(wrap).not.toMatch(/from ['"]\.\/HomeTabContent['"]/);
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
        /* حُذف `schedule/ScheduleInstantShell.tsx`: لم يستورده أحد بعد انتقال
         * تبويب التقويم إلى استيراد ثابت مع keepAlive. فحصُ أيقوناته كان يقيس ملفاً
         * لا يُشحن. */
        for (const rel of [
            'src/app/components/lawyer/dashboard/ArchiveHubInstantShell.tsx',
            'src/app/components/lawyer/dashboard/LawyerNewCaseSelectionInstantShell.tsx',
        ]) {
            const src = readFileSync(join(root, rel), 'utf8');
            expect(src, rel).not.toContain("from '@/app/components/ui/lucideIcons'");
            expect(src, rel).toContain('homeStemIcons');
        }
    });
});
