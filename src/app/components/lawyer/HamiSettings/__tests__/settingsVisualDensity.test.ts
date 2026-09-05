import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const settings = join(root, 'src/app/components/lawyer/HamiSettings');

function read(rel: string): string {
    return readFileSync(join(settings, rel), 'utf8');
}

function collectSource(dir: string, acc: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (name === '__tests__' || name === 'node_modules') continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) collectSource(full, acc);
        else if (/\.(tsx|ts)$/.test(name)) acc.push(full);
    }
    return acc;
}

describe('كثافة سطح الإعدادات — خفيف احترافي', () => {
    it('الكروم: عنوان 15px، تبويب 12px، عرض موحّد 36rem، بلا زجاج دائري', () => {
        const instant = read('settingsInstantChrome.css');
        expect(instant).toContain('font-size: 0.9375rem');
        expect(instant).toContain('font-size: 12px');
        expect(instant).toContain('width: min(100%, 36rem)');
        expect(instant).toContain('border-radius: 0.75rem');
        expect(instant).toContain('max(0.75rem, env(safe-area-inset-left, 0px))');
        expect(instant).toContain('min-height: 44px');
        expect(instant).toContain('backdrop-filter: none');
        expect(instant).not.toContain('font-size: 1.0625rem');
        expect(instant).not.toContain('22.5rem');
        expect(instant).not.toContain('border-radius: 9999px');
        expect(instant).not.toContain('hami-settings-header--glass');

        const overlay = read('settingsChromeOverlay.css');
        expect(overlay).toContain('max(1rem, env(safe-area-inset-bottom, 0px))');
        expect(overlay).toContain('width: min(36rem, 100%)');
        expect(overlay).toContain('height: min(48rem, 100%)');
        expect(overlay).toContain('border-radius: 0.75rem');
        expect(overlay).not.toContain('min(42rem');
        expect(overlay).not.toContain('min(56rem');
        expect(overlay).not.toContain('border-radius: 1.25rem');

        const cards = read('settingsChromeCards.css');
        expect(cards).toContain('max-width: 36rem');
        expect(cards).toContain('padding-top: 0.25rem');
        expect(cards).toContain('min-height: 2.75rem');
        expect(cards).toContain('min-height: 44px');
        expect(cards).not.toContain('max-width: 42rem');
        expect(cards).not.toContain('@media (min-width: 1024px)');
        expect(cards).not.toContain('3.5rem');
        expect(cards).not.toContain('border-radius: 0.875rem');
    });

    it('الصفوف والهيدر: حشو أوثق، مفتاح أنحف، لمس 44px، بلا lucide', () => {
        const shell = read('SettingsShell.tsx');
        expect(shell).toContain('pb-[max(1rem,env(safe-area-inset-bottom))]');
        expect(shell).not.toContain('max(5rem');

        const header = read('SettingsShellHeader.tsx');
        expect(header).toContain("from './settingsStemIconsChrome'");
        expect(header).not.toContain('components/ui/icons/');
        expect(header).not.toContain('lucideIcons');
        expect(header).toContain('min-h-[44px]');
        expect(header).not.toContain('hami-settings-header--glass');
        expect(header).not.toContain('size={18}');

        const row = read('settings-ui/SettingRow.tsx');
        expect(row).toContain('min-h-[44px]');
        expect(row).toContain('px-3 py-1.5');
        expect(row).not.toContain('min-h-[48px]');
        expect(row).not.toContain('px-3.5');
        expect(row).not.toContain('lucideIcons');

        const track = read('settings-ui/SettingsToggleTrack.tsx');
        expect(track).toContain('h-6 w-10');
        expect(track).not.toContain('h-7 w-12');

        const router = read('SettingsSectionRouter.tsx');
        expect(router).not.toContain('lg:max-w-2xl');

        const error = read('SettingsErrorBoundary.tsx');
        expect(error).toContain('min-h-[44px]');
        expect(error).toContain('rounded-xl');
        expect(error).toContain('bg-[#0B1021]');
        expect(error).not.toContain('rounded-2xl');
        expect(error).not.toContain('min-h-[48px]');
    });

    it('المنظر والأوراق والنسخ مضغوطة مع لمس 44px وحقل تاريخ 16px', () => {
        const chapter = read('appearance/AppearanceChapterHeader.tsx');
        expect(chapter).toContain('min-h-[44px]');
        expect(chapter).toContain('px-3 py-1.5');
        expect(chapter).toContain('settingsStemIcons');
        expect(chapter).toContain('meta.hint');

        const surface = read('appearance/AppearanceThemeAndSurfaceCard.tsx');
        expect(surface).toContain('min-h-[44px]');
        expect(surface).toContain('px-3 py-1.5');
        expect(surface).not.toContain('min-h-[48px]');

        const swatch = read('appearance/AppearanceThemeSwatch.tsx');
        expect(swatch).toContain('ring-2 ring-[#E6C673]/80');
        expect(swatch).not.toContain('ring-[3px]');
        expect(swatch).not.toContain('shadow-lg');
        expect(swatch).not.toContain('border-2');

        const picker = read('appearance/AppearanceBlockPicker.tsx');
        expect(picker).toContain('min-h-[44px]');
        expect(picker).toContain('font-bold');
        expect(picker).not.toContain('font-extrabold');
        expect(picker).not.toContain('border-2');

        const wallpaper = read('appearance/AppearanceWallpaperCard.tsx');
        expect(wallpaper).toContain('h-10 w-14');
        expect(wallpaper).toContain('fontSize: 16');

        const editor = read('appearance/WallpaperEditorPanel.tsx');
        expect(editor).toContain('rounded-xl');
        expect(editor).toContain('min-h-[44px]');
        expect(editor).toContain('max-w-[11.5rem]');
        expect(editor).not.toContain('rounded-2xl');

        const backup = read('data/BusinessBackupExportPanel.tsx');
        expect(backup).toContain('px-3 pb-3');
        expect(backup).toContain('fontSize: 16');
        expect(backup).toContain('min-h-[44px]');
        expect(backup).not.toContain('px-4 pb-4');

        const legal = read('account/AccountLegalDocumentBody.tsx');
        expect(legal).toContain('space-y-2.5');
        expect(legal).not.toContain('space-y-5');
        expect(legal).not.toContain('max-w-3xl');
    });

    it('لا lucide داخل HamiSettings — الجذع المحلي فقط', () => {
        const files = collectSource(settings);
        expect(files.length).toBeGreaterThan(40);
        for (const file of files) {
            const src = readFileSync(file, 'utf8');
            expect(src, file).not.toContain("from '@/app/components/ui/icons");
            expect(src, file).not.toContain("from 'lucide-react");
            expect(src, file).not.toMatch(
                /import\s+(?!type\s)\{[^}]*\}\s*from\s*['"]@\/app\/components\/ui\/lucideIcons['"]/,
            );
        }
    });

    it('القشرة الفورية تطابق الكروم الحي', () => {
        const markup = readFileSync(join(root, 'src/app/runtime/settingsInstantChromeMarkup.ts'), 'utf8');
        expect(markup).toContain('font-size:0.9375rem');
        expect(markup).toContain('font-size:12px');
        expect(markup).toContain('min(100%,36rem)');
        expect(markup).toContain('font-weight:600');
        expect(markup).toContain('border-radius:0.75rem');
        expect(markup).toContain('min-height:44px');
        expect(markup).toContain('max(0.75rem,env(safe-area-inset-left,0px))');
        expect(markup).toContain('--hami-lawyer-header-safe-top');
        expect(markup).toContain('settings-instant-close');
        expect(markup).toContain('settings-instant-skeleton');
        expect(markup).toContain('pointer-events:auto');
        expect(markup).toContain('type="button"');
        expect(markup).not.toContain('font-size:1.0625rem');
        expect(markup).not.toContain('12.5px');
        expect(markup).not.toContain('22.5rem');
        expect(markup).not.toContain('font-weight:800');
        expect(markup).not.toContain('max(1rem,env(safe-area-inset-left,0px))');
        expect(markup).not.toContain('min(100%,20rem)');
    });
});
