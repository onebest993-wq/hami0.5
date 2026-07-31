import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave7 seal progress honesty', () => {
    it('الختم ما زال false في FOUNDATION-STATUS و close', () => {
        const status = fs.readFileSync(path.join(root, '.cursor/FOUNDATION-STATUS.md'), 'utf8');
        expect(status).toMatch(/foundationWorldClassSealed\s*=\s*false/);
        const close = JSON.parse(
            fs.readFileSync(path.join(root, '.cursor/wave7-seal-progress-close.json'), 'utf8'),
        ) as { foundationWorldClassSealed: boolean };
        expect(close.foundationWorldClassSealed).toBe(false);
    });

    it('أحافير AuthService/App/appStore محذوفة', () => {
        expect(fs.existsSync(path.join(root, 'src/app/services/AuthService.ts'))).toBe(false);
        expect(fs.existsSync(path.join(root, 'src/app/App.tsx'))).toBe(false);
        expect(fs.existsSync(path.join(root, 'src/app/stores/appStore.ts'))).toBe(false);
    });

    it('lawsuit cloud لم يعد NOOP مبكرًا', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/services/cloudSyncEngine.ts'), 'utf8');
        expect(src).toContain('getLawsuitFiles');
        expect(src).not.toMatch(/bucket === 'lawsuit'[\s\S]{0,120}return \{ ok: true \};/);
    });
});
