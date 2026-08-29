import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = resolve(process.cwd(), 'src/app/components/lawyer/dashboard/commandHub');

describe('command hub tiles file split', () => {
    it('commandHub/index إعادة تصدير فقط؛ التنفيذ في ملفات البلاطات', () => {
        const barrel = readFileSync(resolve(dir, 'index.ts'), 'utf8');
        expect(barrel).toContain("export { RouteTile } from './RouteTile'");
        expect(barrel).toContain("export { ForumTile } from './ForumTile'");
        expect(barrel).toContain("export { DockHalfTile } from './DockHalfTile'");
        expect(barrel).toContain("export { ExecutionHero } from './ExecutionHero'");
        expect(barrel).not.toContain('AlertsHubTile');
        expect(barrel).not.toContain('function RouteTile');
        expect(barrel).not.toContain('function DockHalfTile');
        const chrome = readFileSync(resolve(dir, 'commandHubTileChrome.tsx'), 'utf8');
        const prefetch = readFileSync(resolve(dir, 'commandHubArchivePrefetch.ts'), 'utf8');
        expect(prefetch).toContain('bindArchivePrefetch');
        expect(prefetch).toContain('dispatchTransactionsPrimeHost');
        expect(prefetch).toContain("import('@/app/runtime/executionArchivePrimeHost')");
        expect(prefetch).toContain('prefetchHubArchiveIntentImmediate');
        expect(prefetch).toContain('onFocus: run');
        expect(chrome).not.toContain('bindArchivePrefetch');
        expect(chrome).not.toContain('hubTilePressClass');
        expect(chrome).toContain('HubTileFace');
        expect(chrome).not.toContain('HubTileTitle');
        const classes = readFileSync(resolve(dir, 'commandHubTileClasses.ts'), 'utf8');
        expect(classes).toContain('hubTilePressClass');
        expect(classes).toContain('tileShellClasses');
        expect(classes).not.toContain('HomeStemIconProps');
        expect(classes).not.toContain('icon?:');
        expect(classes).not.toContain('HUB_HALF_TILE_MIN_CLASS');
        expect(classes).not.toContain('transition-opacity duration-200');
        const dock = readFileSync(resolve(dir, 'DockHalfTile.tsx'), 'utf8');
        expect(dock).toContain('useScrollSafePress');
        expect(dock).not.toContain('activateOnPointerDown');
        expect(dock).not.toContain('_legacyThemePrimary');
        const forum = readFileSync(resolve(dir, 'ForumTile.tsx'), 'utf8');
        expect(forum).toContain('ForumTileMainFace');
        expect(forum).toContain('useForumTileChrome');
        expect(forum).not.toContain('HubTileFace');
        expect(forum).not.toContain('forumUnreadLoading');
        expect(forum).not.toContain('_legacyThemePrimary');
        expect(
            existsSync(resolve(dir, 'hubHalfTileMetrics.ts')),
        ).toBe(false);
        const route = readFileSync(resolve(dir, 'RouteTile.tsx'), 'utf8');
        expect(route).toContain("from '@/app/components/lawyer/dashboard/hubHalfTileMetrics'");
        expect(route).toContain("pressVariant = 'route'");
        expect(route).toContain("pressVariant?: 'route' | 'hero'");
        expect(route).not.toContain('import.meta.hot');
        const hero = readFileSync(resolve(dir, 'ExecutionHero.tsx'), 'utf8');
        expect(hero).toContain('RouteTile');
        expect(hero).toContain('pressVariant="hero"');
        expect(hero).not.toContain('useScrollSafePress');
        expect(hero).not.toContain('import.meta.hot');
        expect(dock).not.toContain('import.meta.hot');
        expect(chrome).not.toContain('import.meta.hot');
        expect(barrel).toContain('import.meta.hot.accept');
        const canonical = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/dashboard/hubHalfTileMetrics.ts'),
            'utf8',
        );
        expect(canonical).toContain('min-h-[5rem]');
    });
});
