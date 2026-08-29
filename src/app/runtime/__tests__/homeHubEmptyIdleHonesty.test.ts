import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('home hub empty idle honesty', () => {
    it('الفراغ المؤكَّد لا يجلب CalendarDB؛ المجهول والسكرتير يُسلَّحان', () => {
        const arm = src('src/app/services/alerts/homeHubRadarArm.ts');
        const live = src('src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubAlertsLive.ts');
        const gated = src(
            'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubRadarStateGated.ts',
        );
        expect(arm).toContain('radarCache === null');
        expect(arm).toContain('secretaryAlertCount > 0');
        expect(arm).toContain('deferForInFlightWarm');
        expect(arm).toContain('HOME_HUB_RADAR_WARM_WAIT_MS');
        expect(live).toContain('resolveHomeHubLiveRadarEnabled');
        expect(live).toContain('peekHomeHubRadarSnapshot');
        expect(live).toContain('isHomeHubRadarWarmInFlight');
        expect(live).toContain('subscribeHomeHubRadarWarm');
        expect(live).toContain('HOME_HUB_RADAR_WARM_WAIT_MS');
        expect(live).toContain('useHomeHubRadarStateGated(radarEnabled, lawyerId, secretaryAlerts)');
        expect(gated).not.toContain('peekHomeHubRadarSnapshot');
        expect(live).toContain('CALENDAR_UPDATED_EVENT');
        expect(live).toContain('invalidateHomeHubRadarCache');
        expect(gated).toContain('enabled ? lawyerId : null');
        expect(gated).not.toContain('peekHomeHubRadarCache');
        const warm = src('src/app/services/alerts/homeHubRadarWarmCache.ts');
        expect(warm).toContain('calendarFallbackBlockedFor');
        expect(warm).toContain('warmEpoch');
    });

    it('لوحة التنبيهات تبقى تبعية ثابتة — لا تغيير شكل الفراغ', () => {
        const body = src(
            'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPanelBody.tsx',
        );
        const empty = src('src/app/services/alerts/homeHubEmptyState.ts');
        expect(body).toContain("from './HomeHubAlertsPanel'");
        expect(body).not.toContain('LazyHomeHubAlertsPanel');
        expect(body).toContain('HOME_HUB_FULLY_EMPTY_COPY');
        expect(empty).toContain("HOME_HUB_FULLY_EMPTY_COPY = 'لا يوجد تنبيه أو تثبيت'");
    });

    it('تجميع التثبيت لا يمسك ملفات المساحة عند صفر دبابيس', () => {
        const pins = src(
            'src/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubPinsAggregatorInput.ts',
        );
        const orch = src(
            'src/app/components/lawyer/LawyerHomeHubCard/hooks/useLawyerHomeHubCard.ts',
        );
        expect(pins).toContain('EMPTY_HOME_HUB_PINS_AGGREGATOR_INPUT');
        expect(pins).toContain('countHomeHubDossierPins(pinnedItems) === 0');
        expect(orch).toContain('resolveHomeHubPinsAggregatorInput');
        expect(orch).not.toContain('buildHomeHubPinsAggregatorInput(');
    });

    it('التسخين تحت الغطاء لا يُنتظر؛ الثقيل على نية البلاطة لا الجلوس', () => {
        const chrome = src('src/app/bootstrap/homeBootChrome.ts');
        const gate = src('src/app/hooks/lawyerDashboard/dockShellPrefetchGate.ts');
        const model = src('src/app/components/lawyer/dashboard/useHomeTabContentModel.ts');
        const archive = src(
            'src/app/components/lawyer/dashboard/commandHub/commandHubArchivePrefetch.ts',
        );
        expect(chrome).toContain('kickHomeHubRadarWarm()');
        expect(chrome).not.toContain('await kickHomeHubRadarWarm');
        expect(chrome).toContain('warmHomeHubRadarCache');
        expect(gate).toContain('armHeavyDockWidgetsIdlePrefetch');
        expect(gate).not.toContain('HEAVY_DOCK_IDLE_DELAY_MS');
        expect(gate).toContain('queuedHeavyIdleStart');
        expect(model).toContain('scheduleHeavyDockWidgetsIdlePrefetch');
        expect(archive).toContain('armHeavyDockWidgetsIdlePrefetch');
    });
});
