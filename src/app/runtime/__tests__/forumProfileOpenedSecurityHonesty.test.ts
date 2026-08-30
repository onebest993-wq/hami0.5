import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) walkTsFiles(full, acc);
        else if (/\.(ts|tsx)$/.test(name) && !name.includes('.test.')) acc.push(full);
    }
    return acc;
}

describe('forum profile tile + opened profile security honesty', () => {
    it('لا HTML خام على مسار البلاطة والملف المفتوح، والتنقية طبقات', () => {
        const forumDir = join(root, 'src/app/components/lawyer/dashboard/forumProfile');
        for (const file of walkTsFiles(forumDir)) {
            const src = readFileSync(file, 'utf8');
            expect(src).not.toContain('dangerouslySetInnerHTML');
        }
        const royalDir = join(root, 'src/app/components/lawyer/RoyalLawyerProfile/components');
        for (const file of walkTsFiles(royalDir)) {
            const src = readFileSync(file, 'utf8');
            expect(src).not.toContain('dangerouslySetInnerHTML');
        }
        const chrome = read('src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterChrome.tsx');
        expect(chrome).toContain('sanitizeProfilePlainText');
        const fallback = read('src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterFallback.tsx');
        expect(fallback).toContain('sanitizeProfilePlainText');
        expect(fallback).toContain('forumTileFallbackPaintAvatarUrl');
        const identity = read('src/app/services/profile/userIdentityUiState.ts');
        expect(identity).toContain('sanitizeProfileMediaUrl');
        expect(identity).toContain('sanitizeProfilePlainText');
        const resolveName = read('src/app/services/profile/resolveLawyerDisplayName.ts');
        expect(resolveName).toContain('sanitizeProfilePlainText');
        const avatar = read('src/app/components/lawyer/RoyalLawyerProfile/components/ProfileAvatarImage.tsx');
        expect(avatar).toContain('sanitizeProfileMediaUrl');
        const paint = read('src/app/components/lawyer/dashboard/forumProfile/forumTileFallbackPaintAvatarUrl.ts');
        expect(paint).toContain('sanitizeProfileMediaUrl');
        const urls = read('src/app/services/profile/profileUrlSanitize.ts');
        expect(urls).toContain('javascript');
        expect(urls).toMatch(/\\.svgz\?/);
    });

    it('التواصل: HTTPS وnoopener ونسخ بلا مخططات خطرة، والرفع بلا image/*', () => {
        const nav = read('src/app/services/profile/profileContactNavigation.ts');
        expect(nav).toContain("parsed.protocol !== 'https:'");
        expect(nav).toContain('noopener,noreferrer');
        expect(nav).toContain('isAllowedNativeContactUrl');
        const channel = read('src/app/components/lawyer/RoyalLawyerProfile/components/ProfileContactChannel.tsx');
        expect(channel).toContain('noopener noreferrer');
        expect(channel).toContain('safeProfileContactClipboardText');
        expect(channel).toContain('withAllowedClipboardAction');
        const security = read('src/app/services/profile/profileContactInputSecurity.ts');
        expect(security).toContain('safeProfileContactClipboardText');
        expect(security).toContain('javascript');
        const inputs = read('src/app/components/lawyer/RoyalLawyerProfile/components/ProfileContentFileInputs.tsx');
        expect(inputs).toContain('PROFILE_SAFE_IMAGE_ACCEPT');
        expect(inputs).not.toContain('accept="image/*"');
        const settings = read('src/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsSheetFileInputs.tsx');
        expect(settings).toContain('PROFILE_SAFE_IMAGE_ACCEPT');
        expect(settings).not.toContain('accept="image/*"');
        const media = read('src/app/services/profileMediaService.ts');
        expect(media).toContain('PROFILE_SAFE_IMAGE_ACCEPT');
        expect(media).toContain('image/heif');
        expect(media).not.toContain('image/svg');
        const kv = read('src/app/services/profile/profileKvReadRedact.ts');
        expect(kv).toContain('redactProfileKvValueForViewer');
        expect(existsSync(join(root, 'src/app/services/profile/profileVisitorView.ts'))).toBe(true);
        const bridge = read('src/app/runtime/profileInstantPaint.ts');
        expect(bridge).not.toContain('innerHTML');
        expect(bridge).toContain('hami-profile-instant-bridge');
        expect(bridge).not.toMatch(/innerHTML\s*=/);
    });
});
