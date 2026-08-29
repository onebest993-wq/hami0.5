import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const COMPONENTS = resolve(
    process.cwd(),
    'src/app/components/lawyer/LawyerHomeHubCard/components',
);

const OVERLAYS = [
    'HomeHubAlertsMoreOverlay.tsx',
    'HomeHubUrgentMoreOverlay.tsx',
    'HomeHubPinsMoreOverlay.tsx',
] as const;

describe('homeHub overlay split', () => {
    it('أوراق المزيد تستخدم صدفة واحدة بلا تكرار portal/backdrop', () => {
        for (const file of OVERLAYS) {
            const src = readFileSync(resolve(COMPONENTS, file), 'utf8');
            expect(src).toContain('HomeHubMoreOverlayShell');
            expect(src).not.toContain('createPortal');
            expect(src).not.toContain('hami-hub-radar-overlay__backdrop');
            expect(src).not.toContain('HomeHubOverlaySheetHandle');
        }
        const shell = readFileSync(resolve(COMPONENTS, 'HomeHubMoreOverlayShell.tsx'), 'utf8');
        expect(shell).toContain('createPortal');
        expect(shell).toContain('useHomeHubOverlaySheet');
        expect(shell).toContain('HomeHubOverlaySheetHandle');
        expect(shell).toContain('HUB_CONTENT_BUTTON_A11Y');
        expect(shell).toContain('tabIndex={-1}');
        expect(shell).toContain("closeRef.current?.focus");
        expect(shell).toContain('sheetId ?? panelTestId');
        expect(shell).toContain('`${testId}-close`');
        expect(shell).toMatch(/homeHubOverlayFx\.css/);
        expect(shell).not.toMatch(/homeHubAlertsFx\.css/);
        const pinsMore = readFileSync(resolve(COMPONENTS, 'HomeHubPinsMoreOverlay.tsx'), 'utf8');
        expect(pinsMore).not.toContain('fallback={null}');
        expect(pinsMore).toContain('HomeHubOverlayChunkFallback');
        expect(pinsMore).toContain('handleNavigate');
        const urgentMore = readFileSync(resolve(COMPONENTS, 'HomeHubUrgentMoreOverlay.tsx'), 'utf8');
        expect(urgentMore).toContain('handleOpenEntity');
        expect(urgentMore).toContain('onClose()');
        const alertsMore = readFileSync(resolve(COMPONENTS, 'HomeHubAlertsMoreOverlay.tsx'), 'utf8');
        expect(alertsMore).toContain('handleOpenEntity');
        expect(alertsMore).toContain('onClose()');
    });
});
