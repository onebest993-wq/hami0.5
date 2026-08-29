import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('dashboard boot stack hit-testing', () => {
    it('Inner: مسار واحد FullBoot — بلا منزل وهمي فوق الشبكة', () => {
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        expect(inner).toContain('LawyerDashboardFullBootPath');
        expect(inner).not.toContain('LazyLawyerDashboardFullBootPath');
        expect(inner).not.toContain('fullBootCoversMinimal');
        expect(inner).not.toContain('data-hami-minimal-boot-layer');
        expect(inner).not.toContain('pointer-events-none fixed inset-0 z-[2]');
    });

    it('FullBootPath: MainView مكشوف بلا غطاء FirstPaint', () => {
        const full = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardFullBootPath.tsx'),
            'utf8',
        );
        expect(full).toContain('data-hami-full-boot-paint-stack');
        expect(full).toContain('data-hami-main-view-layer');
        expect(full).not.toContain('pointer-events-none fixed inset-0 z-[2]');
        expect(full).not.toContain('LawyerDashboardHomeFirstPaint');
        expect(full).not.toContain('showEarlyNotificationShell');
        expect(full).not.toContain('LazyNotificationShell');
        expect(full).toContain('LawyerDashboardSettingsOverlayPortal');
        expect(full).not.toContain('LazySettingsOverlayEntry');
        expect(full).not.toContain('SettingsInstantShell');
        expect(full).not.toContain('settingsWarmHost');
        expect(full).not.toMatch(
            /import \{ LawyerDashboardSettingsOverlayEntry \} from/,
        );
    });

    it('الهيدر فوق غطاء الرئيسية z-index', () => {
        const css = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
            'utf8',
        );
        expect(css).toMatch(/\.hami-lawyer-header\s*\{[^}]*z-index:\s*100/s);
        const header = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerDashboardParts/components/Header.tsx',
            ),
            'utf8',
        );
        expect(header).toContain('z-[100]');
    });
});
