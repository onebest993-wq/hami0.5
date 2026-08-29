import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const hub = join(root, 'src/app/components/lawyer/LawyerHomeHubCard');
const alerts = join(root, 'src/app/services/alerts');

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) walkTsFiles(full, acc);
        else if (/\.(ts|tsx)$/.test(name)) acc.push(full);
    }
    return acc;
}

describe('home hub card security close honesty', () => {
    it('اللوحة لا ترسم alertsError الخام — نسخة ثابتة فقط', () => {
        const panel = readFileSync(join(hub, 'components/HomeHubAlertsPanel.tsx'), 'utf8');
        expect(panel).toContain('HOME_HUB_ALERTS_ERROR_COPY');
        expect(panel).toContain('{HOME_HUB_ALERTS_ERROR_COPY}');
        expect(panel).not.toContain('alertsError');
        const empty = readFileSync(join(alerts, 'homeHubEmptyState.ts'), 'utf8');
        expect(empty).toContain("HOME_HUB_ALERTS_ERROR_COPY = 'تعذر تحميل التنبيهات'");
        const hook = readFileSync(join(hub, 'hooks/useLawyerHomeHubCard.ts'), 'utf8');
        expect(hook).toContain('HOME_HUB_ALERTS_ERROR_COPY');
        expect(hook).toContain('safeAlertsError');
        expect(hook).toContain('hasLocalAppSession(shellAuthUserId ?? lawyerId)');
    });

    it('التنقّل يرفض javascript/: // وHTML قبل القائمة الخاصة', () => {
        const guard = readFileSync(join(alerts, 'homeHubNavigateGuard.ts'), 'utf8');
        expect(guard).toContain('javascript:');
        expect(guard).toContain("'://'");
        expect(guard).toContain('data|vbscript|file');
        expect(guard).toContain('parseWorkspaceRoute');
        const idxPayload = guard.indexOf('function isSafeHomeHubRoutePayload');
        const idxSpecial = guard.indexOf('HOME_HUB_SPECIAL_NAV_ROUTES as readonly string[]');
        expect(idxPayload).toBeGreaterThan(0);
        expect(idxSpecial).toBeGreaterThan(idxPayload);
        const actions = readFileSync(join(hub, 'homeHub/homeHubGuardedActions.ts'), 'utf8');
        expect(actions).toContain('isSafeHomeHubNavigateRoute');
        expect(actions).toContain('guardedHomeHubNavigateRoute');
    });

    it('Sentry والـ peek والكاش لا يسرّبان هوية ولا يخلطون محامياً بآخر', () => {
        const sentry = readFileSync(join(alerts, 'homeHubSentryReporting.ts'), 'utf8');
        expect(sentry).toContain("userId: context.userId ? '[redacted]' : null");
        const perf = readFileSync(join(alerts, 'homeHubPerfMetrics.ts'), 'utf8');
        expect(perf).toContain('userId: _omitUser');
        const radar = readFileSync(join(alerts, 'homeHubRadarWarmCache.ts'), 'utf8');
        expect(radar).toContain('warmed.lawyerId !== lawyerId');
        expect(radar).toContain('warmLawyerId !== lawyerId');
        const secretary = readFileSync(join(alerts, 'homeHubSecretaryAlertsWarmCache.ts'), 'utf8');
        expect(secretary).toContain('warmed.lawyerId !== lawyerId');
        const dismiss = readFileSync(join(alerts, 'homeHubRadarDismiss.ts'), 'utf8');
        expect(dismiss).toContain('.slice(0, 128)');
        expect(dismiss).toContain('.slice(0, 240)');
        expect(dismiss).toContain('JSON.parse');
    });

    it('لا innerHTML خطير — الطبقة تقفل التمرير وتحبس التبويب وتستبعد javascript:', () => {
        for (const file of walkTsFiles(hub)) {
            const src = readFileSync(file, 'utf8');
            expect(src).not.toContain('dangerouslySetInnerHTML');
            expect(src).not.toMatch(/\binnerHTML\s*=/);
        }
        const shell = readFileSync(join(hub, 'components/HomeHubMoreOverlayShell.tsx'), 'utf8');
        expect(shell).toContain('data-hami-overlay-safe="1"');
        expect(shell).toContain('trapHomeHubOverlayTabKey');
        expect(shell).toContain('role="dialog"');
        expect(shell).toContain('aria-modal="true"');
        const sheet = readFileSync(join(hub, 'hooks/useHomeHubOverlaySheet.ts'), 'utf8');
        expect(sheet).toContain('useBodyScrollLock(open)');
        const trap = readFileSync(join(hub, 'homeHub/homeHubOverlayFocusTrap.ts'), 'utf8');
        expect(trap).toContain('javascript|data|vbscript');
        expect(existsSync(join(root, 'src/app/services/auth/shellAuth.ts'))).toBe(true);
        const auth = read('src/app/services/auth/shellAuth.ts');
        expect(auth).toContain('export function hasLocalAppSession');
        expect(auth).toContain('return true');
        const fingerprint = read('src/app/hooks/lawyerDashboard/dashboardViewFingerprint.ts');
        expect(fingerprint).toContain("appAlerts.appAlertsError ? '1' : '0'");
        expect(fingerprint).not.toContain('appAlerts.appAlertsError ?? ');
        const cacheKey = read('src/app/hooks/lawyerDashboard/dashboardShellFingerprintCache.ts');
        expect(cacheKey).toContain('appAlerts.appAlertsError ? \'1\' : \'0\'');
    });
});
