import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dead-modules BFF entry honesty', () => {
    it('يحسب بيان المسارات ومعالج Node كنقاط دخول — لا يُكفّن route.ts الحي', () => {
        const guard = readFileSync(join(process.cwd(), 'scripts/guard-dead-modules.mjs'), 'utf8');
        expect(guard).toMatch(/vercelRouteManifest/);
        expect(guard).toMatch(/vercelNodeHandler/);
        expect(guard).toMatch(/const ENTRY = \[/);
    });
});
