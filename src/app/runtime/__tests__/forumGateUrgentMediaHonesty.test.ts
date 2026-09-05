import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readLawyerDashboardMainViewOverlayHosts } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('forum gate + urgent + media + remaining surfaces honesty', () => {
    it('بوابة جلسة المنتدى: هيكل بطاقات بلا جملة التحقق', () => {
        const gate = read(
            'src/app/components/lawyer/CommunityScreen/components/CommunityScreenAccessGate.tsx',
        );
        expect(gate).toContain('ForumLazySectionInstantSlots');
        expect(gate).toContain('data-testid="forum-access-loading"');
        expect(gate).toContain('aria-label="المنتدى"');
        expect(gate).not.toContain('جاري التحقق من الجلسة');
        expect(gate).not.toContain('FORUM_TEXT_MUTED');
    });

    it('تبويب المستعجل: عظام بلا جملة تحميل ظاهرة', () => {
        const tab = read(
            'src/app/components/lawyer/dashboard/LawsuitsWorkspaceUrgentTab.tsx',
        );
        const sections = read(
            'src/app/components/lawyer/View_Urgent_And_Orders_Dashboard/UrgentDashboardSections.tsx',
        );
        expect(tab).toContain('label="الطلبات المستعجلة"');
        expect(tab).not.toContain('جاري تحميل الطلبات المستعجلة');
        expect(sections).toContain('urgent-dashboard-hydrating');
        expect(sections).toContain('min-h-[72px]');
        expect(sections).not.toContain('جاري التحميل');
    });

    it('وسائط البطاقة: بلا Loader2 وبلا جملة جاري', () => {
        const image = read(
            'src/app/components/lawyer/CommunityScreen/components/QuestionCardAttachmentImage.tsx',
        );
        const audio = read(
            'src/app/components/lawyer/CommunityScreen/components/QuestionCardAttachmentAudio.tsx',
        );
        const media = read(
            'src/app/components/lawyer/CommunityScreen/components/RepositoryCardMedia.tsx',
        );
        expect(image).not.toContain('Loader2');
        expect(image).not.toContain('جاري تحميل الصورة');
        expect(image).not.toContain('جاري إظهار الصورة');
        expect(audio).not.toContain('Loader2');
        expect(audio).not.toContain('جاري تحميل المقطع');
        expect(media).not.toContain('Loader2');
        expect(media).toContain('aria-busy={thumbLoading || undefined}');
    });

    it('بوابة الإعدادات تطلي DOM؛ شريط التوحيد له غطاء عظام', () => {
        const portal = read(
            'src/app/components/lawyer/dashboard/LawyerDashboardSettingsOverlayPortal.tsx',
        );
        const hosts = readLawyerDashboardMainViewOverlayHosts();
        const cover = read(
            'src/app/components/lawyer/dashboard/ConsolidationNavInstantCover.tsx',
        );
        expect(portal).toContain('SettingsInstantPaintCover');
        expect(portal).not.toContain('SettingsInstantShell');
        expect(portal).not.toContain('fallback={null}');
        expect(hosts).toContain('ConsolidationNavInstantCover');
        expect(hosts).not.toMatch(/consolidationNavLive \? \(\s*<Suspense fallback=\{null\}>/);
        expect(cover).toContain('min-h-[44px]');
        expect(cover).toContain('aria-label="ربط الدعاوى"');
        expect(cover).not.toContain('جاري');
        expect(cover).not.toContain('ArrowRightLeft');
    });

    it('مقر ومخزن ومسح/خروج: بلا جملة ذهبية على الانتظار أو الفعل', () => {
        const hqAudit = read('src/app/components/admin/HqAuditLogPanel.tsx');
        const vaultUp = read(
            'src/app/components/lawyer/SmartVaultModal/VaultUploadMetaSheet.tsx',
        );
        const scanner = read(
            'src/app/components/lawyer/SmartVaultModal/SmartVaultScannerPhases.tsx',
        );
        const session = read(
            'src/app/components/lawyer/HamiSettings/account/AccountSessionRows.tsx',
        );
        const wipe = read(
            'src/app/components/lawyer/HamiSettings/data/DataDangerZone.tsx',
        );
        const sync = read(
            'src/app/components/lawyer/HamiSettings/data/DataSyncCard.tsx',
        );
        expect(hqAudit).not.toContain('جاري التحميل');
        expect(hqAudit).toContain('title="سجل العمليات"');
        expect(vaultUp).not.toContain('جاري الرفع');
        expect(vaultUp).toContain('رفع وحفظ');
        expect(scanner).not.toContain('جاري حفظ المستند');
        expect(scanner).not.toContain('Loader2');
        expect(session).not.toContain('جاري الخروج');
        expect(session).not.toContain('جاري المسح');
        expect(wipe).not.toContain('جاري المسح');
        expect(sync).toContain('مزامنة الآن');
        expect(sync).not.toContain('جاري…');
    });

    it('أوراق المنتدى: InstantPaint بدل فراغ Suspense', () => {
        const compose = read(
            'src/app/components/lawyer/CommunityScreen/components/CommunityScreenComposeOverlays.tsx',
        );
        const browse = read(
            'src/app/components/lawyer/CommunityScreen/components/CommunityScreenBrowseOverlays.tsx',
        );
        const repo = read(
            'src/app/components/lawyer/CommunityScreen/components/LegalRepositoryModals.tsx',
        );
        const covers = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumOverlayInstantCovers.tsx',
        );
        const profile = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumMemberProfileOverlay.tsx',
        );
        expect(compose).not.toContain('fallback={null}');
        expect(compose).toContain('ForumPublishSheetInstantCover');
        expect(compose).toContain('ForumCreateGroupSheetInstantCover');
        expect(compose).toContain('ForumEditPostModalInstantCover');
        expect(browse).not.toContain('fallback={null}');
        expect(browse).toContain('ForumCommentSheetInstantCover');
        expect(browse).toContain('ForumSearchOverlayInstantCover');
        expect(browse).toContain('ForumProfileOverlayInstantCover');
        expect(repo).not.toContain('fallback={null}');
        expect(repo).toContain('ForumRepositoryModalInstantCover');
        expect(covers).toContain('FORUM_PANEL');
        expect(covers).toContain('FORUM_SHEET');
        expect(covers).toContain('FORUM_MODAL');
        expect(covers).toContain('min-h-[44px]');
        expect(covers).not.toContain('جاري');
        expect(covers).not.toContain('Loader2');
        expect(covers).not.toContain('animate-spin');
        expect(covers).not.toContain('document.body');
        expect(profile).toContain('ForumProfileOverlayBodySlots');
        expect(profile).not.toContain('ProfileLoadingState');
        expect(profile).not.toContain('جاري');
    });
});
