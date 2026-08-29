import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiRoot = path.join(root, 'src/app/api');

function walkRouteTs(dir: string, out: string[] = []): string[] {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walkRouteTs(p, out);
        else if (ent.name === 'route.ts') out.push(p);
    }
    return out;
}

describe('wave7d BFF auth unify honesty', () => {
    it('لا يبقى assertWifeSignatureRequest في أي route.ts تحت api/', () => {
        const hits: string[] = [];
        for (const file of walkRouteTs(apiRoot)) {
            const t = fs.readFileSync(file, 'utf8');
            if (t.includes('assertWifeSignatureRequest')) {
                hits.push(path.relative(root, file).replace(/\\/g, '/'));
            }
        }
        expect(hits).toEqual([]);
    });

    it('مسارات forum/upload/kv/case-share/csrf تستخدم requireWifeUser أو requireForumAuth', () => {
        const samples = [
            'src/app/api/forum/ban/route.ts',
            'src/app/api/forum/stats/route.ts',
            'src/app/api/forum/notifications/route.ts',
            'src/app/api/forum/reports/route.ts',
            'src/app/api/upload/route.ts',
            'src/app/api/kv-proxy/route.ts',
            'src/app/api/case-share/route.ts',
            'src/app/api/security/csrf/route.ts',
            'src/app/api/security/wife-session/route.ts',
        ];
        for (const rel of samples) {
            const t = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(
                t.includes('requireWifeUser') ||
                    t.includes('requireForumAuth') ||
                    t.includes('requireTrustedHeadquartersAdmin'),
                rel,
            ).toBe(true);
        }
    });
});
