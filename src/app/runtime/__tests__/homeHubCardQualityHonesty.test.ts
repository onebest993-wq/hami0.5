import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const hub = join(root, 'src/app/components/lawyer/LawyerHomeHubCard');
const alerts = join(root, 'src/app/services/alerts');

describe('home hub card code quality', () => {
    it('منطق البطاقة مقسوم حسب المجال لا ملف واحد مختلط', () => {
        expect(existsSync(join(alerts, 'homeHubPanelModel.ts'))).toBe(true);
        expect(existsSync(join(alerts, 'homeHubRadarCounts.ts'))).toBe(true);
        expect(existsSync(join(alerts, 'homeHubEmptyState.ts'))).toBe(true);
        expect(existsSync(join(alerts, 'homeHubNavigateGuard.ts'))).toBe(true);
        expect(existsSync(join(alerts, 'homeHubAriaLabels.ts'))).toBe(true);
        expect(existsSync(join(alerts, 'homeHubRadarArm.ts'))).toBe(true);
        const barrel = readFileSync(join(alerts, 'homeHubCardLogic.ts'), 'utf8');
        expect(barrel).toContain("from './homeHubPanelModel'");
        expect(barrel).toContain("from './homeHubRadarCounts'");
        expect(barrel).toContain("from './homeHubEmptyState'");
        expect(barrel).toContain("from './homeHubNavigateGuard'");
        expect(barrel).toContain("from './homeHubAriaLabels'");
        expect(barrel).toContain("from './homeHubRadarArm'");
        expect(barrel).not.toMatch(/^export function /m);
        const radar = readFileSync(join(alerts, 'homeHubRadarCounts.ts'), 'utf8');
        expect(radar).toContain('filterHomeHubUrgentRadarEvents');
        expect(radar).not.toContain('openHomeHubCardInteraction');
        const empty = readFileSync(join(alerts, 'homeHubEmptyState.ts'), 'utf8');
        expect(empty).toContain('resolveHomeHubInitialPending');
        expect(empty).toContain('HOME_HUB_ALERTS_ERROR_COPY');
        expect(empty).not.toContain('parseWorkspaceRoute');
    });

    it('الخطافات ذات مسؤولية واحدة: كشف إقلاع /peek شارات / فيض أوراق', () => {
        expect(existsSync(join(hub, 'hooks/useHomeHubBootReveal.ts'))).toBe(true);
        expect(existsSync(join(hub, 'hooks/homeHubRadarBadgePeek.ts'))).toBe(true);
        expect(existsSync(join(hub, 'hooks/useHomeHubAlertsOverflowOverlays.ts'))).toBe(true);
        const badges = readFileSync(join(hub, 'hooks/useHomeHubBadgeSettling.ts'), 'utf8');
        expect(badges).toContain('useHomeHubBootReveal');
        expect(badges).toContain('peekHomeHubRadarUrgentForBadges');
        expect(badges).not.toContain('BOOT_REVEAL_DONE_EVENT');
        const gated = readFileSync(join(hub, 'hooks/useHomeHubRadarStateGated.ts'), 'utf8');
        expect(gated).not.toContain('peekHomeHubRadarCache');
        const panel = readFileSync(join(hub, 'hooks/useHomeHubPanelState.ts'), 'utf8');
        expect(panel).toContain('reconcileHomeHubPanelAfterCounts');
        const status = readFileSync(join(hub, 'hooks/useHomeHubCardStatus.ts'), 'utf8');
        expect(status).toContain('resolveHomeHubInitialPending');
        expect(status).toContain('resolveHomeHubShowInitialLoad');
        const orch = readFileSync(join(hub, 'hooks/useLawyerHomeHubCard.ts'), 'utf8');
        expect(orch).toContain('resolveHomeHubPinsAggregatorInput');
        expect(orch).not.toContain('buildHomeHubPinsAggregatorInput');
        const primary = readFileSync(join(hub, 'components/HomeHubAlertsPrimaryBody.tsx'), 'utf8');
        expect(primary).toContain('useHomeHubAlertsOverflowOverlays');
        expect(primary).toContain('prefetchHomeHubUrgentOverlay');
        const shell = readFileSync(join(hub, 'components/HomeHubMoreOverlayShell.tsx'), 'utf8');
        expect(shell).toContain('trapHomeHubOverlayTabKey');
        expect(shell).toContain('useMobileKeyboardInset(open)');
        expect(shell).toContain('data-hami-overlay-safe');
        expect(shell).not.toContain('function focusableInSheet');
    });

    it('افتراضية التثبيت باسم pins لا carousel ميت', () => {
        expect(existsSync(join(alerts, 'homeHubPinsVirtual.ts'))).toBe(true);
        expect(existsSync(join(alerts, 'homeHubCarouselVirtual.ts'))).toBe(false);
        const pinsPanel = readFileSync(join(hub, 'components/HomeHubPinsPanel.tsx'), 'utf8');
        expect(pinsPanel).toContain('homeHubPinsVirtual');
        expect(pinsPanel).not.toContain('homeHubCarouselVirtual');
    });
});
