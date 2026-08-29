import fs from 'node:fs';
import path from 'node:path';

/** مصدر منزل التبويب بعد التقسيم — لاختبارات الأمانة التي كانت تقرأ الملف الموحّد. */
export function readHomeTabImplSource(root = process.cwd()): string {
    const dir = path.join(root, 'src/app/components/lawyer/dashboard');
    return [
        'HomeTabContent.tsx',
        'HomeTabWidgetSlot.tsx',
        'HomeHubHomeSlot.tsx',
        'useHomeTabContentModel.ts',
        'homeTabWidgetIds.ts',
    ]
        .map((file) => fs.readFileSync(path.join(dir, file), 'utf8'))
        .join('\n');
}
