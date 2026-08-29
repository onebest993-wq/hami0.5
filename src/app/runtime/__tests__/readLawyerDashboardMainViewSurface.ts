import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dash = join(root, 'src/app/components/lawyer/dashboard');

/** سطح MainView بعد التقسيم — للجذور + lazy + hosts */
export function readLawyerDashboardMainViewSurface(): string {
    return [
        readFileSync(join(dash, 'LawyerDashboardMainView.tsx'), 'utf8'),
        readFileSync(join(dash, 'LawyerDashboardMainView.lazyEntries.ts'), 'utf8'),
        readFileSync(join(dash, 'LawyerDashboardMainViewOverlayHosts.tsx'), 'utf8'),
        readFileSync(join(dash, 'useLawyerDashboardMainViewChrome.ts'), 'utf8'),
    ].join('\n');
}

export function readLawyerDashboardMainViewOverlayHosts(): string {
    return readFileSync(join(dash, 'LawyerDashboardMainViewOverlayHosts.tsx'), 'utf8');
}

export function readLawyerDashboardMainViewLazyEntries(): string {
    return readFileSync(join(dash, 'LawyerDashboardMainView.lazyEntries.ts'), 'utf8');
}
