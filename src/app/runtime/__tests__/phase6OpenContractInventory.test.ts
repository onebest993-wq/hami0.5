import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function collectTsFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) collectTsFiles(full, out);
        else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
    }
    return out;
}

describe('phase-6 open-contract inventory', () => {
    it('warmExecutionDossierUntilReady لا يُستدعى من مسارات UI خارج العقد', () => {
        const hooksDir = join(process.cwd(), 'src/app/hooks');
        const componentsDir = join(process.cwd(), 'src/app/components/lawyer/dashboard');
        const files = [...collectTsFiles(hooksDir), ...collectTsFiles(componentsDir)];

        const offenders: string[] = [];
        for (const file of files) {
            if (file.includes(`${join('runtime', 'executionOpenContract')}`)) continue;
            const src = readFileSync(file, 'utf8');
            if (!src.includes('warmExecutionDossierUntilReady')) continue;
            // استيراد النوع/إعادة التصدير فقط مسموح في warm module نفسه — لا في hooks
            if (/warmExecutionDossierUntilReady\s*\(/.test(src)) {
                offenders.push(file.replace(process.cwd(), ''));
            }
        }
        expect(offenders).toEqual([]);
    });

    it('openCriminalCase يستخدم criminalOpenContract', () => {
        const src = readFileSync(
            join(process.cwd(), 'src/app/hooks/useLawyerDashboardOverlays.ts'),
            'utf8',
        );
        expect(src).toContain('openCriminalDossierWithContract');
        expect(src).not.toContain('primeCriminalDossierForOpen');
    });

    it('العقود الثلاثة موجودة', () => {
        const runtime = join(process.cwd(), 'src/app/runtime');
        expect(readFileSync(join(runtime, 'executionOpenContract.ts'), 'utf8')).toContain(
            'openExecutionDossierWithContract',
        );
        expect(readFileSync(join(runtime, 'lawsuitOpenContract.ts'), 'utf8')).toContain(
            'openLawsuitDossierWithContract',
        );
        expect(readFileSync(join(runtime, 'criminalOpenContract.ts'), 'utf8')).toContain(
            'openCriminalDossierWithContract',
        );
    });

    it('openExecutionArchiveFile يمر عبر openExecutionDossierWithContract', () => {
        const src = readFileSync(
            join(process.cwd(), 'src/app/hooks/useLawyerExecutionFiles.ts'),
            'utf8',
        );
        expect(src).toContain('openExecutionDossierWithContract');
        expect(src).not.toMatch(/await\s+prepareExecutionDossierOpen/);
    });
});
