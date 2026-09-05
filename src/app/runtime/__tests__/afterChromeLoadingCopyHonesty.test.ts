import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('after-chrome loading copy honesty — نصوص التحميل بعد الهيكل', () => {
    it('خلاصة المنتدى: هيكل بطاقات صامت، تحميل المزيد بلا سبينر', () => {
        const list = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumPostList.tsx',
        );
        expect(list).toContain('ForumLazySectionInstantSlots');
        expect(list).toContain('تحميل المزيد');
        expect(list).toContain('min-h-[44px]');
        expect(list).toContain('aria-busy={loadingMore || undefined}');
        expect(list).not.toContain('Loader2');
        expect(list).not.toContain('جاري التحميل');
        expect(list).not.toContain('جاري تحميل المنشورات');
        expect(list).not.toContain('animate-spin');
    });

    it('فتح الإضبارة: عظام صامتة بنفس الطبقة، بلا جملة ذهبية', () => {
        const dossier = read(
            'src/app/components/lawyer/LawyerDashboardParts/components/DossierOpeningFallback.tsx',
        );
        expect(dossier).toContain('z-[9999]');
        expect(dossier).toContain('aria-label="الإضبارة"');
        expect(dossier).toContain('min-h-[44px]');
        expect(dossier).not.toContain('جاري');
        expect(dossier).not.toContain('animate-spin');
    });

    it('مسجّل الصوت: كروم الـ vault الحي، بلا «جاري فتح المسجل»', () => {
        const composer = read(
            'src/app/components/lawyer/dossier-notes/DossierFastNoteComposer.tsx',
        );
        expect(composer).toContain('VOICE_RECORDER_OVERLAY');
        expect(composer).toContain('VAULT_RECORDER_SHELL');
        expect(composer).toContain('data-testid="voice-recorder-loading"');
        expect(composer).toContain('aria-label="المسجل الذكي"');
        expect(composer).toContain('min-h-[44px]');
        expect(composer).not.toContain('جاري فتح المسجل');
        expect(composer).not.toContain('جاري فتح المسجل الصوتي');
    });

    it('استوديو الصفحة ومحرر الخلفية: بلا جملة نبض التحميل', () => {
        const studio = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheetLoadingFallback.tsx',
        );
        expect(studio).toContain('aria-label="استوديو الصفحة"');
        expect(studio).toContain('min-h-[44px]');
        expect(studio).not.toContain('جاري فتح الاستوديو');

        const wallpaper = read(
            'src/app/components/lawyer/HamiSettings/appearance/WallpaperEditorPanel.tsx',
        );
        expect(wallpaper).not.toContain('جاري التحميل');
        expect(wallpaper).not.toContain('جاري التطبيق');
        expect(wallpaper).toContain('تطبيق الخلفية');
    });

    it('نموذج الطلب الجزائي: فتحات 44px، المودال الصغير يبقى null', () => {
        const requestUi = read(
            'src/app/components/lawyer/criminal-system/criminalDashboardLazyRequestUi.tsx',
        );
        expect(requestUi).toContain('RequestFormInstantSlots');
        expect(requestUi).toContain('min-h-[44px]');
        expect(requestUi).not.toContain('جاري تحميل نموذج الطلب');
        const addButton = requestUi.slice(
            requestUi.indexOf('export function RequestMarginAddButton'),
            requestUi.indexOf('export function RequestMarginPromptModal'),
        );
        const promptModal = requestUi.slice(
            requestUi.indexOf('export function RequestMarginPromptModal'),
        );
        expect(addButton).toContain('fallback={null}');
        expect(promptModal).toContain('fallback={null}');
    });
});
