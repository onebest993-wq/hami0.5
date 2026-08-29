import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('home boot uncover stability', () => {
    it('لا يقطع الغطاء قبل البطاقة الحية والهوية، ويتلاشى فوق الواجهة النهائية', () => {
        const gate = src('src/app/bootstrap/homeMainGridPaintGate.ts');
        const worthy = src('src/app/bootstrap/bootWorthySurface.ts');
        const announce = src('src/app/bootstrap/homeMainGridPaintAnnounce.ts');
        const fade = src('src/app/bootstrap/bootStaticShell.constants.ts');
        expect(worthy).toContain('isLiveHubPaintWorthy(root)');
        expect(worthy).toContain('findLiveHomeMainGrid');
        expect(announce).toContain('isLiveHubPaintWorthy(grid)');
        expect(announce).toContain('hasLiveCommandTiles(grid)');
        expect(announce).toContain('hasIncompleteHomeWidgetSlots');
        expect(announce).not.toContain('if (grid.querySelector(\'[data-testid="home-hub-card"]\')) return true');
        expect(gate).toContain('removeStaticBootShell()');
        expect(gate).not.toContain("removeStaticBootShell({ instant: true })");
        expect(gate).toContain('BOOT_UNCOVER_WATCHDOG_MS = 8_000');
        expect(gate).toContain('canAnnounceHappyPathUncover');
        expect(gate).toContain('findLiveHomeMainGrid');
        expect(gate).toContain('isWorthyBootSurface() || hasAuthGateSurface()');
        expect(fade).toContain('STATIC_BOOT_SHELL_FADE_MS = 180');
        const boot = src('public/hami-boot.js');
        expect(boot).not.toContain('requestPaintGateUncoverIfSplashStuck');
        expect(boot).not.toMatch(/__hamiHomeMainGridPainted__\s*=\s*true/);
        const runtimeReady = boot.slice(boot.indexOf("addEventListener('hami:app-runtime-ready'"));
        expect(runtimeReady).toContain('dismissBootFailureLayer');
        expect(runtimeReady).not.toContain('still.remove()');
        expect(runtimeReady).not.toContain("dispatchEvent(new Event('hami:home-main-grid-painted')");
        const preamble = src('src/boot/bootEntryPreamble.ts');
        expect(preamble).toContain("!document.getElementById('hami-static-boot')");
    });

    it('ربع الملف يُبقي الحرف حتى ظهور الصورة ولا يفرّغ الدائرة', () => {
        const quarter = src(
            'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarter.tsx',
        );
        const face = src(
            'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileAvatarFace.tsx',
        );
        const image = src(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileAvatarImage.tsx',
        );
        expect(quarter).toContain('reveal="fade"');
        expect(quarter).toContain('fallback={letterFace}');
        expect(quarter).not.toContain('showInitial={false}');
        expect(face).not.toContain('relative block w-full h-full bg-[#0A0F1C]');
        expect(image).toContain("reveal?: 'instant' | 'fade'");
        expect(image).toContain('return fallback ? <>{fallback}</>');
        expect(image).toContain('visibility: hideImgUntilDecoded ? \'hidden\' : \'visible\'');
    });

    it('الاسم الأغنى يُثبت عبر طيّ الألف وانتظار الملف المحلي', () => {
        const names = src('src/app/services/profile/resolveLawyerDisplayName.ts');
        const identity = src('src/app/services/profile/userIdentityUiState.ts');
        const chrome = src('src/app/services/profile/resolveForumTileProfileChrome.ts');
        const header = src('src/app/hooks/useLawyerProfileHeader.ts');
        expect(names).toContain('foldArabicIdentityLetters');
        expect(names).toContain('isNamePrefixEnrichment');
        expect(identity).toContain('preferRicherLawyerDisplayName');
        expect(chrome).toContain('isLawyerProfileLocalUnread');
        expect(header).toContain('isLawyerProfileLocalUnread');
        expect(header).toContain('isLoaded: !pending');
        expect(header).not.toContain("if (!header.displayName.trim()) return;");
        expect(chrome).toContain('isLoaded: !warmPending && !localUnread');
        expect(chrome).toContain('uid ? getUserIdentityUiState(uid) : null');
        expect(chrome).not.toContain('Boolean(displayName.trim())');
    });
});
