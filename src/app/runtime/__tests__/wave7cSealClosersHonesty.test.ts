import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function walkTs(dir: string, out: string[] = []): string[] {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walkTs(p, out);
        else if (ent.name === 'route.ts') out.push(p);
    }
    return out;
}

describe('wave7c BFF + fossils + privileged-role honesty', () => {
    it('GoldButton و fossil animations/shared PerformanceMonitor محذوفان', () => {
        const shared = fs.readFileSync(
            path.join(root, 'src/app/components/SharedComponents.tsx'),
            'utf8',
        );
        expect(shared).not.toContain('GoldButton');
        expect(fs.existsSync(path.join(root, 'src/app/animations/transitions.ts'))).toBe(false);
        expect(
            fs.existsSync(path.join(root, 'src/app/components/shared/PerformanceMonitor.tsx')),
        ).toBe(false);
    });

    it('task-help و notifications يستخدمان requireWifeUser عبر _auth', () => {
        const taskHelp = fs.readFileSync(path.join(root, 'src/app/api/task-help/_auth.ts'), 'utf8');
        expect(taskHelp).toContain('requireWifeUser');
        expect(taskHelp).not.toContain('assertWifeSignatureRequest');
        const notif = fs.readFileSync(path.join(root, 'src/app/api/notifications/_auth.ts'), 'utf8');
        expect(notif).toContain('requireWifeUser');
        for (const file of walkTs(path.join(root, 'src/app/api/notifications'))) {
            const t = fs.readFileSync(file, 'utf8');
            expect(t).toContain('requireNotificationsAuth');
            expect(t).not.toContain('assertWifeSignatureRequest');
        }
    });

    it('AdminLawEntry لا يذكر مفتاح الخدمة المميّز في رسالة العميل', () => {
        const privileged = ['SERVICE', '_ROLE'].join('');
        const rels = [
            'src/app/components/admin/AdminLawEntry.tsx',
            'src/app/components/admin/useAdminLawEntry.ts',
            'src/app/components/admin/adminLawEntryApi.ts',
            'src/app/components/admin/adminLawEntryTypes.ts',
        ];
        for (const rel of rels) {
            const t = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(t).not.toContain(privileged);
        }
    });

    it('حارسك dist بدون مفتاح الخدمة المميّز موجود ومساعد env مبهم', () => {
        expect(fs.existsSync(path.join(root, 'scripts/guard-dist-no-service-role.mjs'))).toBe(true);
        const helper = fs.readFileSync(
            path.join(root, 'src/app/api/security/supabasePrivilegedEnv.ts'),
            'utf8',
        );
        expect(helper).toContain('Date.now');
        const privilegedRoleNeedle = ['SERVICE', '_ROLE'].join('') + '|' + ['service', '_role'].join('');
        expect(helper).not.toMatch(new RegExp(privilegedRoleNeedle));
        expect(helper).not.toContain('atob');
    });
});
