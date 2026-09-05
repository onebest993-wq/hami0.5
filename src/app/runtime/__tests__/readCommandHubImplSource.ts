import fs from 'node:fs';
import path from 'node:path';

/** مصدر بلاطات المركز بعد التقسيم — لاختبارات الأمانة التي كانت تقرأ الملف الموحّد. */
export function readCommandHubImplSource(root = process.cwd()): string {
    const dir = path.join(root, 'src/app/components/lawyer/dashboard/commandHub');
    const dash = path.join(root, 'src/app/components/lawyer/dashboard');
    return [
        path.join(dir, 'RouteTile.tsx'),
        path.join(dir, 'ForumTile.tsx'),
        path.join(dir, 'DockHalfTile.tsx'),
        path.join(dir, 'ExecutionHero.tsx'),
        path.join(dir, 'commandHubTileChrome.tsx'),
        path.join(dash, 'commandHubTileClasses.ts'),
        path.join(dir, 'commandHubArchivePrefetch.ts'),
    ]
        .map((file) => fs.readFileSync(file, 'utf8'))
        .join('\n');
}
