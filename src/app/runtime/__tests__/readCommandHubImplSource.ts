import fs from 'node:fs';
import path from 'node:path';

/** مصدر بلاطات المركز بعد التقسيم — لاختبارات الأمانة التي كانت تقرأ الملف الموحّد. */
export function readCommandHubImplSource(root = process.cwd()): string {
    const dir = path.join(root, 'src/app/components/lawyer/dashboard/commandHub');
    return [
        'RouteTile.tsx',
        'ForumTile.tsx',
        'DockHalfTile.tsx',
        'ExecutionHero.tsx',
        'commandHubTileChrome.tsx',
        'commandHubTileClasses.ts',
        'commandHubArchivePrefetch.ts',
    ]
        .map((file) => fs.readFileSync(path.join(dir, file), 'utf8'))
        .join('\n');
}
