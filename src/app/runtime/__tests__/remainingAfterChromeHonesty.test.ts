import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readLawyerDashboardMainViewOverlayHosts } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('remaining after-chrome surfaces honesty', () => {
    it('دعاوى OverlayHosts: غطاء preload-aware بلا InstantChrome على الجذع', () => {
        const hosts = readLawyerDashboardMainViewOverlayHosts();
        const cover = read(
            'src/app/components/lawyer/dashboard/LawsuitsOverlaySuspenseCover.tsx',
        );
        const frame = read(
            'src/app/components/lawyer/dashboard/LawsuitsWorkspaceInstantPaintFrame.tsx',
        );
        const overlays = read('src/app/hooks/useLawyerDashboardOverlays.ts');
        expect(hosts).toContain('LawsuitsOverlaySuspenseCover');
        expect(hosts).not.toMatch(/import \{ LawsuitsWorkspaceInstantChrome \} from/);
        expect(cover).toContain('LazyLawsuitsWorkspaceInstantChrome.isPreloaded');
        expect(cover).toContain('LawsuitsWorkspaceInstantPaintFrame');
        expect(frame).toContain('aria-label="مخزن الإضابير"');
        expect(frame).toContain('min-h-[44px]');
        expect(frame).not.toContain('LawsuitsCivilArchiveInstantShell');
        expect(overlays).toContain('LazyLawsuitsWorkspaceInstantChrome.preload');
    });

    it('راوتر الإعدادات: فتحات الصفوف؛ البوابة تطلي DOM بلا SettingsInstantShell', () => {
        const router = read(
            'src/app/components/lawyer/HamiSettings/SettingsSectionRouter.tsx',
        );
        const portal = read(
            'src/app/components/lawyer/dashboard/LawyerDashboardSettingsOverlayPortal.tsx',
        );
        expect(router).toContain('SettingsSectionInstantSlots');
        expect(router).toContain('SettingsSectionReveal');
        expect(router).toContain('data-settings-section-park');
        expect(router).not.toContain('fallback={null}');
        expect(portal).toContain('SettingsInstantPaintCover');
        expect(portal).not.toContain('fallback={null}');
        expect(portal).not.toContain('SettingsInstantShell');
    });

    it('رادار وربع الملف وصندوق المساعدة ومحرر الخلفية بلا جملة جاري', () => {
        const radar = read('src/app/components/lawyer/SmartLegalRadar.tsx');
        const addHost = read(
            'src/app/components/lawyer/dashboard/schedule/RadarOpenInstantAddHost.tsx',
        );
        const cover = read(
            'src/app/components/lawyer/dashboard/schedule/RadarEventFormInstantCover.tsx',
        );
        const tile = read(
            'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarter.tsx',
        );
        const inbox = read(
            'src/app/components/lawyer/dashboard/tasksManager/TaskHelpInboxPanel.tsx',
        );
        const canvas = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileCanvasBackgroundEditor.tsx',
        );
        expect(radar).toContain('RadarEventFormInstantCover');
        expect(addHost).toContain('RadarEventFormInstantCover');
        expect(addHost).not.toMatch(/from ['"][^'"]*SmartLegalRadar/);
        expect(cover).toContain('aria-label="نموذج الموعد"');
        expect(cover).not.toContain('جاري فتح النموذج');
        const instant = read(
            'src/app/components/lawyer/dashboard/schedule/RadarOpenInstantChrome.tsx',
        );
        expect(instant).not.toContain('جاري');
        expect(instant).toContain('data-testid="schedule-tab-loading"');
        expect(tile).not.toContain('جاري التحميل');
        expect(tile).toContain("aria-label={");
        expect(inbox).not.toContain('جاري التحميل');
        expect(inbox).toContain('TASKS_DIALOG_SUBPANEL');
        expect(canvas).not.toContain('جاري التحميل');
        expect(canvas).not.toContain('جاري الحفظ');
        expect(canvas).toContain('تطبيق الخلفية');
    });

    it('مقر الإدارة: عظام HqStateBlock؛ أفعال المنتدى بلا جملة ذهبية', () => {
        const hq = read('src/app/components/admin/hqChrome.tsx');
        const admin = read('src/app/components/AdminDashboard.tsx');
        const publish = read(
            'src/app/components/lawyer/CommunityScreen/components/AddQuestionSheetPublishRow.tsx',
        );
        const join = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumGroupsDirectory.tsx',
        );
        const attach = read(
            'src/app/components/lawyer/CommunityScreen/components/QuestionCardAttachmentDocument.tsx',
        );
        const repo = read(
            'src/app/components/lawyer/CommunityScreen/components/RepositoryCardActions.tsx',
        );
        const wallpaper = read(
            'src/app/components/lawyer/HamiSettings/appearance/WallpaperEditorPanel.tsx',
        );
        expect(hq).toContain('kind === \'loading\'');
        expect(hq).toContain('hq-state-bone');
        expect(admin).toContain('HqStateBlock kind="loading"');
        expect(admin).not.toContain('جاري تحميل أدوات القوانين');
        expect(publish).not.toContain('جاري فحص الخصوصية');
        expect(publish).toContain('aria-busy={submittingPost');
        expect(join).not.toContain('جاري الانضمام');
        expect(attach).not.toContain('جاري الحفظ');
        expect(attach).not.toContain('جاري تجهيز الملف');
        expect(attach).not.toContain('Loader2');
        expect(repo).not.toContain('جاري الحفظ');
        expect(repo).not.toContain('Loader2');
        expect(wallpaper).not.toContain('جاري التطبيق');
    });
});
