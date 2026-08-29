import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const hub = join(root, 'src/app/components/lawyer/LawyerHomeHubCard');

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('home hub card mobile close honesty', () => {
    it('الطبقة تقفل التمرير وsafe-area وإيماءة الحافة ورجوع native', () => {
        const sheet = readFileSync(join(hub, 'hooks/useHomeHubOverlaySheet.ts'), 'utf8');
        expect(sheet).toContain('useBodyScrollLock(open)');
        expect(sheet).toContain('pushHomeHubOverlayBack');
        const shell = readFileSync(join(hub, 'components/HomeHubMoreOverlayShell.tsx'), 'utf8');
        expect(shell).toContain('data-hami-overlay-safe="1"');
        expect(shell).toContain('useMobileKeyboardInset(open)');
        expect(shell).toContain('homeHubKeyboardFeedStyle');
        expect(shell).toContain('trapHomeHubOverlayTabKey');
        const stack = readFileSync(join(hub, 'homeHub/homeHubOverlayBackStack.ts'), 'utf8');
        expect(stack).toContain('registerNativeBackHandler');
        const edge = read('src/app/runtime/overlayEdgeBackGesture.ts');
        expect(edge).toContain('[data-hami-overlay-safe="1"]');
        const overlayCss = readFileSync(join(hub, 'homeHubOverlayFx.css'), 'utf8');
        expect(overlayCss).toContain('safe-area-inset-top');
        expect(overlayCss).toContain('safe-area-inset-bottom');
        expect(overlayCss).toContain('overscroll-behavior: none');
        expect(overlayCss).toContain('min(78dvh, 520px)');
        expect(overlayCss).toContain("html[data-hami-lite='1'] .hami-hub-radar-overlay__backdrop");
    });

    it('لمس 44px وإيماءة السحب مع تقليل الحركة', () => {
        const overlayCss = readFileSync(join(hub, 'homeHubOverlayFx.css'), 'utf8');
        expect(overlayCss).toMatch(/\.hami-hub-radar-overlay__handle[\s\S]*min-height:\s*44px/);
        expect(overlayCss).toMatch(/\.hami-hub-radar-overlay__close[\s\S]*min-height:\s*44px/);
        const handle = readFileSync(join(hub, 'components/HomeHubOverlaySheetHandle.tsx'), 'utf8');
        expect(handle).toContain('useSheetSwipeDismiss');
        expect(handle).toContain('useReduceMotion');
        expect(handle).toContain('enabled: enabled && !reduceMotion');
        const tabsCss = read('src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css');
        expect(tabsCss).toMatch(/\.hami-hub-tab[\s\S]*min-height:\s*44px/);
        expect(tabsCss).toContain('touch-action: manipulation');
        const alertsCss = readFileSync(join(hub, 'homeHubAlertsFx.css'), 'utf8');
        expect(alertsCss).toMatch(/\.hami-hub-horizon-tabs--compact button[\s\S]*min-height:\s*44px/);
        const horizon = read('src/app/components/lawyer/NeuralAlertsCard/HorizonFilterTabs.tsx');
        expect(horizon).not.toContain('min-h-[36px]');
        const empty = readFileSync(join(hub, 'homeHubCardFx.css'), 'utf8');
        expect(empty).toMatch(/\.hami-hub-empty--compact[\s\S]*min-height:\s*44px/);
        const pinRow = readFileSync(join(hub, 'components/HomeHubPinRow.tsx'), 'utf8');
        expect(pinRow).toContain('min-h-[44px]');
        const primary = readFileSync(join(hub, 'components/HomeHubAlertsPrimaryBody.tsx'), 'utf8');
        expect(primary).not.toContain('useMobileKeyboardInset');
    });

    it('لا polling — رادار يتوقف في الخلفية وقوائم افتراضية أخف على المعالج', () => {
        const radar = read('src/app/workspace/useCalendarRadar48h.ts');
        expect(radar).not.toMatch(/setInterval\(/);
        expect(radar).toContain('document.hidden');
        expect(radar).toContain('HAMI_APP_STATE_EVENT');
        expect(radar).toContain('visibilitychange');
        const gated = readFileSync(join(hub, 'hooks/useHomeHubRadarStateGated.ts'), 'utf8');
        expect(gated).toContain('enabled ? lawyerId : null');
        const virtual = readFileSync(join(hub, 'components/HomeHubPinsVirtualList.tsx'), 'utf8');
        expect(virtual).toContain('offsetHeight');
        expect(virtual).toContain('58dvh');
        expect(virtual).toContain('overscan: 3');
        const tabs = readFileSync(join(hub, 'components/HubPanelTabs.tsx'), 'utf8');
        expect(tabs).toContain('cancelAnimationFrame');
        const slot = read('src/app/components/lawyer/dashboard/HomeHubHomeSlot.tsx');
        expect(slot).toContain('shouldReduceHomeHubScrollMotion');
        const hubSrc = readFileSync(join(hub, 'hooks/useLawyerHomeHubCard.ts'), 'utf8');
        expect(hubSrc).not.toMatch(/setInterval\(/);
    });
});
